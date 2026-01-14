---
title: VitePress Docker 部署与 Nginx 优化指南 
description: 解决 VitePress 部署中的中文乱码、Clean URLs 及自动化脚本配置
---

# VitePress Docker 部署与 Nginx 优化指南 
## 核心配置方案

在 Docker 容器化部署 VitePress 时，需重点解决 **Clean URLs 路由匹配**、**字符集编码**以及**静态资源缓存**。

### 1. Nginx 配置文件 (nginx.conf)

针对 VitePress 的静态站点特性，优化 Gzip 压缩与路由跳转逻辑。


```bash
server {
    listen       80;
    server_name  localhost;

    # 设置 Web 根目录
    root   /app;
    index  index.html;

    # 开启 Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        # 核心：支持 VitePress 的 Clean URLs
        # 依次尝试：直接访问、目录访问、.html 后缀匹配，最后返回 404
        try_files $uri $uri/ $uri.html =404;
    }

    # 静态资源长期缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|otf)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    error_page  404              /404.html;
    error_page  500 502 503 504  /50x.html;
}
```

### 2. Dockerfile 配置

通过设置环境变量解决中文乱码问题，并规范化权限管理。



```Dockerfile
FROM nginx:alpine

# 强制设置容器环境为 UTF-8，防止中文乱码
ENV LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

# 移除 Nginx 默认配置
RUN rm /etc/nginx/conf.d/default.conf

# 复制自定义配置与构建产物
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist /app

# 权限规范化：文件 644，目录 755
RUN chmod -R 644 /app && \
    find /app -type d -exec chmod 755 {} \; && \
    chown -R nginx:nginx /app

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

------

## 自动化运维脚本

### 部署脚本 (run.sh)

用于快速构建镜像并重新拉起容器。


```Bash

#!/bin/bash

IMAGE_NAME="vitepress-app"
CONTAINER_NAME="vitepress-container"

echo "Building Image..."
docker build -t $IMAGE_NAME .

echo "Cleaning up old container..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

echo "Starting Container on port 80..."
docker run -d \
  --name $CONTAINER_NAME \
  -p 80:80 \
  --restart always \
  $IMAGE_NAME

echo "Deployment complete! Visit http://localhost"
```

### 卸载脚本 (remove.sh)

清理容器及镜像资源。



```Bash
#!/bin/bash

CONTAINER_NAME="vitepress-container"
IMAGE_NAME="vitepress-app"

docker stop $CONTAINER_NAME
docker rm $CONTAINER_NAME
docker rmi $IMAGE_NAME

echo "Removed container and image."
```

------

## 注意事项

::: tip 字符集说明

通过在 Dockerfile 中注入 ENV LANG=C.UTF-8，可以有效解决 Nginx 在处理包含中文路径或文件名的静态资源时出现的 404 或乱码问题。

:::

::: warning 目录匹配

若部署后发现样式丢失，请检查 nginx.conf 中的 root 路径是否与 Dockerfile 中的 COPY dist /app 路径完全一致。

:::