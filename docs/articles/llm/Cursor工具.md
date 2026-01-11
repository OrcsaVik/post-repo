---
title: Claude Code × Cursor UI 工具链速记
---
# 一、定位与对比

## Claude Code

* Agent / MCP 驱动
* 适合 **设计 → 代码** 的结构化流程
* 支持主 Agent + Sub Agent 协作
* 强在 UI 构建、主题、动画多轮迭代

## Cursor

* 编辑器级 AI Copilot
* 强在代码补全、重构、多文件理解
* 更偏工程效率，而非设计生成

**结论**：

* UI / 设计驱动：Claude Code
* 工程 / 重构密集：Cursor

---

# 二、Claude Code 工作流

1. 安装 VS Code 版 Claude Code
2. 初始化项目 UI 目标
3. 启动主 Agent（页面结构 / 架构）
4. 启动 Sub Agent（组件 / 主题 / 动画）
5. 通过 MCP 接入组件与设计数据
6. 多次快速迭代生成模板页面

---

# 三、常用 MCP 与设计工具

## 1. SuperDesign.dev

* IDE 内 AI 设计 Agent
* 并行生成多个 UI 方案
* 自动拆分为前端组件
* 输出 React / Vue 代码

---

## 2. ShadCN MCP

* 为 AI 提供 ShadCN/ui 实时上下文
* 精准组件 props / 用法
* 支持私有组件注册表
* TypeScript 友好

---

## 3. TweakCN

* ShadCN/ui 主题可视化编辑
* 实时预览颜色 / 阴影 / 动画
* 导出 Tailwind 配置
* 支持主题版本管理

---

## 4. FireCrawl MCP

* 面向 AI 的网页抓取服务
* 支持 SPA / JS 渲染页面
* 结构化提取有效内容

---

## 5. Figma MCP

* 直接读取 Figma 设计稿
* 提取图层 / 样式 / 布局
* 生成前端代码
* 支持企业级部署

---

## 6. Magic MCP

* 自然语言生成 UI 组件
* 支持实时预览
* 集成 Cursor / VS Code
* TypeScript & SVGL 支持

---

## 7. Animatopy

* 基于 animate.css 的动画提取工具
* 按需引入动画
* 减少样式体积

---

# 四、前端工程要点

## 禁止自动导入样式

```js
importStyle: false
```

**用途**：

* 手动控制样式引入
* 减少无用 CSS
* 适合 CSS-in-JS 或按需加载

---

# 五、布局与组件

## SVG Symbol 使用

```html
<svg aria-hidden="true" :class="customCss">
  <use :href="symbolId" />
</svg>
```

---

# 六、SSE 流式返回

* 使用 `text/event-stream`
* 服务器 → 客户端单向推送
* 适合 AI 流式输出

## 前端使用

* 通过 `EventSource` 接收数据
* 用于 `sendMessage()` 实时更新 UI

---

# 七、Vue 渲染细节

```vue
<template v-for="(chat, index) in chatList" :key="index">
```

* 使用 `key` 保证 diff 正确
* 支持流式追加渲染

---

# 八、输入区示例

```vue
<div class="absolute bottom-0 left-0 w-full flex flex-col items-center">
  <div class="flex items-end w-full max-w-3xl px-3">
    <textarea
      v-model="message"
      @keydown.enter.prevent="sendMessage"
    />
  </div>
</div>
```
