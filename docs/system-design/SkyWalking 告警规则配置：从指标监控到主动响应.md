---
title: SkyWalking 告警规则配置：从指标监控到主动响应
---

# SkyWalking 镜像构建与指标观察

手动盯着控制台并非长久之计。通过配置 `alarm-settings.yml`，你可以让系统在性能指标异常（如成功率下降）时，自动通过 Webhook 推送通知至钉钉、企业微信或自定义 API。

### 1. 核心配置文件定位
SkyWalking 的所有告警逻辑均由后端 OAP Server 管理，配置文件位于：
`skywalking-oap-server` 容器内部的 `/skywalking/config/alarm-settings.yml`。

---

### 2. 告警规则模板：服务成功率监控
以下是一个标准的告警配置模板。重点在于 **`service_sla_rule`**，它定义了当服务成功率低于预设阈值时的触发逻辑。

```yaml
rules:
  # 规则名称：必须以 _rule 结尾
  service_sla_rule:
    # 度量指标名称：service_sla 代表服务成功率
    metrics-name: service_sla
    # 操作符：< 代表小于阈值触发
    op: "<"
    # 阈值：成功率低于 95%（注意：SkyWalking 内部 SLA 通常以 10000 为基数，即 9500 代表 95%）
    # 在 9.x+ 版本中，部分指标已适配为百分比数值，建议根据实际表现调整
    threshold: 9500
    # 检查周期：最近 10 分钟
    period: 10
    # 触发次数：连续 3 次满足条件则报警（过滤抖动）
    count: 3
    # 沉默周期：触发后 5 分钟内不再重复报警
    silence-period: 5
    # 告警信息模板
    message: "警报：服务 {name} 成功率低于 95%，当前成功率为 {value}%，请及时处理！"

# Webhook 配置：告警消息的去向
webhooks:
  # 你的自定义通知接口或机器人 Hook 地址
  - url: http://your-alert-service-api:8080/webhook
  # - url: [https://oapi.dingtalk.com/robot/send?access_token=xxxx](https://oapi.dingtalk.com/robot/send?access_token=xxxx) (钉钉示例)
```



------

### 3. 告警规则参数详解（避坑指南）

| **参数名称**         | **工程含义**      | **调优策略**                                                 |
| -------------------- | ----------------- | ------------------------------------------------------------ |
| **`metrics-name`**   | 监控的 OAL 指标名 | 常用：`service_resp_time` (延迟), `service_sla` (成功率)。   |
| **`period`**         | 时间窗口长度      | 建议设为 5-10 分钟。太短会导致误报，太长会延迟发现问题。     |
| **`count`**          | 阈值触发频次      | **核心避坑点**：不要设为 1。网络波动或 GC 可能导致单次指标下跌，设为 3 可过滤大部分假报警。 |
| **`silence-period`** | 告警冷却时间      | 避免“告警风暴”。设为与处理问题所需的平均时间相当（如 5-10 分钟）。 |

------

### 4. 自动化集成步骤

如果你希望在 Docker 环境下快速应用此配置，建议通过 **Volume 挂载** 方式覆盖：

Bash

```
# 在宿主机创建告警配置文件
vi ./config/alarm-settings.yml

# 在 docker-compose.yml 或 docker run 中挂载
docker run -d \
  --name skywalking-oap \
  -v $(pwd)/config/alarm-settings.yml:/skywalking/config/alarm-settings.yml \
  apache/skywalking-oap-server:9.x.x
```

### 5. 如何验证告警是否生效？

1. **触发错误**：人为通过接口制造 404 或 500 错误。
2. **观察面板**：在 SkyWalking UI 的 `Alarm` 菜单下查看是否有对应的条目生成。
3. **检查 Webhook**：检查你的通知端（如钉钉群）是否收到 JSON 格式的 POST 请求。
