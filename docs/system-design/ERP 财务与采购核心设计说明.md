# ERP 财务与采购核心设计说明

### ERP 定义与目标

ERP（Enterprise Resource Planning，企业资源计划）是一种 **集成化企业管理系统**，用于统一管理企业内部的核心资源与业务流程。

核心目标聚焦于：

- **信息整合**：打通财务、采购、库存、销售等数据孤岛  
- **流程标准化**：用统一规则替代人工经验  
- **效率提升**：减少重复操作与人工对账  
- **决策支持**：为管理层提供实时、可信的数据基础  

本文聚焦 **采购 + 财务 + 库存** 三个高度耦合的模块设计。

---

## 一、财务收款模型（Finance Receipt）

### 1. 收款单主表设计

```sql
CREATE TABLE `erp_finance_receipt` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '编号',
  `no` varchar(255) NOT NULL COMMENT '收款单号',

  `status` tinyint NOT NULL COMMENT '状态',
  `receipt_time` datetime NOT NULL COMMENT '收款时间',

  `customer_id` bigint NOT NULL COMMENT '客户编号',
  `account_id` bigint NOT NULL COMMENT '收款账户编号',
  `finance_user_id` bigint DEFAULT NULL COMMENT '财务人员编号',

  `total_price` decimal(24,6) NOT NULL COMMENT '应收总额',
  `discount_price` decimal(24,6) NOT NULL COMMENT '优惠金额',
  `receipt_price` decimal(24,6) NOT NULL COMMENT '实收金额',

  `remark` varchar(1024) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`)
) COMMENT='ERP 收款单表';
```

#### 设计要点

- **收款单是财务凭证，不直接绑定具体业务**
- 使用 `account_id` 明确 **资金流入账户**
- `finance_user_id` 作为 **责任人 / 审计主体**
- 金额字段区分：
  - 应收
  - 优惠
  - 实收（避免计算歧义）

------

### 2. 收款明细表（业务拆分）

```sql
CREATE TABLE `erp_finance_receipt_item` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '编号',
  `receipt_id` bigint NOT NULL COMMENT '收款单编号',

  `biz_type` tinyint NOT NULL COMMENT '业务类型',
  `biz_id` bigint NOT NULL COMMENT '业务编号',
  `biz_no` varchar(255) NOT NULL COMMENT '业务单号',

  `total_price` decimal(24,6) NOT NULL COMMENT '应收金额',
  `receipted_price` decimal(24,6) NOT NULL COMMENT '已收金额',
  `receipt_price` decimal(24,6) NOT NULL COMMENT '本次收款',

  `remark` varchar(1024) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`)
) COMMENT='ERP 收款项表';
```

#### 核心设计思想

::: info 设计原则
一张收款单可以覆盖 **多个业务单据**，但资金只走一次账户。
:::

- `biz_type` 用于支持：
  - 销售订单
  - 合同回款
  - 其他应收
- 通过 `receipted_price` 实现 **分期 / 多次收款**
- 该表是 **财务审计的关键表**

------

### 3. 审计与风控建议

::: tip 推荐做法

- `status` 必须通过「制单 → 审核 → 确认」状态流转
- 状态变更需记录操作日志
- 禁止已确认单据反向修改金额
  :::

------

## 二、采购订单模型（Purchase Order）

### 1. 采购订单主表

```sql
CREATE TABLE `erp_purchase_order` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '编号',
  `no` varchar(255) NOT NULL COMMENT '采购单编号',

  `status` tinyint NOT NULL COMMENT '采购状态',
  `order_time` datetime NOT NULL COMMENT '采购时间',

  `supplier_id` bigint NOT NULL COMMENT '供应商编号',
  `account_id` bigint DEFAULT NULL COMMENT '结算账户编号',

  `total_count` decimal(24,6) NOT NULL COMMENT '总数量',
  `total_price` decimal(24,6) NOT NULL COMMENT '总金额',
  `total_product_price` decimal(24,6) NOT NULL COMMENT '产品金额',
  `total_tax_price` decimal(24,6) NOT NULL COMMENT '税额',

  `discount_percent` decimal(24,6) NOT NULL COMMENT '优惠率',
  `discount_price` decimal(24,6) NOT NULL COMMENT '优惠金额',
  `deposit_price` decimal(24,6) NOT NULL COMMENT '定金金额',

  PRIMARY KEY (`id`)
) COMMENT='ERP 采购订单表';
```

#### 采购订单最小要素

- 时间（order_time）
- 供应商（supplier_id）
- 状态（status）
- 金额（价格、税额、优惠）

::: info 重要说明
采购订单 **不直接关心库存**，它只描述商业行为。
:::

------

### 2. 采购订单明细表

```sql
CREATE TABLE `erp_purchase_order_items` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '编号',
  `order_id` bigint NOT NULL COMMENT '采购订单编号',

  `product_id` bigint NOT NULL COMMENT '产品编号',
  `product_unit_id` bigint NOT NULL COMMENT '单位',
  `product_price` decimal(24,6) NOT NULL COMMENT '单价',
  `count` decimal(24,6) NOT NULL COMMENT '数量',
  `total_price` decimal(24,6) NOT NULL COMMENT '总价',

  `tax_percent` decimal(24,6) DEFAULT NULL COMMENT '税率',
  `tax_price` decimal(24,6) DEFAULT NULL COMMENT '税额',

  `in_count` decimal(24,6) NOT NULL DEFAULT 0 COMMENT '已入库数量',
  `return_count` decimal(24,6) NOT NULL DEFAULT 0 COMMENT '退货数量',

  `remark` varchar(1024) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`)
) COMMENT='ERP 采购订单项表';
```

#### 关键业务规则

- `total_price = product_price × count + tax_price`
- `in_count + return_count ≤ count`
- 明细级别记录 **履约进度**

------

## 三、库存模型设计原则

### 1. 采购与库存的边界

::: warning 边界划分
采购订单 ≠ 库存操作
库存变化必须通过 **入库 / 出库单据**
:::

- 采购单不包含 `warehouse_id`
- 仓库信息只存在于库存单据中

------

### 2. 库存事件模型（推荐）

```text
采购订单
   ↓
采购入库单（warehouse_id）
   ↓
库存数量变更
```

库存表应至少具备：

- product_id
- warehouse_id
- quantity
- locked_quantity

------

## 四、整体业务流总结

```text
采购订单 → 入库单 → 库存
采购订单 → 财务应付 → 付款单
销售订单 → 财务应收 → 收款单
```

核心原则：

- **业务单据 ≠ 财务单据**
- **库存必须可追溯**
- **资金必须可审计**

------

## 五、设计结论

- 财务、采购、库存必须 **解耦但可追溯**
- 所有金额变更必须可审计
- 状态驱动，而非字段随意修改
- 账户、仓库、责任人是关键锚点

该模型适用于 **中大型 ERP 系统**，支持复杂业务与长期演进。

