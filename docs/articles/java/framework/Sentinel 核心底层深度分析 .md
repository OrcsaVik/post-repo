
# Sentinel 微服务限流：底层原理与核心实现圣经

要真正理解 Sentinel，必须剥离其表面的 Dashboard 配置，深入其“三位一体”的内核：**插槽链 (SlotChain)**、**统计树 (Node Tree)** 以及 **滑动窗口 (LeapArray)**。本文将完整还原其资源锁定与限流的底层逻辑。


## 1. 引擎心脏：ProcessorSlotChain 插槽责任链

Sentinel 的所有保护逻辑（限流、降级、系统保护）都是通过一条 **责任链** 顺序执行的。每一个插槽（Slot）都有特定的职责。

### 插槽链的默认执行顺序

- **NodeSelectorSlot**：构建调用树，锁定资源在特定上下文（Context）下的节点。
- **ClusterBuilderSlot**：构建集群全局节点，用于汇总不同来源的统计数据。
- **LogSlot**：记录资源调用的审计日志。
- **StatisticSlot**：核心统计位，负责 QPS、线程数、RT 的滑动窗口更新。
- **AuthoritySlot / SystemSlot**：黑白名单判定与系统负载自适应保护。
- **FlowSlot / DegradeSlot**：流量控制检查与断路器检查，这是抛出 `BlockException` 的主要触发点。

> **底层锁定机制**：这种链式调用通过 `fireEntry` 机制实现。如果任何一个 Slot 判定失败抛出 `BlockException`，后续 Slot 和业务逻辑将直接被 JVM 异常流阻断，实现对资源的“准入锁定”。


## 2. 准入锁定：Entry 与 Context的栈模型

Sentinel 的资源锁定并非重量级的分布式锁，而是基于 **ThreadLocal 调用栈** 的逻辑凭证。

### 核心调用流追踪



```Java
SphU.entry("resourceName") 
  → CtSph.entryWithPriority()
    → ContextUtil.getContext() // 获取/创建当前线程的 Context
    → lookProcessChain(resourceWrapper) // 检索或通过 SPI 构建该资源的 SlotChain
    → chain.entry() // 开始插槽链递归
```

- **Context (调用上下文)**：保存了链路的根节点 `EntranceNode` 和当前活跃的 `Entry`。
- **Entry (调用凭证)**：`CtEntry` 内部维护了 `parent` 和 `child` 指针。
  - 在一个嵌套调用（A -> B -> C）中，这些 Entry 形成了一个 **隐式调用栈**。
  - `exit()` 时，必须按照出栈顺序逐一释放，并同步更新统计节点的 `curThreadNum`。

------

## 3. 统计画像：多维度 Node 节点树

Sentinel 在内存中维护了一套复杂的树状结构，用于锁定不同粒度的统计指标。

| **节点名称**     | **核心定义**                 | **锁定维度**                                         |
| ---------------- | ---------------------------- | ---------------------------------------------------- |
| **DefaultNode**  | `map.get(context.getName())` | **Context 级别**。区分同一资源从不同入口进入的压力。 |
| **ClusterNode**  | `getOrCreate(resourceName)`  | **全局级别**。锁定该资源在当前 JVM 实例内的总负载。  |
| **EntranceNode** | `ContextUtil.enter()`        | **链路入口**。代表调用链的起点。                     |

------

## 4. 统计引擎：LeapArray 滑动窗口算法

Sentinel 如何在纳秒级延迟内计算出准确的 QPS？答案是 **LeapArray**。

### 滑动窗口底层实现

Sentinel 将时间划分为一个个样本窗口（Bucket）。

- **WindowWrap**：窗口包装器，持有 `MetricBucket`。
- **MetricBucket**：利用 `LongAdder`（避免原子类在高并发下的竞争）记录 `PASS`、`BLOCK`、`EXCEPTION` 和 `RT`。
- **CAS 窗口更替**：当时间进入下一个周期，Sentinel 不会销毁对象，而是通过 **CAS 操作** 原子性地重置并覆盖旧的窗口数据，实现零 GC 压力的内存循环利用。

------

## 5. SPI 扩展：动态加载机制

Sentinel 允许通过 SPI (Service Provider Interface) 动态插拔 Slot。

### 自定义 SpiLoader 实现

Sentinel 并没有直接使用 JDK 的 `ServiceLoader`，而是实现了一套支持 **单例缓存 (DCL)** 的 `SpiLoader`。



```Java
private S createInstance(Class<? extends S> clazz, boolean singleton) {
    if (singleton) {
        instance = singletonMap.get(clazz.getName());
        if (instance == null) {
            synchronized (this) {
                if (instance == null) {
                    instance = service.cast(clazz.newInstance());
                    singletonMap.put(clazz.getName(), instance);
                }
            }
        }
    }
    return instance;
}
```

------

## 6. 核心哲学：信号量隔离 (Sentinel) vs 线程池隔离 (Hystrix)

Sentinel 坚守 **信号量 (Semaphore)** 隔离策略，直接复用容器线程池。

- **并发控制**：在 `StatisticSlot` 中执行 `node.increaseThreadNum()`。
- **决策逻辑**：`DefaultController` 仅仅比较当前 `curThreadNum` 与阈值，不涉及线程上下文切换。
- **优势**：极度轻量，单机 QPS 支撑能力比线程池隔离高出一个数量级。

------

## 7. 生产实操：URL 清理与流量精细化

为避免 RESTful 接口（如 `/user/1`, `/user/2`）导致资源节点爆炸（OOM），必须配置 `UrlCleaner`。

### URL 归一化示例



```Java
WebCallbackManager.setUrlCleaner(url -> {
    // 将动态 ID 转换为占位符，锁定为同一资源
    if (url.startsWith("/user/")) {
        return "/user/:id";
    }
    return url;
});
```

### HTTP 方法区分

开启 `HTTP_METHOD_SPECIFY` 后，资源名称会变为 `GET:/api/data`，实现对读写操作的差异化限流。

------

##### Link

https://sentinelguard.io/zh-cn/docs/basic-implementation.html

[3W字吃透：微服务 sentinel 限流 底层原理和实操_sentinel学习圣经-CSDN博客](https://blog.csdn.net/crazymakercircle/article/details/130556777)

https://blog.csdn.net/crazymakercircle/article/details/130556777

