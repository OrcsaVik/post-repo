---
title:  Apache Shiro 后台管理
description: 详细解析 Shiro 后台管理系统的认证、授权、会话管理、跨域 Cookie 鉴权等核心机制，避免常见陷阱。
---

# Apache Shiro 后台管理系统接入实战


## 1. 接入场景选择：场景 A (后台管理系统)

Shiro 在有状态（Stateful）的后台管理系统中表现最强，其核心依赖 **Session** 和 **Cookie** 的自动关联。



## 2. 核心实现类与接口

在场景 A 中，你**必须手动实现**以下组件，不要依赖默认配置。

### ① Realm 实现 (认证 + 授权)
这是 Shiro 的“法官”，决定了谁能登录，谁能操作什么。

```java [UserRealm.java]
public class UserRealm extends AuthorizingRealm {
    // 认证：subject.login() 时触发
    @Override
    protected AuthenticationInfo doGetAuthenticationInfo(AuthenticationToken token) {
        String username = (String) token.getPrincipal();
        SysUser user = userService.getByUsername(username); // 业务查库
        
        // 关键点：将业务 User 对象作为 Principal 存入内存
        return new SimpleAuthenticationInfo(user, user.getPassword(), getName());
    }

    // 授权：检查权限时触发
    @Override
    protected AuthorizationInfo doGetAuthorizationInfo(PrincipalCollection principals) {
        SysUser user = (SysUser) principals.getPrimaryPrincipal();
        SimpleAuthorizationInfo info = new SimpleAuthorizationInfo();
        info.addStringPermissions(userService.getPermsByUserId(user.getId()));
        return info;
    }
}
```

### ② OnlineWebSessionManager (会话治理)

原生 SessionManager 不支持“强行踢人”或“在线列表”，必须继承重写。

Java

```
public class OnlineWebSessionManager extends DefaultWebSessionManager {
    // 配合 Scheduler 周期性调用，清理 sys_user_online 表中已过期的会话
    @Override
    public void validateSessions() {
        super.validateSessions();
        // 业务逻辑：同步数据库在线状态
    }
}
```

## 3. 业务获取机制：Principal 的内存魔术

### 如何获取当前用户？

不要去查 Cookie 或 Redis，直接调用 API。

Java

```
// 唯一正确姿势
SysUser user = (SysUser) SecurityUtils.getSubject().getPrincipal();
```

::: info 背后逻辑

1. **Cookie**: 只存 `JSESSIONID`。

2. **Session**: 服务端根据 ID 找到 Session 空间。

3. Principal: 登录成功后，User 对象就被序列化存在 Session 里的特定 Key 下。

   :::

## 4. 鉴权与跨域方案

### Cookie 存储限制

- **JSESSIONID**: 默认存储在 Cookie 中。
- **跨域**: 若前后端分离且域名不同，必须配置 **CORS (Cross-Origin Resource Sharing)**。
- **安全性**: 必须开启 `HttpOnly` 防止 XSS 攻击劫持 Session。

### Token 认证对比

如果你需要引入 **Redis**，流程如下：

1. **Filter**: 拦截请求获取 Token。
2. **Redis**: Token 作为 Key，读取序列化的 Session 数据。
3. **Realm**: 构造 `SimpleAuthenticationInfo`，依然将 User 对象存入。

## 5. 必须避开的坑

::: danger 避坑指南

1. **不要手动管理 SecurityManager 线程安全**: 它是 Singleton 的，由 Shiro 内部维护 ThreadLocal。

2. **不要在 Realm 中频繁查库**: 权限信息应配合 **Redis 缓存**，否则每个按钮权限检查都会触发 SQL。

3. Cookie 作用域: 如果有多级子域名，需设置 cookie.setDomain(".domain.com") 否则无法跨子域共享登录。

   :::

------

## 🛡️ 落地总结

- **Realm** 是数据源，决定 `Principal` 是什么。
- **SessionManager** 是控制台，决定谁能在线。
- **Subject** 是入口，方便业务层随时获取当前用户。

