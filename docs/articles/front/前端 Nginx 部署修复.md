
title: 前端 Nginx 部署修复
description: 解决 Vue 路由 history 模式下的 Nginx 转发路径错误、Docker 网络解析失效及 Linux Swap 挂载失效等问题。
---
# 前端部署修复与服务器调优实战

本指南针对你在 Docker 部署过程中遇到的 Nginx 代理失效、前端 Axios 路径配置错误以及 Linux 内存调优问题提供完整解决方案。

------

## 🛠️ 一、 前端 Nginx 代理与 Axios 修复

### 1. 核心问题分析

- **DNS 解析失败**：前端代码运行在用户的**浏览器**中。如果你在 Axios 的 `baseURL` 里配置 Docker 容器名（如 `http://study-link:8000`），浏览器无法通过公网解析该私有 DNS。
- **路径重复/丢失**：Nginx 的 `proxy_pass` 结尾是否有 `/` 决定了转发时是否会剥离 `location` 匹配的路径。

### 2. 解决方案：依赖 Nginx 转发

前端 Axios 配置 (request.js)：

取消手动指定的 baseURL，让请求相对于当前页面域名发送。

```nginx
const request = axios.create({
  // 不要在这里写 http://容器名 或 固定的后端 IP
  baseURL: '/', 
  timeout: 10000
})
```

**Nginx 配置文件 (nginx.conf)：**



```nginx
server {
    listen 80;
    root /usr/share/nginx/html;

    # 1. 解决 Vue History 模式刷新 404
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 2. 转发接口请求
    location /api/ {
        # proxy_pass 结尾带 / 代表从原始路径中去掉 /api/ 再转发
        # 如果后端接口本身就需要带 /api/，则建议此处不带结尾斜杠
        proxy_pass http://study-link:8000; 
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

------

