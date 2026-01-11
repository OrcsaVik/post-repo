---
title: Gemini-CLi & 实现代理
---

# Proxy

## 一、现象记录（V2Ray 日志）

```text
2025/10/22 11:18:45 from 127.0.0.1 accepted //apis.google.com:443 [socks >> proxy]
2025/10/22 11:21:52 from 127.0.0.1 accepted //api.github.com:443 [socks >> proxy]
2025/10/22 11:23:58 from 127.0.0.1 accepted //edge.microsoft.com:443 [socks >> proxy]
...
```

结论性事实：

* 本地存在 **SOCKS 入站端口池（8305~8600）**
* 日志中的端口是 **本地临时入站端口**，不是远程代理端口
* 真实出口仍统一经由 V2Ray 远程节点

---


## 三、本地代理端口角色划分

| 端口      | 角色                   |
| ------- | -------------------- |
| `10808` | 本地 SOCKS 代理（V2RayN）  |
| `10809` | 本地 HTTP 代理           |
| `830x+` | PAC / TUN / 内部转发临时端口 |
| `22008` | 远程服务器监听端口            |

**重要规则：**

> 应用程序 **只能配置本地代理端口**，永远不要直连 `22008`

---

## 四、Gemini CLI 失效原因（结论版）

现象：

```
Error when talking to Gemini API
```

原因链：

1. Gemini CLI = Node.js 程序
2. 默认 **不读取系统代理 / PAC**
3. `HTTP_PROXY` 对其 **不生效**
4. 实际请求未进入 `127.0.0.1:10808`

=> **请求直连，被墙，失败**

---

通过设置代理环境变量

来设置流量控制处理