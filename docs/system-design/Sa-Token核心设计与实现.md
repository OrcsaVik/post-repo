---
title: Sa-Token核心设计与实现（2026）
---

# Sa-Token Spring Boot 3 模块 · 核心设计与实现

## 一、核心依赖（Spring Boot 3 集成）

```xml
<!-- Sa-Token Spring Boot 自动配置（推荐） -->
<dependency>
    <groupId>cn.dev33</groupId>
    <artifactId>sa-token-spring-boot-autoconfig</artifactId>
</dependency>

<!-- Redis 存储（生产环境推荐） -->
<dependency>
    <groupId>cn.dev33</groupId>
    <artifactId>sa-token-dao-redis-jackson</artifactId>
</dependency>

<!-- JWT 风格 Token（可选） -->
<dependency>
    <groupId>cn.dev33</groupId>
    <artifactId>sa-token-jwt</artifactId>
</dependency>
```

**默认存储**：内存（ConcurrentHashMap）  
**生产推荐**：Redis（sa-token-dao-redis-jackson）

## 二、上下文管理核心（SaTokenContext）

### 2.1 默认实现（空对象模式）

```java
public class SaTokenContextDefaultImpl implements SaTokenContext {
    public static SaTokenContextDefaultImpl defaultContext = new SaTokenContextDefaultImpl();

    private static final String ERROR = "未能获取有效的上下文处理器";

    @Override
    public void setContext(SaRequest req, SaResponse res, SaStorage stg) {
        throw new SaTokenContextException(ERROR).setCode(SaErrorCode.CODE_10001);
    }

    @Override
    public void clearContext() {
        throw new SaTokenContextException(ERROR).setCode(SaErrorCode.CODE_10001);
    }

    @Override
    public boolean isValid() {
        throw new SaTokenContextException(ERROR).setCode(SaErrorCode.CODE_10001);
    }

    @Override
    public SaTokenContextModelBox getModelBox() {
        throw new SaTokenContextException(ERROR).setCode(SaErrorCode.CODE_10001);
    }
}
```

**设计目的**：  
- 防止空指针  
- 明确报错（未初始化上下文时直接抛异常）  
- 延迟加载（运行时被真实实现替换）

### 2.2 WebFlux 环境上下文注入（SaReactorSyncHolder）

```java
public class SaReactorSyncHolder {

    public static void setContext(ServerWebExchange exchange) {
        SaRequest request = new SaRequestForReactor(exchange.getRequest());
        SaResponse response = new SaResponseForReactor(exchange.getResponse());
        SaStorage storage = new SaStorageForReactor(exchange);
        SaManager.getSaTokenContext().setContext(request, response, storage);
    }

    public static void clearContext() {
        SaManager.getSaTokenContext().clearContext();
    }
}
```

**过滤器中使用方式**（推荐优先级 -200）

```java
public class SaTokenContextFilterForReactor implements WebFilter, Ordered {
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        try {
            SaReactorSyncHolder.setContext(exchange);
            return chain.filter(exchange);
        } finally {
            SaReactorSyncHolder.clearContext();
        }
    }

    @Override
    public int getOrder() {
        return -200; // 最高优先级，确保上下文先行
    }
}
```

## 三、响应式响应写入工具（SaReactorOperateUtil）

```java
public class SaReactorOperateUtil {

    public static Mono<Void> writeResult(ServerWebExchange exchange, String result) {
        ServerHttpResponse response = exchange.getResponse();
        if (response.getHeaders().getFirst(SaTokenConsts.CONTENT_TYPE_KEY) == null) {
            response.getHeaders().set(SaTokenConsts.CONTENT_TYPE_KEY, SaTokenConsts.CONTENT_TYPE_TEXT_PLAIN);
        }
        // 如需 JSON 返回，请提前设置 Content-Type 为 application/json
        return response.writeWith(Mono.just(response.bufferFactory().wrap(result.getBytes())));
    }
}
```

**关键点**：  
- 默认 Content-Type 为 text/plain  
- 业务异常时需手动设置为 application/json

## 四、Token 生成策略（SaStrategy）

```java
public SaStrategy setCreateToken(SaCreateTokenFunction createToken) {
    this.createToken = createToken;
    return this;
}
```

**默认实现**（匿名内部类）

```java
public SaCreateTokenFunction createToken = (loginId, loginType) -> {
    String style = SaManager.getStpLogic(loginType).getConfigOrGlobal().getTokenStyle();
    switch (style) {
        case SaTokenConsts.TOKEN_STYLE_UUID:
            return UUID.randomUUID().toString();
        case SaTokenConsts.TOKEN_STYLE_SIMPLE_UUID:
            return UUID.randomUUID().toString().replaceAll("-", "");
        case SaTokenConsts.TOKEN_STYLE_RANDOM_32:
            return SaFoxUtil.getRandomString(32);
        case SaTokenConsts.TOKEN_STYLE_RANDOM_64:
            return SaFoxUtil.getRandomString(64);
        case SaTokenConsts.TOKEN_STYLE_RANDOM_128:
            return SaFoxUtil.getRandomString(128);
        case SaTokenConsts.TOKEN_STYLE_TIK:
            return SaFoxUtil.getRandomString(2) + "_" + SaFoxUtil.getRandomString(14) + "_" + SaFoxUtil.getRandomString(16) + "__";
        default:
            SaManager.getLog().warn("无效 tokenStyle：{}，回退使用 uuid", style);
            return UUID.randomUUID().toString();
    }
};
```

## 五、ThreadLocal 上下文实现（Servlet 环境）

```java
public class SaTokenContextForThreadLocal implements SaTokenContext {

    @Override
    public void setContext(SaRequest req, SaResponse res, SaStorage stg) {
        SaTokenContextForThreadLocalStaff.setModelBox(req, res, stg);
    }

    @Override
    public void clearContext() {
        SaTokenContextForThreadLocalStaff.clearModelBox();
    }

    @Override
    public boolean isValid() {
        return SaTokenContextForThreadLocalStaff.getModelBoxOrNull() != null;
    }

    @Override
    public SaTokenContextModelBox getModelBox() {
        return SaTokenContextForThreadLocalStaff.getModelBox();
    }
}
```

**代理工具类**（SaTokenContextForThreadLocalStaff）

```java
class SaTokenContextForThreadLocalStaff {
    private static final ThreadLocal<SaTokenContextModelBox> MODEL_BOX = new ThreadLocal<>();

    static void setModelBox(SaRequest req, SaResponse res, SaStorage stg) {
        MODEL_BOX.set(new SaTokenContextModelBox(req, res, stg));
    }

    static void clearModelBox() {
        MODEL_BOX.remove();
    }

    static SaTokenContextModelBox getModelBox() {
        SaTokenContextModelBox box = MODEL_BOX.get();
        if (box == null) {
            throw new SaTokenContextException("未能获取上下文");
        }
        return box;
    }
}
```

## 六、Redis 自动切换机制

**默认**：内存存储（SaTokenDaoDefaultImpl）  
**引入 sa-token-dao-redis-jackson 后**：自动替换为 SaTokenDaoRedisJackson

**自动配置原理**（简化）


```java

@Configuration

@ConditionalOnClass(RedisTemplate.class)

@ConditionalOnMissingBean(SaTokenDao.class)

public class SaTokenDaoRedisAutoConfiguration {

    @Bean

    public SaTokenDao saTokenDao(RedisTemplate<String, Object> redisTemplate) {

        return new SaTokenDaoRedisJackson(redisTemplate);

    }

}

```


### 自定义 SaTokenDao //> Redis 自动配置 //> 默认内存实现



| 优先级 | 过滤器名称                      | 作用               |

| ------ | ------------------------------- | ------------------ |

| -200   | SaTokenContextFilterForReactor  | 初始化上下文       |

| -100   | SaReactorFilter                 | 权限/角色/登录校验 |

| 较低   | SaFirewallCheckFilterForReactor | 防火墙安全检查     |

| 较低   | SaTokenCorsFilterForReactor     | CORS 跨域处理      |


**设计原则**：  

上下文先行 → 认证先行 → 安全检查 → 跨域处理 → 业务逻辑


## 八、总结核心设计思想


- **空对象模式**：SaTokenContextDefaultImpl 防止 NPE，运行时动态替换  

- **策略模式**：SaStrategy 提供全部扩展点（Token 生成、Session 创建、注解校验等）  

- **上下文适配**：SaTokenContext 实现 WebFlux/Servlet/Solon 多环境无缝切换
- (- **自动装配**：Spring Boot 3 下 Redis 引入即生效，内存 → Redis 无感切换  )

- (- **响应式友好**：SaReactor* 系列类 + Mono<Void/> 写入 + try-finally 上下文清理)

- (Sa-Token 在 Spring Boot 3 + WebFlux 环境下的核心竞争力在于：  )

- (**极简 API + 强大扩展性 + 多环境适配 + 零配置 Redis 切换**)

