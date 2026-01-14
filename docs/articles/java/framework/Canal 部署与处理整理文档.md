---
title: Canal 深入理解

---

  # Canal 部署与处理整理文档

  ## 1. CDC（Change Data Capture，数据变更抓取）

  - CDC 通过数据源事务日志抓取变更，解决一致性问题（前提：下游能保证变更应用到新库）。
  - 问题：各数据源变更抓取协议不同
    - MySQL：Binlog
    - PostgreSQL：Logical decoding
    - MongoDB：Oplog

  ### 主流 CDC 组件

  | 组件               | 特点                                                                                 |
  | ------------------ | ------------------------------------------------------------------------------------ |
  | **Canal**          | 阿里开源，基于数据库增量日志解析，提供增量数据订阅与消费，主要支持 MySQL             |
  | **Databus**        | LinkedIn 分布式变更抓取系统，官方支持 Oracle，MySQL 仅通过 OpenReplicator Demo       |
  | **Mysql-Streamer** | Yelp，Python 数据管道                                                                |
  | **Debezium**       | RedHat 开源，支持 MySQL、MongoDB、PostgreSQL，Snapshot Mode 可统一处理全量与增量数据 |

  ------

  ## 2. Canal 工作原理

  1. 模拟 MySQL slave，向 MySQL master 发送 dump 协议。
  2. Master 推送 binary log 给 Canal。
  3. Canal 解析 binary log 对象（byte 流）。
  4. Row 模式 binlog 提供每条 DML 的前后数据，支持高效增量订阅。
     **注意**：Canal 仅支持 row 模式，statement 模式无法获取原始数据。

  ### 协议格式

  - 参见 `CanalProtocol.proto` 和 `EntryProtocol.proto`

  ```
  Entry
    Header
      logfileName
      logfileOffset
      executeTime
      schemaName
      tableName
      eventType
    entryType
    storeValue -> RowChange
  
  RowChange
    isDdl
    sql
    rowDatas[]
      beforeColumns[]
      afterColumns[]
  
  Column
    index
    sqlType
    name
    isKey
    updated
    isNull
    value
  ```

  ------

  ## 3. 配置文件

  ### instance.xml 默认支持

  - `spring/memory-instance.xml`
  - `spring/file-instance.xml`
  - `spring/default-instance.xml`
  - `spring/group-instance.xml`

  ### 元数据维护

  - **解析位点**：`CanalLogPositionManager`
  - **消费位点**：`CanalMetaManager`

  ### instance.properties 核心配置

  - 每个 destination 创建对应目录（`example1`, `example2`）并放置 `instance.properties`
  - 默认实例数量通过 `canal.destinations` 定义

  ### canal.properties 配置

  | 参数               | 说明                               | 默认值 |
  | ------------------ | ---------------------------------- | ------ |
  | canal.destinations | 当前 Server 上部署的 instance 列表 | 无     |

  ------

  ## 4. SQL 类型处理

  ### DDL

  - 创建、修改、删除数据库对象
  - 执行 DDL 自动提交事务

  ### DML

  - 操作表中数据
  - 手动提交事务（非自动提交模式）

  ```sql
  INSERT INTO users (id, name, email) VALUES (1, 'Alice', 'alice@example.com');
  UPDATE users SET email = 'alice_new@example.com' WHERE id = 1;
  DELETE FROM users WHERE id = 1;
  SELECT * FROM users WHERE name = 'Alice';
  ```

  ### Canal 事件监听示例

  ```java
  @CanalEventListener
  public class MyEventListener {
      @InsertListenPoint
      public void onEvent(CanalEntry.EventType eventType, CanalEntry.RowData rowData) { ... }
  
      @UpdateListenPoint
      public void onEvent1(CanalEntry.RowData rowData) { ... }
  
      @DeleteListenPoint
      public void onEvent3(CanalEntry.EventType eventType) { ... }
  
      @ListenPoint(destination = "example", schema = "canal-test", table = {"t_user","test_table"}, eventType = CanalEntry.EventType.UPDATE)
      public void onEvent4(CanalEntry.EventType eventType, CanalEntry.RowData rowData) { ... }
  }
  ```

  ------

  ## 5. Binlog 解析与数据传输

  ### DirectLogFetcher 流程

  1. 读取协议头 4 字节，判断包状态。
  2. 解析包总长度与序号。
  3. 读取完整包到 buffer。
  4. 判断状态码，错误响应抛出异常并记录。

  ### 数据流关键阶段

  1. **Parser**：模拟 MySQL slave 拉取 binlog。
  2. **Decoder**：将二进制流解码为结构化事件。
  3. **RingBuffer**：高性能内存队列传递事件。
  4. **Cursor**：管理 `put`、`get`、`ack` 指针。
  5. **Sink**：处理事件（过滤、转换）。
  6. **Sender / Client**：发送下游（Kafka、RocketMQ、自定义应用）。

  ------

  ## 6. ZooKeeper 在 Canal 中的使用

  - 存储特定路径结构，实现 HA 和分布式元数据管理

  ```
  /otter
   └── canal
        ├── cluster
        │    ├── 10.0.0.1:11111
        │    └── 10.0.0.2:11111
        ├── destinations
        │    └── example
        │         ├── cluster
        │         ├── running
        │         ├── lock
        │         ├── config
  ```

  ### 多实例消费与 HA

  - 多台实例可消费同一个数据库，ZK 控制 Active/Standby 状态
  - 异步 Ack 带来的重复消息需通过 Binlog 位点判断处理
  - 根本原因常见于 `canal.instance.global.spring.xml` 配置不正确
    - 正确：`classpath:spring/default-instance.xml`（通过 ZK 管理位点）
    - 错误：指向本地文件或不支持 HA 的 XML

  ### Binlog 消费异常处理

  - Canal 停机后重启，binlog 位置可能已被删除
  - 解决方案：删除 `meta.dat` 文件，重启 Canal

  ------

  ## 7. MySQL 状态查询

  ```sql
  SHOW MASTER STATUS;
  SHOW VARIABLES LIKE '%server_uuid%';
  ```

  - `File`、`Position` 获取 binlog 信息
  - `Executed_Gtid_Set` 获取 GTID 历史，验证主从切换记录
  - `server_uuid` 与 GTID 对应验证当前主库事务状态

  ------

  ## 8. Canal-Adapter 概述

  - **功能**：自动同步 Canal 数据到其他存储
  - **核心文件**：
    - `application.yml`：全局配置（Canal Server、Kafka/RocketMQ、ZK 地址）
    - 任务配置文件（如 `conf/rdb/mysql1.yml`）：定义同步任务、源主键到目标主键映射
  - **可靠性**：ACK 与重试机制
  - **高效性**：多线程、流式查询优化
  - **可用性**：ZK 实现动态配置与分布式任务开关

  ### Client-Adapter 架构

  - `group` 内部串行执行多个 `outerAdapters`，组间并行
  - 支持分布式锁，实现高可用
  - 手动控制 HA 时需删除节点、重新配置并记录状态

  ------

  ## 9. 学习资料

  - [CSDN 原文 - 百里山川](https://blog.csdn.net/qq_37670707/article/details/88060395)
  - [极客文档 - Canal 学习资料](https://geekdaxue.co/read/zhangzhiyong-9bvbs@ekd9c9/olanz0)
