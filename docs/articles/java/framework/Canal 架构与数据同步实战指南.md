
# Canal 架构与数据同步实战指南

**Canal** 是阿里巴巴开源的一个基于 MySQL 数据库增量日志解析，提供增量数据订阅和消费的组件。它的核心原理是**模拟 MySQL Slave 的交互协议**，伪装成 Slave，向 Master 发送 dump 协议获取 binlog 并解析。

------

## 一、 Canal 核心架构：Instance 模块

Canal 的一个最小工作单元是 **Instance**，每个 Instance 对应一个数据源。其内部由四个核心组件构成：

1. **EventParser (数据源接入)**
   - **职责**：模拟 MySQL Slave 协议与 Master 交互，获取 binlog。
   - **原理**：解析二进制流（协议解析），将其转化为 Canal 定义的 Entry 实体。
2. **EventSink (链接器)**
   - **职责**：作为 Parser 和 Store 之间的桥梁。
   - **功能**：负责数据的**过滤**（如基于正则过滤库表）、**加工**（如数据打标）和**分发**。
3. **EventStore (数据存储)**
   - **职责**：临时存储解析后的数据。
   - **现状**：目前主要基于**内存**实现（环形队列），提供高性能的读取能力。
4. **MetaManager (元数据管理)**
   - **职责**：管理增量订阅和消费的进度（Position/Cursor）。
   - **功能**：记录当前消费到了 binlog 的哪个文件和偏移量，确保重启后能断点续传。

------

## 二、 Canal 框架组成

1. **Canal-Server**
   - 核心服务端，负责运行各个 Instance，解析并存储 binlog。
2. **Canal-Admin**
   - 运维管理面板，支持对 Instance 进行 Web 化配置、启停及集群管理。
3. **Canal-Client (ClientAPI)**
   - 通过 TCP 或消息队列（Kafka/RocketMQ）获取数据。支持 **VIP 机制**（封装开放 IP），提供高可用的接入能力。
4. **Canal-Adapter (客户端适配器)**
   - 官方提供的外挂组件，支持将数据直接同步到 Elasticsearch、HBase、关系型数据库等目标端。

------

## 三、 写入 Elasticsearch (ES) 的方案对比

针对数据同步到 ES，通常有两种主流实现思路：

### 1. 使用 Canal-Adapter (官方适配器)

- **优点**：开箱即用，通过 YAML 配置映射关系，无需编写代码。
- **缺点**：灵活性受限，对于复杂的逻辑转换处理较难。

### 2. 自定义消费者写入 (集成 ES-Client)

- **实现方式**：在微服务中集成 `elasticsearch-rest-high-level-client`（或新版 Java Client）。
- **逻辑流**：`MySQL -> Canal -> Kafka -> 自定义 Consumer -> ES-Client -> ES`。
- **推荐理由**：如你所述，作为独立服务时，集成 **ES-Client** 能减少对特定适配器组件的依赖，支持更复杂的业务加工逻辑，确保数据一致性。

------

## 四、 Canal 集群与高可用机制

- **ZooKeeper 协调**：Canal 依赖 ZK 进行 Server 选举和 Instance 的状态协调。
- **Active-Standby**：同一时间只有一个 Server 运行特定的 Instance，当主节点宕机，备节点通过 ZK 抢占锁并从 MetaManager 记录的位点继续同步。

------

## ✅ 工程实践总结

- **过滤先行**：在 `eventSink` 阶段通过 `canal.instance.filter.regex` 过滤掉不必要的表，降低内存压力。
- **顺序性保障**：如果通过 Kafka 传输，需确保相同 ID 的数据进入同一个 Partition，防止乱序导致 ES 数据状态错误。
- **内存调优**：由于 `eventStore` 默认在内存中，高并发写入时需观察 JVM 堆内存与物理内存（Swap）的占用情况。

