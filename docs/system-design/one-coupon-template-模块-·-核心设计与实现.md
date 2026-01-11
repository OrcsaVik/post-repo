---
title: one-coupon-template 模块 · 核心设计与实现
date: 2026-01-11
---

# one-coupon-template 模块 · 核心设计与实现

## 一、模块定位与核心目标

one-coupon-template 模块负责优惠券模板的全生命周期管理，包括创建、编辑、分发规则配置、库存控制、领取/兑换限流、预约提醒等功能。  
核心设计原则：  
- 高并发读写分离（Redis + Lua 原子操作）  
- 跨库分片友好（ShardingSphere 自定义路由）  
- 最终一致性保障（MQ + 延迟双删 + 写后读）  
- 可追溯性（失败记录 + Excel 回滚）  
- 幂等防重（SpEL + Redis + 布隆过滤器）

## 二、依赖与技术选型

| 类别     | 技术栈                              | 作用                         |
| -------- | ----------------------------------- | ---------------------------- |
| 分库分表 | ShardingSphere-JDBC                 | 精准路由 + 自定义分片算法    |
| 缓存     | Redis (ZSET + Hash + Lua + Bloom)   | 高并发领取、预约位图、防穿透 |
| 消息队列 | RocketMQ (延时/顺序消息)            | 异步通知、延时关闭、提醒投递 |
| 数据库   | MySQL (多库多表)                    | 持久化模板、结算、预约记录   |
| 工具类   | Hutool、FastJSON2、Redisson、Lombok | 集合操作、JSON、分布式锁     |
| 幂等     | SpEL + Redis + 自定义注解           | MQ 消费防重                  |

## 三、分库分表核心算法

```java
public class CouponTemplateShardingAlgorithm implements PreciseShardingAlgorithm<Long> {
    private static final int SHARDING_COUNT = 8; // 总分片数

    @Override
    public String doSharding(Collection<String> availableTargetNames, PreciseShardingValue<Long> shardingValue) {
        long id = shardingValue.getValue();
        int dbSize = availableTargetNames.size();
        int mod = (int) (hashShardingValue(id) % SHARDING_COUNT / (SHARDING_COUNT / dbSize));
        int index = 0;
        for (String targetName : availableTargetNames) {
            if (index == mod) {
                return targetName;
            }
            index++;
        }
        throw new IllegalArgumentException("No target found for value: " + id);
    }

    private long hashShardingValue(long value) {
        return value ^ (value >>> 32); // 简单哈希，可替换为 MurmurHash3
    }
}
```

**使用示例**（双维度路由）

```java
public static int doCouponSharding(Long shopNumber) {
    return COUPON_TEMPLATE_DB_SHARDING_ALGORITHM.getShardingMod(
        shopNumber, 
        getAvailableDatabases().size()
    );
}
```

**设计价值**  
- 固定总分片数，动态适配可用库数量  
- 哈希均匀分布，避免热点  
- 支持 shopNumber + templateId 联合查询

## 四、高并发领取/兑换限流（Lua + 位运算打包）

**Lua 核心脚本**（原子性检查 + 多状态返回）

```lua
-- 返回值：高位状态(0成功/1库存不足/2达上限)，低位当前领取次数
local function combineFields(status, count)
    local SECOND_FIELD_BITS = 14
    return status * (2 ^ SECOND_FIELD_BITS) + count
end

local stock = tonumber(redis.call('HGET', KEYS[1], 'stock'))
if stock <= 0 then return combineFields(1, 0) end

local userCount = tonumber(redis.call('GET', KEYS[2])) or 0
if userCount >= tonumber(ARGV[2]) then return combineFields(2, userCount) end

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

## 五、预约提醒位图设计

```java
@TableName("t_coupon_template_remind")
@Data
public class CouponTemplateRemindDO {
    private Long userId;
    private Long couponTemplateId;
    private Long information;      // 位图：预约时间节点 + 类型
    private Long shopNumber;
    private Date startTime;        // 开抢时间
}
```

**位图填充逻辑**

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

**取消预约防重**（布隆过滤器）

```java
cancelRemindBloomFilter.add(
    String.valueOf(Objects.hash(templateId, userId, remindTime, type))
);
```

## 六、消息发送抽象模板

```java
@RequiredArgsConstructor
public abstract class AbstractCommonSendProduceTemplate<T> {
    protected final RocketMQTemplate rocketMQTemplate;

    protected abstract BaseSendExtendDTO buildBaseSendExtendParam(T event);
    protected abstract Message<?> buildMessage(T event, BaseSendExtendDTO extend);

    public SendResult send(T event) {
        BaseSendExtendDTO extend = buildBaseSendExtendParam(event);
        String destination = extend.getTopic();

        if (extend.getDelayTime() != null) {
            return rocketMQTemplate.syncSendDeliverTimeMills(
                destination, buildMessage(event, extend), extend.getDelayTime());
        }
        return rocketMQTemplate.syncSend(
            destination, buildMessage(event, extend), extend.getSentTimeout());
    }
}
```

## 七、总结核心能力对比

| 能力          | 实现方式                     | 优势                    |
| ------------- | ---------------------------- | ----------------------- |
| 领取/兑换限流 | Lua + 位运算打包             | 原子性 + 多状态返回     |
| 预约提醒      | 位图存储 + 动态时间节点计算  | 极致内存效率 + 快速填充 |
| 高并发查询    | Redis ZSET + 写后读 + 空缓存 | 防穿透/击穿 + 顺序遍历  |
| 分发/通知异步 | RocketMQ 延时/顺序消息       | 最终一致性 + 削峰       |
| 幂等防重      | SpEL + Redis + 布隆          | 多重保障 + 低误判       |

**一句话总结**  
one-coupon-template 模块通过 **Lua 原子操作 + 位图 + 自定义分片 + MQ 异步**，实现了高并发领取、精准预约、可靠分发、强一致性与可追溯性的完整闭环，是典型的高性能优惠券中台设计范式。
```