---
title: one-coupon-template 模块 · 核心设计与实现
---

# one-coupon-template 模块 · 核心设计与实现

## 一、核心依赖与技术栈

- **分库分表**：ShardingSphere-JDBC（精准分片 + 自定义算法）
- **缓存**：Redis（ZSET + Hash + BloomFilter）
- **消息队列**：RocketMQ（延时消息 + 顺序消息）
- **数据库**：MySQL（多库多表 + 动态路由）
- **工具**：Lombok、FastJSON2、Hutool、Redisson

## 二、分库分表核心算法（CouponTemplateShardingAlgorithm）

```java
public class CouponTemplateShardingAlgorithm implements PreciseShardingAlgorithm<Long> {

    private static final int SHARDING_COUNT = 8; // 总分片数（可配置）

    @Override
    public String doSharding(Collection<String> availableTargetNames, PreciseShardingValue<Long> shardingValue) {
        long id = shardingValue.getValue();
        int dbSize = availableTargetNames.size();
        // 哈希取模 → 分片索引
        int mod = (int) (hashShardingValue(id) % SHARDING_COUNT / (SHARDING_COUNT / dbSize));
        int index = 0;
        for (String targetName : availableTargetNames) {
            if (index == mod) {
                return targetName; // 返回目标库名（如 db0、db1）
            }
            index++;
        }
        throw new IllegalArgumentException("No target found for value: " + id);
    }

    private long hashShardingValue(long value) {
        // 简单哈希（可替换为 MurmurHash3、FNV 等）
        return value ^ (value >>> 32);
    }
}
```

**业务价值**  
- 解决 **IN 查询跨库** 问题（shopNumber + templateId 双维度路由）  
- 固定总分片数（SHARDING_COUNT=8），动态分配到可用库  
- 防止热点：哈希均匀分布

**使用方式**

```java
public static int doCouponSharding(Long shopNumber) {
    return COUPON_TEMPLATE_DB_SHARDING_ALGORITHM.getShardingMod(
        shopNumber, 
        getAvailableDatabases().size()
    );
}
```

## 三、高并发查询优化（缓存 + 防穿透/击穿）

### 3.1 批量查询 + Map 映射

```java
private List<CouponTemplateDO> queryDatabase(List<Long> templateIds, List<Long> shopNumbers) {
    return couponTemplateMapper.selectList(Wrappers.lambdaQuery(CouponTemplateDO.class)
        .in(CouponTemplateDO::getShopNumber, shopNumbers)
        .in(CouponTemplateDO::getId, templateIds));
}

// 结果转 Map（key: shopNumber:templateId）
Map<String, CouponTemplateDO> templateMap = list.stream()
    .collect(Collectors.toMap(
        t -> t.getShopNumber() + ":" + t.getId(),
        t -> t,
        (old, neu) -> old
    ));
```

### 3.2 缓存回写（防空 + 穿透）

```java
Map<String, Object> actualCacheMap = cacheTargetMap.entrySet().stream()
    .collect(Collectors.toMap(
        Map.Entry::getKey,
        e -> e.getValue() != null ? e.getValue().toString() : ""
    ));

// 空值缓存（防穿透）
if (actualCacheMap.isEmpty()) {
    redisTemplate.opsForValue().set(cacheKey, "{}", 60, TimeUnit.SECONDS);
}
```

## 四、消息发送抽象模板（AbstractCommonSendProduceTemplate）

```java
@RequiredArgsConstructor
public abstract class AbstractCommonSendProduceTemplate<T> {

    protected final RocketMQTemplate rocketMQTemplate;

    // 1. 构建扩展参数（topic、keys、delayTime 等）
    protected abstract BaseSendExtendDTO buildBaseSendExtendParam(T event);

    // 2. 构建 RocketMQ 消息体
    protected abstract Message<?> buildMessage(T event, BaseSendExtendDTO extend);

    public SendResult send(T event) {
        BaseSendExtendDTO extend = buildBaseSendExtendParam(event);
        String destination = extend.getTopic();

        // 支持延时消息
        if (extend.getDelayTime() != null) {
            return rocketMQTemplate.syncSendDeliverTimeMills(
                destination,
                buildMessage(event, extend),
                extend.getDelayTime()
            );
        }

        // 普通同步发送
        return rocketMQTemplate.syncSend(
            destination,
            buildMessage(event, extend),
            extend.getSentTimeout()
        );
    }
}
```

**典型实现**（用户优惠券延时关闭）

```java
@Override
protected BaseSendExtendDTO buildBaseSendExtendParam(UserCouponDelayCloseEvent event) {
    return BaseSendExtendDTO.builder()
        .eventName("延迟关闭用户已领取优惠券")
        .keys(String.valueOf(event.getUserCouponId()))
        .topic(environment.resolvePlaceholders(EngineRockerMQConstant.USER_COUPON_DELAY_CLOSE_TOPIC_KEY))
        .sentTimeout(2000L)
        .delayTime(event.getDelayTime())
        .build();
}
```

## 五、兑换/领取限流 + 幂等（Lua + 位运算）

**Lua 领取核心脚本**（原子性检查 + 计数 + 库存）

```lua
-- 返回值打包：高位状态(0成功/1库存不足/2达上限)，低位当前领取次数
local function combineFields(status, count)
    local SECOND_FIELD_BITS = 14
    return status * (2 ^ SECOND_FIELD_BITS) + count
end

local stock = tonumber(redis.call('HGET', KEYS[1], 'stock'))
if stock <= 0 then return combineFields(1, 0) end

local userCount = tonumber(redis.call('GET', KEYS[2])) or 0
if userCount >= tonumber(ARGV[2]) then return combineFields(2, userCount) end

-- 第一次设置过期时间
if userCount == 0 then
    redis.call('SET', KEYS[2], 1, 'EX', ARGV[1])
else
    redis.call('INCR', KEYS[2])
end

redis.call('HINCRBY', KEYS[1], 'stock', -1)
return combineFields(0, userCount + 1)
```

**业务状态枚举**

```java
public enum RedeemStatusEnum {
    SUCCESS(0, "成功"),
    STOCK_INSUFFICIENT(1, "优惠券已被领取完啦"),
    LIMIT_REACHED(2, "用户已经达到领取上限");
}
```

## 六、预约提醒位图设计（CouponTemplateRemindDO）

```java
@TableName("t_coupon_template_remind")
@Data
public class CouponTemplateRemindDO {
    private Long userId;
    private Long couponTemplateId;
    private Long information;      // 位图存储预约信息
    private Long shopNumber;
    private Date startTime;        // 开抢时间
}
```

**位图计算与填充**

```java
public static void fillRemindInformation(CouponTemplateRemindQueryRespDTO resp, Long information) {
    List<Date> dates = new ArrayList<>();
    List<String> types = new ArrayList<>();
    Date validStart = resp.getValidStartTime();

    for (int i = NEXT_TYPE_BITS - 1; i >= 0; i--) {
        for (int j = 0; j < TYPE_COUNT; j++) {
            if (((information >> (j * NEXT_TYPE_BITS + i)) & 1) == 1) {
                Date remindTime = DateUtil.offsetMinute(validStart, -((i + 1) * TIME_INTERVAL));
                dates.add(remindTime);
                types.add(CouponRemindTypeEnum.getDescribeByType(j));
            }
        }
    }
    resp.setRemindTime(dates);
    resp.setRemindType(types);
}
```

**防重布隆过滤器**（取消预约）

```java
cancelRemindBloomFilter.add(
    String.valueOf(Objects.hash(templateId, userId, remindTime, type))
);
```

## 七、总结核心能力

- **分库分表**：自定义哈希算法 + 精准路由  
- **高并发领取**：Lua 原子 + 位运算打包多状态  
- **预约提醒**：位图存储 + 动态时间节点计算  
- **消息发送**：抽象模板 + 延时/普通统一处理  
- **幂等防重**：SpEL + Redis + 布隆过滤器多重保障  
- **缓存一致**：写后查询 + ZSET 顺序 + 异常兜底重试

该模块实现了**高并发、强一致、可追溯**的优惠券模板管理能力。
```