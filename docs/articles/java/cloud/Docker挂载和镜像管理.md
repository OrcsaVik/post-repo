---
title: Docker挂载和镜像管理
---

# Docker 镜像管理

### 镜像源地址
- ~~https://github.com/stilleshan/dockerfiles~~
- [API接口 - 渡渡鸟容器同步站](https://docker.aityp.com/manage/api)
- https://dockerproxy.net/

### 镜像拉取机制
1. 使用 apiserver 发送对应请求
2. API 通过 proxy 拉取指定域名的镜像
3. 若镜像不存在则返回报错
4. 若镜像存在则拉取并存储在 imagestore 中

### 镜像标签管理
```bash
docker tag swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/wurstmeister/kafka:latest linhaixin.registry/library/kafka:latest
```

```bash
docker tag swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/rabbitmq:3.13.3-management linhaixin.registry/library/rabbitmq:3.13.3
```

## 磁盘使用分析

```bash
[root@vbox vagrant]# df -h
Filesystem      Size  Used Avail Use% Mounted on
devtmpfs        1.9G     0  1.9G   0% /dev
tmpfs           1.9G     0  1.9G   0% /dev/shm
tmpfs           1.9G  9.2M  1.9G   1% /run
tmpfs           1.9G     0  1.9G   0% /sys/fs/cgroup
/dev/sda1        40G   23G   18G  56% /
tmpfs           379M     0  379M   0% /run/user/1000
overlay          40G   23G   18G  56% /var/lib/docker/overlay2/4565415149d90e699c57e2f7962e2342e60ed8e14bfd62567e59c7817fefc9f3/merged
overlay          40G   23G   18G  56% /var/lib/docker/overlay2/42ffe31dec182869460d4c87ddab22b3768d0c19fcf2a98c80850f2d00ff2330/merged
overlay          40G   23G   18G  56% /var/lib/docker/overlay2/340e2fac3aa7219a608fb784103ce6e5668376004d72b798a80114bd846e6fa9/merged
shm              64M     0   64M   0% /var/lib/docker/containers/12d73c0e920bad8e5c999862c4d5a13c11aad47ea147f80d20ac79e1e9d5b035/mounts/shm
shm              64M     0   64M   0% /var/lib/docker/containers/837970378f852e497d47f8f55ec01f55a78677b806b2a63631c0f7effd0f0fb0/mounts/shm
shm              64M     0   64M   0% /var/lib/docker/containers/11cfbfee1f0af410b029fdd6e2edee9957ad77fac57ae029347af0b9fcf4a72d/mounts/shm
```

## 多个 `overlay` 挂载点

这些是 **Docker 容器的存储层**：

```bash
overlay ... /var/lib/docker/overlay2/xxx/merged
```

### 关键信息
- 表示当前运行 **至少 3 个 Docker 容器**
- 所有容器共享底层 `/dev/sda1` 的 40G 空间
- Docker 镜像和容器数据都存储在 `/var/lib/docker` 下，计入 `/` 分区使用量

### 风险提示
- Docker 容器的日志、镜像、卷会持续占用空间
- 即使容器删除，旧镜像可能仍存在
- 长期运行后容易“悄悄”占满磁盘

## Docker 隔离机制

### Mount Namespace
- 使用 mount namespace 进行隔离
- 实现文件挂载隔离
- 其他隔离维度：gid、cpu、cid、network

## RabbitMQ 镜像对比

### docker.io/rabbitmq:3.13.3-management
- 这是 RabbitMQ 的 **主流服务器镜像**
- 包含 Web 管理界面
- 用于直接部署单个 RabbitMQ 实例

### docker.io/rabbitmqoperator/cluster-operator:2.15.0
- 这是一个 **Kubernetes Operator**，与服务器镜像有本质区别
- **镜像来源**：由 RabbitMQ 团队为 Kubernetes 环境开发
- **主要功能**：
  - 基于 Kubernetes CRD（自定义资源）声明式创建和管理 RabbitMQ 集群
  - 自动处理集群的部署、扩缩容、故障恢复
  - 管理 TLS 配置、插件启用、用户管理等
  - 简化在 Kubernetes 上运行高可用 RabbitMQ 集群的运维复杂度