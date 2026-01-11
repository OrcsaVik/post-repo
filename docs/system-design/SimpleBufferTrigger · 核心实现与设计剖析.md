---
title: SimpleBufferTrigger · 核心实现与设计剖析
---

# SimpleBufferTrigger · 核心实现与设计剖析

## 一、核心设计思想

SimpleBufferTrigger 是一个**轻量级、非阻塞、内存缓冲 + 条件触发批量消费**的组件。  
核心目标：  
- 高并发场景下将零散写入聚合成批量操作  
- 减少下游 IO/数据库/MQ 的压力  
- 提供灵活的触发策略（数量、时间、多间隔）  
- 保证线程安全与异常友好

**与 batchBlocking 的本质区别**  
- Simple：**非阻塞、允许多线程并发消费、无流量控制**  
- batchBlocking：**阻塞、严格顺序、带限流**（生产首选）

## 二、入队核心流程（enqueue）

```java
public void enqueue(E element) {
    Preconditions.checkState(!this.shutdown, "buffer trigger was shutdown.");

    // 1. 容量检查（可选）
    long currentCount = this.counter.get();
    long maxCount = this.maxBufferCount.getAsLong();
    if (maxCount > 0 && currentCount >= maxCount) {
        boolean pass = true;
        if (this.rejectHandler != null) {
            if (this.writeLock != null) this.writeLock.lock();
            try {
                currentCount = this.counter.get();
                maxCount = this.maxBufferCount.getAsLong();
                if (maxCount > 0 && currentCount >= maxCount) {
                    pass = this.fireRejectHandler(element);
                }
            } finally {
                if (this.writeLock != null) this.writeLock.unlock();
            }
        }
        if (!pass) return; // 被拒绝处理器拒绝，不入队
    }

    // 2. 加读锁保护（防止并发修改缓冲区）
    boolean locked = false;
    if (this.readLock != null) {
        this.readLock.lock();
        locked = true;
    }

    try {
        // 3. 获取当前缓冲区 & 添加元素
        C buffer = this.buffer.get();
        int changed = this.queueAdder.applyAsInt(buffer, element);

        // 4. 更新计数器（原子递增）
        if (changed > 0) {
            this.counter.addAndGet(changed);
        }
    } finally {
        if (locked) this.readLock.unlock();
    }
}
```

**关键点解析**

| 步骤       | 目的                                 | 线程安全机制           |
| ---------- | ------------------------------------ | ---------------------- |
| 容量检查   | 防止内存无限增长                     | 写锁 + 原子计数器      |
| 拒绝处理器 | 自定义溢出策略（丢弃/告警/阻塞等）   | 可选写锁保护           |
| 读锁保护   | 防止并发修改缓冲区内容               | ReentrantReadWriteLock |
| queueAdder | 灵活定义添加方式（List.add/Map.put） | 函数式接口             |
| 原子计数器 | 实时感知当前缓冲数量                 | LongAdder / AtomicLong |

## 三、消费核心流程（doConsume）

```java
private void doConsume() {
    C old = null;
    try {
        // 1. 获取写锁（确保原子替换）
        if (this.writeLock != null) this.writeLock.lock();

        try {
            // 2. 原子替换缓冲区：取出旧的，设置新的空缓冲
            old = this.buffer.getAndSet(this.bufferFactory.get());
        } finally {
            // 3. 重置计数器
            this.counter.set(0L);

            // 4. 唤醒所有等待写入的线程
            if (this.writeCondition != null) this.writeCondition.signalAll();

            // 5. 释放写锁
            if (this.writeLock != null) this.writeLock.unlock();
        }

        // 6. 执行消费（非阻塞）
        if (old != null) {
            this.consumer.accept(old);
        }
    } catch (Throwable e) {
        // 7. 异常兜底
        if (this.exceptionHandler != null) {
            try {
                this.exceptionHandler.accept(e, old);
            } catch (Throwable ignored) {
                e.printStackTrace();
                ignored.printStackTrace();
            }
        } else {
            logger.error("消费异常", e);
        }
    }
}
```

**关键设计亮点**

1. **原子替换 + 新缓冲区**  
   `buffer.getAndSet(bufferFactory.get())` 确保消费和生产分离，避免消费期间新元素混入旧批次。

2. **写锁最小化持有**  
   只在替换缓冲区时持有写锁，消费逻辑完全在锁外执行，极大提升并发性能。

3. **条件变量唤醒**  
   `writeCondition.signalAll()` 通知所有等待容量释放的生产者继续入队。

4. **异常友好**  
   消费异常不影响下一次消费，提供 `exceptionHandler` 扩展点。

## 四、触发策略（MultiIntervalTriggerStrategy）

```java
public class MultiIntervalTriggerStrategy implements SimpleBufferTrigger.TriggerStrategy {
    private long minTriggerPeriod = Long.MAX_VALUE;
    private final SortedMap<Long, Long> triggerMap = new TreeMap<>(); // <间隔毫秒, 触发阈值>

    public MultiIntervalTriggerStrategy on(long interval, TimeUnit unit, long count) {
        long ms = unit.toMillis(interval);
        triggerMap.put(ms, count);
        minTriggerPeriod = checkAndCalcMinPeriod(); // 重新计算最小触发周期
        return this;
    }
}
```

**设计思想**  
- 支持**多维度触发**（例如：100条/1秒 或 500条/5秒 任一满足即触发）  
- TreeMap 保证按时间从小到大排序，方便快速判断  
- 动态计算 `minTriggerPeriod` 用于定时器调度优化

## 五、BufferFactory 作用

```java
private final Supplier<C> bufferFactory;
```

**作用**  
每次消费后自动生成**全新、空闲的缓冲容器**（如 `ArrayList::new`、`LinkedList::new`、`HashMap::new` 等）

**典型用法**

```java
.setBufferFactory(ArrayList::new)           // 列表缓冲
.setBufferFactory(LinkedHashMap::new)       // 有序Map
.setBufferFactory(() -> new ConcurrentHashMap<>()) // 并发Map
```

## 六、整体流程图（文本版）

```
生产者 enqueue(element)
    ↓
容量检查（可选拒绝处理器）
    ↓ 通过
获取读锁
    ↓
向当前缓冲区添加元素（queueAdder）
    ↓
原子更新计数器
    ↓
释放读锁
    ↓
触发器判断（数量/时间/多间隔）
    ↓ 满足任一条件
doConsume()
    ↓ 获取写锁
    ↓ 原子替换缓冲区（getAndSet 新容器）
    ↓ 重置计数器为0
    ↓ signalAll 唤醒等待的生产者
    ↓ 释放写锁
    ↓ 执行 consumer.accept(oldBuffer)
    ↓ 异常 → exceptionHandler
```

## 七、核心优势总结

- **非阻塞**：生产与消费分离，消费在锁外执行  
- **高并发友好**：读写锁 + 原子计数器 + 条件变量  
- **灵活触发**：支持多间隔策略  
- **异常友好**：消费异常不影响下一次触发  
- **轻量级**：相比 Disruptor/Disruptor 更简单，适合业务批量聚合场景

**适用场景**  
- 日志批量写入  
- 埋点/事件聚合  
- 消息批量投递  
- 数据库批量更新  
- 任何需要“攒批再发”的场景

```
