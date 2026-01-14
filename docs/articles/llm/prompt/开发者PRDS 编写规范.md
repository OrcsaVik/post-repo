---

title: 开发者PRDS 编写规范
description: 针对工程实现进行优化的 PRD 结构化模板，强调数据映射、状态逻辑与交付边界。
---

# 开发者 PRD：工程化架构规范 (Path B 专用)

这份文档是为 **开发者路径** 量身定制的 PRD 核心框架。它的核心逻辑不是描述“愿景”，而是通过**结构化输入**定义**系统边界、数据流与逻辑约束**。

------

## 🏗️ 1. 核心模型：从业务到工程的映射

开发者 PRD 必须将用户的口语化描述转化为工程语言。

### 1.1 执行摘要与成功准则

- **愿景 (Vision)**：解决什么核心逻辑矛盾。
- **北极星指标 (North Star Metric)**：衡量系统有效性的单一核心数据点。

### 1.2 问题定义与影响分析

- **用户影响**：量化痛点（如：减少 50% 的手动录入时间）。
- **核心优势**：与现有方案（Current Solutions）的技术性对比。

------

## 🧬 2. 深度需求解构

这是连接 PRD 与 **Part III 技术设计** 的骨架。

### 2.1 用户故事 (User Stories) 与 验收标准 (AC)

每个 Epic 下的 Story 必须具备可测试性。

- **格式**：`As a [user type], I want to [action] so that [benefit]`
- **AC (验收标准)**：定义**正常流**与**异常流**。例如：`如果 API 返回 429 (Rate Limit)，系统应在前端展示重试提示。`

### 2.2 功能性需求 (P0 - MVP 核心)

::: info 核心功能定义

每个 P0 功能必须包含：

- **用户价值**：解决什么问题。

- **业务价值**：对系统链路的贡献。

- 技术依赖：实现此功能所需的前置模块或第三方 API。

  :::

### 2.3 状态转换与信息架构 (IA)

定义核心实体的生命周期。

- **IA (信息架构)**：树状结构的层级（Landing -> Auth -> Dashboard -> Feature Area）。
- **状态机**：明确定义状态转换触发器。

------

## ⚡ 3. 非功能性需求 (NFRs)

这是开发者最关注的**性能与安全基准**。

| **类别**   | **核心标准 (Metrics)**            | **备注**         |
| ---------- | --------------------------------- | ---------------- |
| **性能**   | Page Load < 2s (P95), API < 200ms | 确保高响应速度   |
| **安全**   | RBAC/ACL 鉴权, 数据加密存储       | 符合安全审计标准 |
| **可用性** | 99.9% Uptime, 跨浏览器支持        | 保证系统稳定性   |
| **扩展性** | 10x 增长支持                      | 预留未来扩展接口 |

------

## 🛡️ 4. 交付边界与风险评估

明确定义“不做什么”与“什么可能导致失败”。

- **Out of Scope**：明确 P1/P2 功能，防止需求蠕变（Scope Creep）。
- **风险评估**：识别技术风险（如第三方 SDK 兼容性）与执行风险。

------

## ✅ 5. MVP 完成定义 (Definition of Done)

项目进入 Part III (TDD) 的前置条件：

- [ ] 所有 P0 逻辑闭环，无歧义。
- [ ] 核心数据 Schema 雏形已确定。
- [ ] 异常处理逻辑（Error Handling）已覆盖 P0 路径。

------





## the LLM prompt for tranfor PRDS docx


Below is the optimized **Technical Prompt** for generating an engineering-grade PRD. This prompt is structured to guide an AI to act as a Senior Technical Product Manager, focusing on the specific schema and structural requirements you provided.


```Markdown
# Role: Senior Technical Product Manager & Systems Architect

## Task
Transform raw project notes into a structured **Developer-Centric Product Requirements Document (PRD)**. Focus on technical mapping, logical boundaries, and the "Definition of Done."

## Output Requirements
- **Format**: Strictly Markdown (.md).
- **Style**: Engineering-grade, precise, and objective. 
- **Structure**: Follow the hierarchy below (H2/H3).
- **VitePress Ready**: Use Frontmatter and Custom Containers (`::: info`, `::: tip`, `::: danger`).

---

## PRD Structure Template

### 1. Frontmatter
```yaml
---
title: "PRD: [App Name] MVP"
description: "Core technical requirements and system boundaries for [App Name] v1.0"
---

### 2. Executive Summary

- **Product Vision**: Core purpose and logic.
- **Success Criteria**: Define 1-2 North Star metrics (e.g., Latency, User Activation).

### 3. Problem & Impact Analysis

- **Problem Definition**: Market context and technical friction.
- **Impact Analysis**: Quantify User, Market, and Business impact.

### 4. Target Audience & JTBD

- **Primary Persona**: Demographics and Psychographics.
- **Jobs To Be Done (JTBD)**: Functional, Emotional, and Social.
- **Competitor Gap**: A table comparing Current Solutions vs. Our Advantage.

### 5. User Stories & Acceptance Criteria (AC)

- **Epic**: [Core Logic Area]
- **Stories**: `As a [role], I want to [action] so that [benefit]`.
- **AC**: Must include Happy Path and Error States.

### 6. Functional Requirements (MoSCoW)

- **Must Have (P0)**: Essential for launch. Include:
  - Feature Name
  - User/Business Value
  - Technical Dependencies
  - Estimated Effort (T-shirt sizing)
- **Should/Could Have (P1/P2)**: Non-critical features.
- **Out of Scope**: Explicitly list what will NOT be built.

### 7. Non-Functional Requirements (NFRs)

- **Performance**: p95 Page Load < 2s, API < 200ms.
- **Security**: Auth (JWT/OAuth), Authorization (RBAC), Data Protection.
- **Scalability**: Support 10x growth.
- **Compatibility**: Browser support, Mobile Responsiveness.

### 8. UI/UX & Information Architecture

- **Design Principles**: 3 core rules.
- **Information Architecture**: Tree structure of site/app navigation.
- **Core User Flow**: Technical logic flow for primary tasks.

### 9. Risk Assessment & DoD

- **Risk Matrix**: Technical vs. Execution risks.
- **Definition of Done (DoD)**: Checklist for engineering handoff.

------

## Input Processing Rules

1. **Identify the Core Tech Stack**: If mentioned, map features to specific stack constraints.
2. **Logic Extraction**: Turn vague descriptions into specific Acceptance Criteria.
3. **No Fluff**: Eliminate marketing adjectives.
```
