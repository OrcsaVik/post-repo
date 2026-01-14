---
 title: Java 队列深度对比：ArrayBlockingQueue vs ConcurrentLinkedQueue 
 description: 深度解析有界阻塞队列与无锁非阻塞队列的底层实现、并发模型及适用场景。
---
# ArrayBlockingQueue 与 ConcurrentLinkedQueue



------

## 🏗️ 一、 核心架构与类继承体系

两者都源自 `java.util.Queue` 接口，但在处理并发竞争时走出了截然不同的技术路径。

| **特性**     | **ArrayBlockingQueue (ABQ)**        | **ConcurrentLinkedQueue (CLQ)** |
| ------------ | ----------------------------------- | ------------------------------- |
| **底层实现** | **循环数组** (Object[])             | **单向链表** (Node)             |
| **有界性**   | **有界** (创建时必须指定容量)       | **无界** (理论上仅受内存限制)   |
| **并发模型** | **悲观锁** (独占锁 `ReentrantLock`) | **乐观锁** (无锁 `CAS` 算法)    |
| **吞吐量**   | 中等（存在锁竞争开销）              | **极高**（Wait-Free 算法）      |

------

## 🧬 二、 ArrayBlockingQueue：阻塞与安全

ABQ 的核心在于**“阻塞”**，它是生产者-消费者模式的经典实现，利用 AQS 条件等待机制协调速度差异。

### 1. 核心机制：双条件阻塞

它使用一把锁和两个条件变量来管理线程：

- **`notFull`**：当队列满时，`put()` 线程在此等待。
- **`notEmpty`**：当队列空时，`take()` 线程在此等待。



### 2.1 入队逻辑：put(E e)

当队列满时，`put` 方法会阻塞当前线程，直到队列有空位。



```java
public void put(E e) throws InterruptedException {
    checkNotNull(e);
    final ReentrantLock lock = this.lock;
    // 使用可中断锁，响应外部 interrupt
    lock.lockInterruptibly(); 
    try {
        // 使用 while 而不是 if，防止虚假唤醒
        while (count == items.length)
            notFull.await(); // 队列满，进入等待集并释放锁
        enqueue(e); // 执行入队
    } finally {
        lock.unlock();
    }
}
```

### 2.2 出队逻辑：take()

与 `put` 相反，如果队列为空，`take` 会阻塞。



```java
public E take() throws InterruptedException {
    final ReentrantLock lock = this.lock;
    lock.lockInterruptibly();
    try {
        while (count == 0)
            notEmpty.await(); // 队列空，等待生产者唤醒
        return dequeue(); // 执行出队
    } finally {
        lock.unlock();
    }
}
```

------

## 🔄 3. 循环队列实现原理

为了高效复用固定长度的数组，`ArrayBlockingQueue` 采用了**循环数组**的思想。当索引到达数组末尾时，会自动跳回索引 0。



```java
private void enqueue(E x) {
    final Object[] items = this.items;
    items[putIndex] = x;
    // 循环逻辑：如果到达末尾，重置为 0
    if (++putIndex == items.length)
        putIndex = 0;
    count++;
    notEmpty.signal(); // 唤醒正在等待获取元素的消费者
}
```

### 3. 性能利器：drainTo

`drainTo(Collection, maxElements)` 可以一次性提取多个元素，减少了频繁 `lock/unlock` 的次数，是实现 **BufferTrigger** 批量处理逻辑的核心方法。

------

## ⚡ 三、 ConcurrentLinkedQueue：极速无锁化

CLQ 的核心在于**“非阻塞”**，它通过不断自旋和 CAS 保证线程安全，避免了内核态与用户态切换的开销。

### 1. 核心算法：Michael & Scott 变体

它利用 `volatile` 保证可见性，利用 `CAS` 保证原子性。



### 2.1 入队逻辑：offer(E e)

入队的核心在于通过 **CAS** 不断尝试将新节点挂载到 `tail.next` 上。



```java
public boolean offer(E e) {
    checkNotNull(e);
    final Node<E> newNode = new Node<E>(e);

    // 死循环/自旋，直到 CAS 成功
    for (Node<E> t = tail, p = t;;) {
        Node<E> q = p.next;
        if (q == null) {
            // p 是最后一个节点，尝试 CAS 将 next 指向新节点
            if (p.casNext(null, newNode)) {
                // 每插入两个节点，更新一次 tail 提升性能（HOPS 策略）
                if (p != t) 
                    casTail(t, newNode);  
                return true;
            }
        }
        else if (p == q)
            // 遇到“哨兵”节点（已出队的节点），跳回 head 重新开始
            p = (t != (t = tail)) ? t : head;
        else
            // 推进 p 指针向后移动
            p = (p != t && t != (t = tail)) ? t : q;
    }
}
```

### 2.2 出队逻辑：poll()

出队同样不加锁，而是通过 CAS 将 `head` 节点的 `item` 设置为 `null`，代表该节点已被消费。

------

##  3. 关键特性：HOPS 延迟更新策略

在源码中你会发现 `tail` 并不总是指向最后一个节点。这是为了**减少对 `tail` 指针的 CAS 写操作**：

1. 如果每次 `offer` 都更新 `tail`，会产生大量的 CAS 竞争。
2. `ConcurrentLinkedQueue` 允许 `tail` 滞后于实际的末尾节点。只有当 `tail` 与实际末尾节点的距离超过一个阈值（通常是 2 个节点）时，才会更新 `tail`。

### 3.1 HOPS 优化（延迟更新）

为了减少对 `tail` 节点的竞争，CLQ 不会在每次入队时都更新 `tail`，而是当 `tail` 偏离末尾节点超过两个步长时才触发更新。

- **优点**：显著降低了缓存行（Cache Line）写竞争。
- **缺点**：`size()` 方法需要 $O(n)$ 遍历，且在高并发下是不精确的，判断为空请务必用 `isEmpty()`。

------

## ⚖️ 四、 深度对比与工程选型

### 1. 场景对标

- **使用 ArrayBlockingQueue 如果：**
  - 你需要**流量削峰/限流**（通过有界性保护后端）。
  - 你需要线程在“没活干”或“活太满”时**自动挂起**以节省 CPU。
  - 数据生产与消费速度基本匹配。
- **使用 ConcurrentLinkedQueue 如果：**
  - 你追求**极致的吞吐量**，且对响应延迟极度敏感。
  - 你需要一个**无界**缓冲区来临时应对瞬间的流量尖峰。
  - 你的逻辑是“有数据就处理，没数据就立刻返回”的**非阻塞轮询**模式。

### 2. 性能总结表

| **方法**     | **ABQ (阻塞)**                    | **CLQ (非阻塞)**       | **建议**             |
| ------------ | --------------------------------- | ---------------------- | -------------------- |
| **入队成功** | 返回 `true`                       | 返回 `true`            | 均推荐使用 `offer`   |
| **入队失败** | `put` 阻塞 / `offer` 返回 `false` | 不会失败（除非 OOM）   | ABQ 注意处理 `false` |
| **出队空时** | `take` 阻塞 / `poll` 返回 `null`  | `poll` 直接返回 `null` | CLQ 适合死循环轮询   |

------

## ✅ 总结

- **ArrayBlockingQueue** 是“管家”，通过**锁**和**界限**帮你管理生产节奏。
- **ConcurrentLinkedQueue** 是“高速路”，通过**CAS**提供最快的通行能力，但不负责限速。

