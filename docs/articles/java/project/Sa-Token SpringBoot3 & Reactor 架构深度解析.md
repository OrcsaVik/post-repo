---
title: Sa-Token SpringBoot3 & Reactor 架构深度解析 
description: 涵盖响应式上下文管理、网关过滤器链、自动装配机制与核心组件设计模式。
---

# Sa-Token SpringBoot3 & Reactor 架构深度解析

## 一、 Sa-Token 在 Reactor 环境下的挑战

在传统的 Servlet 环境中，上下文管理依赖 `ThreadLocal`。但在 **Spring WebFlux (Reactor)** 环境中，由于其**异步非阻塞**与**线程复用**的特性，传统的 ThreadLocal 会失效。

### 1. 核心矛盾：异步清理时机

在响应式编程中，chain.filter(exchange) 返回的是一个延迟执行的 Mono。

::: danger 预警

如果在过滤器中使用传统的 try-finally 块：



```java
try {
    SaReactorSyncHolder.setContext(exchange);
    return chain.filter(exchange);
} finally {
    SaReactorSyncHolder.clearContext(); // 错误：此时 Mono 尚未执行完成，上下文被提前清除
}
```

:::

解决方案：Sa-Token 响应式模块通过订阅生命周期钩子（如 doFinally）来确保在流结束时才清理上下文，或者利用 Reactor Context 进行传播。

------

## 二、 Spring Cloud Gateway 响应机制

在网关层，Sa-Token 提供了 `SaReactorOperateUtil` 来处理结果输出。

### 1. 结果 JSON 化问题

**问：是否需要手动 JSON 化结果？**

- **对于下游业务响应**：不需要。Gateway 充当透明代理，会自动转发下游服务的 `Content-Type` 和 Body。
- **对于网关自身拦截（认证失败）**：**需要手动处理**。因为网关默认返回 `text/plain`。


```java
// 正确的 JSON 返回示例
SaHolder.getResponse().setHeader("Content-Type", "application/json;charset=UTF-8");
String json = "{\"code\": 401, \"msg\": \"未登录\"}";
return SaReactorOperateUtil.writeResult(exchange, json);
```

### 2. 过滤器执行顺序

Sa-Token 在网关中通过高度有序的过滤器链保障安全：

1. **SaTokenContextFilterForReactor (-200)**: 初始化最底层的上下文。
2. **SaReactorFilter (-100)**: 执行核心 `auth` 认证逻辑。
3. **SaFirewallCheckFilter**: 拦截恶意请求（如非法字符）。
4. **SaTokenCorsFilter**: 处理跨域。

------

## 三、 设计模式：空对象与动态替换

### 1. 空对象模式 (Null Object Pattern)

`SaTokenContextDefaultImpl` 所有方法均抛出异常，这是一种**防御性编程**：

- **价值**：避免系统在未配置 Web 环境时产生不可预知的 `NullPointerException`。
- **提示**：明确告知开发者“未能获取有效的上下文处理器”，引导检查依赖。

### 2. 策略模式与匿名内部类

在 `SaStrategy` 中，Token 的生成采用了**策略模式**。默认实现是一个复杂的 `switch-case` 匿名内部类，支持 `UUID`、`Simple-UUID`、`Tik` 等风格。开发者可以通过 `SaStrategy.instance.setCreateToken(...)` 随时覆盖算法。

------

## 四、 核心组件管理体系

Sa-Token 采用 **单例模式 + 静态代理**，提供了极简的 API。

| **组件名称**  | **核心职责**     | **常用方法**                             |
| ------------- | ---------------- | ---------------------------------------- |
| **SaManager** | 全局组件仓库     | `getSaTokenDao()`, `setSaTokenContext()` |
| **SaHolder**  | 当前请求环境访问 | `getRequest()`, `getResponse()`          |
| **StpLogic**  | 认证逻辑引擎     | `login()`, `checkPermission()`           |
| **StpUtil**   | 业务调用静态代理 | `StpUtil.login(1001)`                    |

------

## 五、 数据持久化：从内存到 Redis

### 1. 默认存储

默认使用 `SaTokenDaoDefaultImpl`，其底层是 `ConcurrentHashMap`。**重启即丢失，无法做集群共享。**

### 2. Redis 自动切换原理

当引入 `sa-token-dao-redis-jackson` 依赖时，利用 Spring Boot 的 **自动配置（Auto-Configuration）** 机制完成切换。

**装配优先级：**

1. **用户自定义 Bean**：若你手动定义了 `SaTokenDao`，自动配置失效。
2. **Redis 自动配置**：检测到 `RedisTemplate` 类和 Bean 存在时，注入 `SaTokenDaoRedisJackson`。
3. **默认内存配置**：最后兜底。



```Java
// 核心判断逻辑
@ConditionalOnMissingBean(SaTokenDao.class) // 如果没有自定义，才装配我
public SaTokenDao saTokenDao(RedisTemplate<String, Object> redisTemplate) {
    return new SaTokenDaoRedisJackson(redisTemplate);
}
```

------

## 六、 总结

1. **Reactor 适配**：必须通过专用的 `SaTokenContextForSpringReactor` 解决异步上下文丢失。
2. **网关拦截**：手动处理 `Content-Type` 为 `application/json`。
3. **持久化**：引入 Redis starter 后通过 `@Conditional` 机制实现“零配置”无感切换。


