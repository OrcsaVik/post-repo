# 搭建 ZooKeeper 3 节点集群（Docker Compose，自定义网络）

## 1. 准备工作

- 安装 Docker 与 Docker Compose。
- 拉取镜像：`docker pull zookeeper:3.5.6`。
- 创建数据目录：

```bash
mkdir -p ./zk-cluster/data/{zk1,zk2,zk3}
```

- 注意事项：
  - ZooKeeper 节点间通信需使用**服务名**而非 IP，否则 leader 选举和节点识别可能失败。
  - Docker 默认桥接网络可用，但建议自定义 `bridge` 网络避免 IP 冲突。

------

## 2. Docker Compose 配置示例（修正 ZOO_SERVERS 格式）

```yaml
version: '3'
services:
  zk1:
    image: zookeeper:3.5.6
    container_name: zk1
    restart: always
    networks:
      zk_net:
        ipv4_address: 172.28.0.101
    ports:
      - "2181:2181"
    volumes:
      - ./data/zk1:/data
    environment:
      ZOO_MY_ID: 1
      ZOO_SERVERS: server.1=zk1:2888:3888;2181 server.2=zk2:2888:3888;2181 server.3=zk3:2888:3888;2181
      ZOO_4LW_COMMANDS_WHITELIST: stat,ruok,mntr

  zk2:
    image: zookeeper:3.5.6
    container_name: zk2
    restart: always
    networks:
      zk_net:
        ipv4_address: 172.28.0.102
    ports:
      - "2182:2181"
    volumes:
      - ./data/zk2:/data
    environment:
      ZOO_MY_ID: 2
      ZOO_SERVERS: server.1=zk1:2888:3888;2181 server.2=zk2:2888:3888;2181 server.3=zk3:2888:3888;2181
      ZOO_4LW_COMMANDS_WHITELIST: stat,ruok,mntr

  zk3:
    image: zookeeper:3.5.6
    container_name: zk3
    restart: always
    networks:
      zk_net:
        ipv4_address: 172.28.0.103
    ports:
      - "2183:2181"
    volumes:
      - ./data/zk3:/data
    environment:
      ZOO_MY_ID: 3
      ZOO_SERVERS: server.1=zk1:2888:3888;2181 server.2=zk2:2888:3888;2181 server.3=zk3:2888:3888;2181
      ZOO_4LW_COMMANDS_WHITELIST: stat,ruok,mntr

networks:
  zk_net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

- 启动集群：`docker-compose up -d`
- 检查日志：`docker logs zk1` 确认 Leader 选举完成。

------

## 3. 核心端口说明

| 端口 | 含义       | 用途                          |
| ---- | ---------- | ----------------------------- |
| 2181 | clientPort | 客户端连接端口                |
| 2888 | peerPort   | Follower 与 Leader 同步及心跳 |
| 3888 | leaderPort | Leader 选举通信               |

------

## 4. 集群状态验证

### 连接与四字命令

```bash
# 连接 zk1
docker exec -it zk1 zkCli.sh -server zk1:2181

# 查看节点状态
echo stat | nc localhost 2181
```

- 注意：ZooKeeper 3.5+ 默认禁用四字命令，需通过 `ZOO_4LW_COMMANDS_WHITELIST` 环境变量启用。

### 日志示例

```text
[LearnerHandler-/172.28.0.101:44212] - Synchronizing with Follower sid: 1
[QuorumPeer[myid=3]] - Have quorum of supporters, starting up leader
```

------

## 5. 文件与节点管理

### 数据目录

- 每个节点 `./data/zk{1,2,3}` 对应容器 `/data`。
- `myid` 文件放在 `/data/myid`，内容为节点 ID（1/2/3）。

### 节点操作示例

```text
# 创建持久节点
create /myapp "hello world"

# 创建子节点
create /myapp/config "{\"db_url\": \"localhost:3306\", \"timeout\": 30}"

# 创建临时节点
create -e /myapp/temp_node "temporary data"

# 创建顺序节点
create -s /myapp/worker "worker_1"

# 查看节点
ls /
ls /myapp

# 获取节点数据
get /myapp
```

- `-e`：临时节点
- `-s`：顺序节点

------

## 6. 集群常见问题及修复

| 问题                         | 原因                         | 解决方案                                          |
| ---------------------------- | ---------------------------- | ------------------------------------------------- |
| 单节点可用，集群模式拒绝连接 | ZOO_SERVERS 环境变量格式错误 | 使用 `server.X=zkX:2888:3888;2181` 格式           |
| stat 命令不可用              | 四字命令默认禁用             | 添加 `ZOO_4LW_COMMANDS_WHITELIST: stat,ruok,mntr` |
| 权限 ACL 错误                | 节点操作无有效 ACL           | 使用有效 ACL 或临时允许空 ACL（生产慎用）         |
| Leader/Follower 无法选举     | IP 替代服务名                | 使用服务名 zk1/zk2/zk3，不使用容器 IP             |

------

## 7. 监控与管理

- **Web UI**：Zookeeper 原生无 Web UI
  - 可使用 Exhibitor 或 ZKUI
  - Exhibitor 配置 REST API（8080）
- **命令行**：
  - `zkServer.sh status` 查看节点模式（leader/follower）
  - `zkCli.sh` 执行四字命令或 CRUD 节点操作

------

## 8. Docker 网络说明

- 默认 `bridge` 网络：`172.17.0.0/16`
- 自定义 bridge 网络：可指定子网，例如 `172.28.0.0/16` 避免冲突
- Docker Compose 自定义网络可固定 IP，便于 ZooKeeper 节点发现与 Leader 选举

------

## 9. 总结

- 核心原则：使用服务名而非 IP，确保 `ZOO_SERVERS` 格式符合 3.5+ 规范；启用四字命令白名单；每节点 `myid` 配置正确；自定义网络保证节点互通。
- 常见操作：节点创建、顺序节点、临时节点、数据读取、状态检查。
- 集群调试关键：查看日志确认 Leader/Follower 选举，使用 `zkCli.sh` 验证节点同步。