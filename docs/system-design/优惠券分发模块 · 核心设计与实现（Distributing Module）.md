---
title: 优惠券分发模块 · 核心设计与实现（Distributing Module）
---

# 优惠券分发模块 · 核心设计与实现

## 一、核心依赖（POM）

```xml
<!-- RocketMQ 集成 -->
<dependency>
    <groupId>org.apache.rocketmq</groupId>
    <artifactId>rocketmq-spring-boot-starter</artifactId>
</dependency>

<!-- Nacos 服务注册与发现 -->
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
</dependency>

<!-- OpenFeign + OkHttp 客户端 -->
<dependency>
    <groupId>io.github.openfeign</groupId>
    <artifactId>feign-okhttp</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-openfeign</artifactId>
</dependency>

<!-- Spring Cloud LoadBalancer（替换 Ribbon） -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-loadbalancer</artifactId>
</dependency>
```

## 二、消息体设计

### 2.1 优惠券分发事件（核心事件）

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CouponTemplateDistributionEvent {

    private Long couponTaskId;              // 任务ID
    private Long couponTaskBatchId;         // 批次ID
    private String notifyType;              // 通知方式（可组合：0站内信,1弹窗,2邮件,3短信）
    private Long shopNumber;                // 店铺编号
    private Long couponTemplateId;          // 模板ID
    private Date validEndTime;              // 有效期结束时间
    private String couponTemplateConsumeRule; // 消耗规则JSON
    private String userId;                  // 用户ID（单条时使用）
    private String phone;                   // 手机号
    private String mail;                    // 邮箱
    private Integer batchUserSetSize;       // 当前批次Redis Set大小（默认满5000触发落库）
    private Boolean distributionEndFlag;    // 是否为Excel解析完成标识
}
```

### 2.2 统一消息包装器（带业务Key）

```java
@Data
@Builder
@NoArgsConstructor(force = true)
@AllArgsConstructor
@RequiredArgsConstructor
public final class MessageWrapper<T> implements Serializable {
    private static final long serialVersionUID = 1L;

    @NonNull
    private String keys;        // 业务唯一标识（防重、顺序消费）

    private T data;             // 实际业务数据
}
```

## 三、RocketMQ Topic & Group 定义

```java
public final class DistributionRocketMQConstant {

    // 扫描Excel → 触发分发任务
    public static final String TEMPLATE_TASK_EXECUTE_TOPIC_KEY = "one-coupon_distribution-service_coupon-task-execute_topic${unique-name:}";
    public static final String TEMPLATE_TASK_EXECUTE_CG_KEY   = "one-coupon_distribution-service_coupon-task-execute_cg${unique-name:}";

    // 执行实际分发（扣库存 + 发券）
    public static final String TEMPLATE_EXECUTE_DISTRIBUTION_TOPIC_KEY = "one-coupon_distribution-service_coupon-execute-distribution_topic${unique-name:}";
    public static final String TEMPLATE_EXECUTE_DISTRIBUTION_CG_KEY   = "one-coupon_distribution-service_coupon-execute-distribution_cg${unique-name:}";

    // 发送通知（站内信/短信/邮件等）
    public static final String TEMPLATE_EXECUTE_SEND_MESSAGE_CG_KEY = "one-coupon_distribution-service_coupon-execute-send-message_cg${unique-name:}";
}
```

## 四、库存扣减 + 多结果返回原子性（Lua + 位运算打包）

```java
public class StockDecrementReturnCombinedUtil {

    private static final int SECOND_FIELD_BITS = 13; // 2^13 = 8192 > 5000

    // 打包：高位存是否成功(1bit)，低位存用户数量(13bit)
    public static int combineFields(boolean success, int userCount) {
        return (success ? 1 : 0) << SECOND_FIELD_BITS | userCount;
    }

    public static boolean extractSuccess(long combined) {
        return (combined >> SECOND_FIELD_BITS) != 0;
    }

    public static int extractUserCount(int combined) {
        return combined & ((1 << SECOND_FIELD_BITS) - 1);
    }
}
```

**Lua 脚本示例**（原子扣减 + 返回打包结果）

```lua
-- KEYS[1]: 模板库存key
-- KEYS[2]: 用户已领Set key
-- ARGV[1]: userId:rowNum
local stockKey = KEYS[1]
local userSetKey = KEYS[2]
local userData = ARGV[1]

-- 库存扣减
local currentStock = redis.call('HINCRBY', stockKey, 'stock', -1)
if currentStock < 0 then
    redis.call('HINCRBY', stockKey, 'stock', 1) -- 回滚
    return StockDecrementReturnCombinedUtil.combineFields(false, 0)
end

-- 记录用户领取（Set防重）
local added = redis.call('SADD', userSetKey, userData)
if added == 0 then
    redis.call('HINCRBY', stockKey, 'stock', 1) -- 已领，回滚
    return StockDecrementReturnCombinedUtil.combineFields(false, redis.call('SCARD', userSetKey))
end

return StockDecrementReturnCombinedUtil.combineFields(true, redis.call('SCARD', userSetKey))
```

## 五、Excel 解析与分发流程

### 5.1 EasyExcel 解析监听器

```java
@Override
public void doAfterAllAnalysed(AnalysisContext context) {
    // 无论是否满5000，解析完成都要发送结束标识
    CouponTemplateDistributionEvent event = CouponTemplateDistributionEvent.builder()
            .distributionEndFlag(Boolean.TRUE)
            .shopNumber(couponTaskDO.getShopNumber())
            .couponTemplateId(couponTemplateDO.getId())
            .validEndTime(couponTemplateDO.getValidEndTime())
            .couponTemplateConsumeRule(couponTemplateDO.getConsumeRule())
            .couponTaskBatchId(couponTaskDO.getBatchId())
            .couponTaskId(couponTaskDO.getId())
            .build();
    couponExecuteDistributionProducer.sendMessage(event);
}
```

### 5.2 防重复解析（Redis 进度记录）

```java
String progressKey = String.format(DistributionRedisConstant.TEMPLATE_TASK_EXECUTE_PROGRESS_KEY, couponTaskId);
String progress = stringRedisTemplate.opsForValue().get(progressKey);
if (StrUtil.isNotBlank(progress) && Integer.parseInt(progress) >= rowCount) {
    ++rowCount; // 跳过已处理行
    return;
}
```

## 六、失败记录处理（分页写入 Excel）

```java
long initId = 0;
boolean isFirstIteration = true;
String failFileAddress = excelPath + "/用户分发记录失败Excel-" + event.getCouponTaskBatchId() + ".xlsx";

try (ExcelWriter excelWriter = EasyExcel.write(failFileAddress, UserCouponTaskFailExcelObject.class).build()) {
    WriteSheet sheet = EasyExcel.writerSheet("失败记录").build();

    while (true) {
        List<CouponTaskFailDO> fails = listUserCouponTaskFail(event.getCouponTaskBatchId(), initId);
        if (CollUtil.isEmpty(fails)) {
            if (isFirstIteration) failFileAddress = null;
            break;
        }

        isFirstIteration = false;

        List<UserCouponTaskFailExcelObject> excelRows = fails.stream()
                .map(f -> JSON.parseObject(f.getJsonObject(), UserCouponTaskFailExcelObject.class))
                .toList();

        excelWriter.write(excelRows, sheet);

        if (fails.size() < BATCH_USER_COUPON_SIZE) break;

        initId = fails.stream().mapToLong(CouponTaskFailDO::getId).max().orElse(initId);
    }
}

// 任务完成标记
couponTaskMapper.updateById(CouponTaskDO.builder()
        .id(event.getCouponTaskId())
        .status(CouponTaskStatusEnum.SUCCESS.getStatus())
        .failFileAddress(failFileAddress)
        .completionTime(new Date())
        .build());
```

## 七、批量保存 + 失败回滚

```java
private void batchSaveUserCouponList(Long templateId, Long batchId, List<UserCouponDO> list) {
    try {
        userCouponMapper.insert(list, list.size()); // 批量插入
    } catch (Exception ex) {
        // 部分失败则逐条重试 + 记录失败原因
        List<CouponTaskFailDO> failList = new ArrayList<>();
        List<UserCouponDO> toRemove = new ArrayList<>();

        list.forEach(item -> {
            try {
                userCouponMapper.insert(item);
            } catch (Exception e) {
                if (couponExecuteDistributionConsumer.hasUserReceivedCoupon(templateId, item.getUserId())) {
                    Map<String, Object> reason = MapUtil.builder()
                            .put("rowNum", item.getRowNum())
                            .put("cause", "用户已领取该优惠券")
                            .build();
                    failList.add(CouponTaskFailDO.builder()
                            .batchId(batchId)
                            .jsonObject(JSON.toJSONString(reason))
                            .build());
                    toRemove.add(item);
                }
            }
        });

        couponTaskFailMapper.insert(failList, failList.size());
        list.removeAll(toRemove);
    }
}
```

## 八、库存回滚机制

```java
int originalSize = batchUserMaps.size();
int successSize = userCouponDOList.size();
int rollbackCount = originalSize - successSize;

if (rollbackCount > 0) {
    // Redis 回滚
    stringRedisTemplate.opsForHash().increment(
            String.format(EngineRedisConstant.COUPON_TEMPLATE_KEY, templateId),
            "stock", rollbackCount);

    // DB 回滚
    couponTemplateMapper.incrementCouponTemplateStock(shopNumber, templateId, rollbackCount);
}
```

## 九、总结设计核心

- **高吞吐**：Excel 批量解析 → Redis Set 聚合 → 满 5000 触发批量写
- **原子性**：Lua 脚本 + 位运算打包多结果
- **容错**：失败记录全量落 Excel（本地/MinIO），支持人工重试
- **幂等**：Redis 进度 + 用户已领 Set 双重防重
- **最终一致**：分发完成 → 更新任务状态 + 生成失败文件地址

该模块实现了大批量用户优惠券分发的**高性能、高可靠、可追溯**能力。
```
