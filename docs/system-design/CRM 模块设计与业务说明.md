
# CRM 模块设计与业务说明


## 一、整体背景

CRM（Customer Relationship Management）用于管理：

- 客户（Customer）
- 联系人（Contact）
- 合同（Contract）
- 商机（Business / Opportunity）
- 线索（Clue / Lead）
- 跟进记录（Follow-up Record）

当前设计基于：

- **CPM / 自动流处理**
- **以客户为中心的数据模型**
- **负责人 + 部门权限控制**

------

## 二、合同与回款（Contract & Payment）

### 1. 合同关联关系

合同与客户、回款之间的基础字段：

- `customer_id`
  - 客户编号
  - 对应表：`crm_customer.id`
  - **必填**
- `contract_id`
  - 合同编号
  - 对应表：`crm_contract.id`
  - **必填**

该设计确保：

- 所有合同必须归属某一客户
- 回款数据可直接追溯到具体合同与客户

------

## 三、客户关系规则（Customer Ownership Rules）

### 1. 规则字段说明

#### （1）规则类型 `type`

- `1`：拥有客户数限制
- `2`：锁定客户数限制

目的：

- 防止单一人员拥有过多客户
- 防止锁定资源过度集中

------

#### （2）适用范围

- `user_ids`：规则适用的用户
- `dept_ids`：规则适用的部门

支持：

- 按人限制
- 按部门限制
- 人 + 部门组合

------

#### （3）数量上限

- `max_count`
  - 最大允许拥有 / 锁定的客户数量

------

#### （4）成交客户占用规则

- `deal_count_enabled`
  - 当 `type = 1` 时生效
  - 表示 **成交客户是否仍占用“拥有客户数”**

设计目的：

- 防止负责人累积大量已成交客户，影响客户分配公平性

------

## 四、联系人模块（Contact）

联系人模块由：

- 后端模块：`yudao-module-crm-biz`
- 包路径：`contact`

### 1. 核心能力

- 联系人基础信息维护
- 与客户、合同、商机的关联

------

### 2. 联系人可见性与权限

#### （1）锁定客户场景

- 当客户被某负责人 **锁定** 时：
  - 可查看该客户下 **所有联系人**

------

#### （2）联系人等级划分

- 联系人支持等级标识
- 示例：A / B / C 或 自定义等级

------

#### （3）基于等级的查看权限

- 联系人查看权限 =
  - 客户负责人
  - - 联系人等级规则

控制能力：

- 是否可查看指定用户的联系人列表
- 是否仅允许查看指定等级联系人

------

## 五、商机模块（Business / Opportunity）

### 1. 商机与产品关联

```sql
CREATE TABLE `crm_business_product` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `business_id` bigint NOT NULL COMMENT '商机编号',
  `product_id` bigint NOT NULL COMMENT '产品编号',
  `product_price` decimal(24,6) NOT NULL COMMENT '产品单价',
  `business_price` decimal(24,6) NOT NULL COMMENT '商机价格',
  `count` decimal(24,6) NOT NULL COMMENT '数量',
  `total_price` decimal(24,6) NOT NULL COMMENT '总计价格'
);
```

说明：

- 商机可关联多个产品
- 商机金额可独立于产品单价进行调整

------

### 2. 商机状态组（按部门）

```sql
CREATE TABLE `crm_business_status_type` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` varchar(100) NOT NULL COMMENT '状态组名',
  `dept_ids` varchar(255) NOT NULL COMMENT '使用的部门编号'
);
```

设计要点：

- 不同部门可使用不同的商机流程
- 状态组与部门绑定，实现流程隔离

------

### 3. 商机状态与赢单率

```sql
CREATE TABLE `crm_business_status` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `type_id` bigint NOT NULL COMMENT '状态类型编号',
  `name` varchar(100) NOT NULL COMMENT '状态类型名',
  `percent` decimal(24,6) NOT NULL COMMENT '赢单率',
  `sort` int NOT NULL DEFAULT '1' COMMENT '排序'
);
```

说明：

- `percent` 表示当前状态下的成交概率
- 可用于：
  - 销售预测
  - 订单金额加权计算

------

## 六、跟进记录模块（Follow-up Record）

```sql
CREATE TABLE `crm_follow_up_record` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '编号',
  `biz_type` int DEFAULT NULL COMMENT '数据类型',
  `biz_id` bigint DEFAULT NULL COMMENT '数据编号',
  `next_time` datetime DEFAULT NULL COMMENT '下次联系时间'
);
```

### 1. 设计说明

- `biz_type`：区分关联对象类型
  - 客户 / 联系人 / 商机 / 合同 / 线索
- `biz_id`：具体对象 ID

------

### 2. 业务约定

- 各业务模块：
  - **只展示最新一条跟进记录**
  - 历史记录进入明细页查看

------

## 七、线索模块（Clue / Lead）

### 1. 线索定义

CRM 线索是指：

- 尚未确认成交可能的原始信息
- 来源包括：
  - 活动
  - 电话咨询
  - 广告投放
  - 老客户介绍
  - 外部数据购买

------

### 2. 线索转化路径

```text
线索 → 客户 → 商机 → 合同 → 回款
```

转化条件：

- 客户表达购买意向
- 留下有效联系方式

------

### 3. 模块实现

- 后端模块：`yudao-module-crm-biz`
- 包路径：`clue`
- 仅包含线索相关功能

------

### 4. 线索负责人转移

- 支持修改线索负责人
- 转移后：
  - 原负责人失去编辑权
  - 新负责人继承跟进权

------

## 八、通用页面结构说明

客户 / 联系人 / 合同 / 商机 / 线索 详情页统一结构：

- 基本信息
- 关联信息
- 操作按钮

设计收益：

- 降低学习成本
- 提升跨模块一致性

------

- 
