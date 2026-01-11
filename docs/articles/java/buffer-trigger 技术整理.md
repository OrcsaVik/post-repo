---

title: buffer-trigger 技术整理
---



# buffer-trigger 技术整理

**项目定位**  
buffer-trigger 是一个**内存缓冲 + 条件触发批量消费**的通用框架。  
核心目标：减少高频 IO、数据库写入、MQ 投递次数，提升系统吞吐量与稳定性。

**核心思想**（三句话概括）  
1. 先写内存（快速响应）  
2. 按条件成批消费（批量优化）  
3. 消费策略可切换（场景适配）

## 一、顶层开放接口（BufferTrigger）

```java
public interface BufferTrigger<E> extends AutoCloseable {
    // 生产：写入缓冲区
    void enqueue(E element);
    
    // 手动强制触发一次消费
    void manuallyDoTrigger();
    
    // 当前待消费数据量
    long getPendingChanges();
    
    // 关闭并清空剩余数据
    void close();

    // 构建器入口 - 轻量非阻塞路线
    static <E, C> GenericSimpleBufferTriggerBuilder<E, C> simple() {
        return new GenericSimpleBufferTriggerBuilder(SimpleBufferTrigger.newBuilder());
    }

    // 构建器入口 - 生产级阻塞路线
    static <E> GenericBatchConsumerTriggerBuilder<E> batchBlocking() {
        return new GenericBatchConsumerTriggerBuilder(BatchConsumeBlockingQueueTrigger.newBuilder());
    }
}
```

## 二、两条核心实现路径对比

| 特性         | simple                   | batchBlocking（生产推荐）       |
| ------------ | ------------------------ | ------------------------------- |
| 消费方式     | 非阻塞                   | 阻塞式消费                      |
| 并发消费     | 允许并发多次消费         | 严格单消费者（顺序保证）        |
| 流量控制     | 无                       | 有（队列满则生产者阻塞）        |
| 顺序性保证   | 不保证                   | 强顺序保证                      |
| 适用场景     | 轻量、低并发、顺序不敏感 | 高并发、大数据量、顺序/限流敏感 |
| 底层数据结构 | 自定义实现               | LinkedBlockingQueue             |
| 生产者行为   | 非阻塞                   | 队列满时阻塞                    |
| 默认推荐     | 仅作工具                 | 生产级首选                      |

**结论**  
- **batchBlocking 是武器**，适用于绝大多数线上场景  
- **simple 是工具**，仅在明确轻量需求时使用

## 三、batchBlocking 核心实现要点

### 3.1 构造与调度

```java
// 使用有界阻塞队列
this.queue = new LinkedBlockingQueue<>(Math.max(bufferSize, batchSize));

// 单线程调度器（默认内部创建）
this.scheduledExecutorService = builder.scheduledExecutorService != null 
    ? builder.scheduledExecutorService 
    : Executors.newScheduledThreadPool(1, daemonThreadFactory);

// 动态延迟定时任务
MoreFutures.scheduleWithDynamicDelay(
    scheduledExecutorService,
    linger,
    () -> doBatchConsumer(TRIGGER_TYPE.LINGER)
);
```

### 3.2 触发条件（任一满足即消费）

1. 队列元素数量 ≥ batchSize  
2. 自上次消费后等待时间 ≥ linger  
3. 调用 manuallyDoTrigger()

### 3.3 阻塞机制来源

- ReentrantLock + 两个 Condition  
- notFull：队列满时生产者 await  
- notEmpty：队列空时消费者 await

### 3.4 消费执行与异常处理

```java
consumer.accept(batchData);  // 批量消费回调

// 异常处理链路
if (exceptionHandler != null) {
    exceptionHandler.handle(e, batchData);
} else {
    // 默认仅记录日志，不抛出
    log.error("Batch consume failed", e);
}
```

### 3.5 关闭语义（完整可靠）

- 取消所有定时任务  
- 强制 flush 剩余所有数据（最后一波消费）  
- 如果内部创建线程池，则进行 shutdown

### 3.6 关键工具方法

- `Uninterruptibles.putUninterruptibly`：忽略中断，直到成功入队（关键数据路径必用）  
- `MoreFutures.scheduleWithDynamicDelay`：支持动态延迟的定时调度

## 四、总结一句话

**buffer-trigger = 内存缓冲 + 多维度批量触发 + 可切换的消费策略**  
**simple 适合实验和轻量场景，batchBlocking 才是线上真正能扛事的核心武器。**