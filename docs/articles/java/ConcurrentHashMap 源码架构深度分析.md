---

title: ConcurrentHashMap 源码架构深度分析
description: 对比分析 JDK 7 与 JDK 8 中 ConcurrentHashMap 的存储结构、并发控制及扩容机制。
---
# ConcurrentHashMap 核心架构深度解析

本文档基于 JDK 7 与 JDK 8 的源码实现，提炼并发容器在分段锁与细粒度锁演进过程中的核心知识点。

------

## 1. JDK 7：分段锁架构 (Segment-Based)

JDK 7 采用 **分段锁 (Segment)** 机制，将数据分为多个段，每一把锁只负责一个段的数据，从而实现真正的并发写入。

### 1.1 核心参数

- **DEFAULT_INITIAL_CAPACITY**: 默认总容量 16。
- **DEFAULT_CONCURRENCY_LEVEL**: 默认并发级别 16（即 Segment 数组长度）。
- **segmentShift / segmentMask**: 用于定位 Segment 的偏移量与掩码。

### 1.2 初始化逻辑

1. **参数校验**：确保并发级别、容量等参数合法，并调整为 2 的幂次方。
2. **初始化 segments[0]**：作为原型，后续创建其他 Segment 时会参考其负载因子和容量。
3. **延迟初始化**：除第一个外，其余 Segment 在 `put` 时通过 **CAS (Compare-And-Swap)** 延迟创建。

### 1.3 关键操作：Put

::: info 写入流程


2. **自旋获取锁**：执行 `scanAndLockForPut`，通过自旋尝试获取 `ReentrantLock`。

3. **阻塞获取**：自旋次数超限后，转为阻塞锁。

4. 扩容检查：仅针对当前 Segment 内部 进行扩容，不影响其他段。

   :::

------

## 2. JDK 8：细粒度锁与红黑树 (CAS + Synchronized)

JDK 8 摒弃了 Segment 概念，采用 **Node 数组 + 链表 / 红黑树** 结构。

### 2.1 存储结构演进

- **取消分段锁**：改为对数组的每个 **头节点 (Node)** 上锁。
- **数据结构**：当链表长度 $\ge 8$ 且数组长度 $\ge 64$ 时，链表转换为 **红黑树 (TreeBin)** 以提升查询效率。

### 2.2 核心 Put 逻辑

1. **哈希计算**：计算 Key 的扰动哈希值。
2. **空位写入 (CAS)**：若目标桶位为空，使用 `CAS` 直接插入，无需加锁。
3. **扩容协助 (MOVED)**：若检测到 `hash == -1`，表示正在扩容，当前线程协助迁移数据。
4. **节点加锁 (synchronized)**：若桶位不为空，锁住该桶的**第一个节点**进行链表遍历或树操作。
5. **树化阈值**：插入完成后检查 `binCount`。
   - **链表 $\to$ 红黑树**：长度达到 8 且数组长度 $\ge 64$。
   - **红黑树 $\to$ 链表**：扩容或删除导致树节点 $\le 6$。

------

## 3. 扩容机制对比 (Resizing)

| **维度**     | **JDK 7 (Segment 内部扩容)**    | **JDK 8 (多线程协同扩容)**                        |
| ------------ | ------------------------------- | ------------------------------------------------- |
| **触发单位** | 单个 Segment 独立扩容           | 整个 Node 数组统一扩容                            |
| **扩容倍数** | 容量左移 1 位 ($2 \times Size$) | 容量左移 1 位 ($2 \times Size$)                   |
| **并发性**   | 其他 Segment 仍可读写           | 全局并发迁移，效率极高                            |
| **位置计算** | `hash & sizeMask`               | `(n - 1) & hash`，位置要么不变，要么增加 $OldCap$ |

------

## 🛡️ 4. 关键技术点总结

::: danger 工程细节

- **Volatile 语义**：数组节点使用 `volatile` 配合 `Unsafe.getObjectVolatile` 确保多线程间的可见性。

- **低粒度**：JDK 8 通过锁定桶头节点将锁粒度从 $1/16$ 降低到 $1/N$（N 为数组长度）。

- 自旋锁优化：JDK 7 在 scanAndLockForPut 中自旋时会顺便预取数据，减少 CPU 等待。

  :::

------

**下一步建议：**

1. 是否需要针对 JDK 8 的 **多线程协同扩容 (transfer 方法)** 的具体流程图进行分析？
2. 是否需要对比 `ConcurrentHashMap` 与 `Hashtable`、`Collections.synchronizedMap` 的性能基准测试？