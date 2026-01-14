---
title: 
description: 涵盖切比雪夫距离、快慢指针、博耶-摩尔投票、Integer 引用比较等核心算法技巧
---

# 算法思路解析 -Likouikou


## 1. 几何距离：切比雪夫距离 (Chebyshev Distance)

在平面网格中，允许八个方向移动（包含对角线）时，两点间的最短距离即为横纵坐标差值的 **最大值**。

::: tip 核心逻辑
不需要复杂的 `while` 循环判断，直接利用 `Math.max` 实现。
:::

```java
// 计算两点 (pre, cur) 之间的最小移动步数
int x = Math.abs(pre[0] - cur[0]);
int y = Math.abs(pre[1] - cur[1]);

// 核心公式：步数 = max(|x1-x2|, |y1-y2|)
count += Math.max(x, y);
```

------

## 2. 链表技巧：快慢指针判定奇偶

快慢指针（Fast & Slow Pointers）是处理链表中点的经典方案。通过判断 `fast` 停止的位置可识别链表长度的奇偶性。



```Java
// fast 每次走 2 步，slow 每次走 1 步
while (fast != null && fast.next != null) {
    slow = slow.next;
    fast = fast.next.next;
}

// 判定逻辑
if (fast != null) { 
    // fast 不为 null 说明停止在最后一个节点 -> 链表长度为奇数
    // 此时 slow 正处于精确中点，若要处理后半部分需跳过：
    slow = slow.next;
}
```

------

## 3. 数组统计：博耶-摩尔投票算法 (Boyer-Moore Voting)

用于寻找数组中的多数元素（出现次数超过一半）。

::: danger 语法陷阱

严禁使用 vote = (nums[i] == cur) ? ++vote : --vote;

这种写法在 Java 中由于自增赋值的原子性问题会导致逻辑错误。

:::



```Java
int vote = 1;
int cur = nums[0];

for (int i = 1; i < nums.length; i++) {
    if (vote == 0) {
        cur = nums[i];
    }
    // 推荐写法：清晰且逻辑严密
    vote += (nums[i] == cur) ? 1 : -1;
}
return cur;
```

------

## 4. Java 工程避坑：Integer 对象比较

Java 对 `Integer` 对象的缓存范围仅为 `[-128, 127]`。超出此范围，`==` 比较的是 **内存地址**。



```Java
// ❌ 错误示范：在处理栈顶元素时可能失效
if (minStack.peek() == top) { ... } 

// ✅ 正确方式 1：使用 .equals()
if (minStack.peek().equals(top)) { ... }

// ✅ 正确方式 2：显式拆箱
if (minStack.peek().intValue() == top) { ... }
```

------

## 5. 动态规划：最大乘积子数组 (Max Product Subarray)

由于负数的存在，最大乘积可能由“之前的最小值 × 当前负数”得到。除了 DP，**左右双向遍历** 是更直观的解法。



```Java
public int maxProduct(int[] nums) {
    int max = nums[0];
    int product = 1;
    int n = nums.length;

    // 正向遍历：处理以正数结尾或零断开的情况
    for (int i = 0; i < n; i++) {
        product *= nums[i];
        max = Math.max(max, product);
        if (nums[i] == 0) product = 1;
    }

    // 反向遍历：处理末尾负数抵消的情况
    product = 1;
    for (int i = n - 1; i >= 0; i--) {
        product *= nums[i];
        max = Math.max(max, product);
        if (nums[i] == 0) product = 1;
    }
    return max;
}
```

------

## 6. 排序进阶：链表转集合排序

当链表操作过于复杂（如堆排序在链表上实现困难）时，可采用 **空间换时间** 的策略。

::: details 排序实现细节

1. 遍历链表将所有 `ListNode` 存入 `List`。

2. 使用 `Collections.sort`（底层为 TimSort，结合了归并与插入排序）。

3. 注意：排序后需要手动重新串联 next 指针，否则链表结构是断开的。

   :::


```Java
list.sort((a, b) -> Integer.compare(a.val, b.val));

// 串联节点（重要步骤）
for (int i = 0; i < list.size() - 1; i++) {
    list.get(i).next = list.get(i + 1);
}
list.get(list.size() - 1).next = null; // 封底
return list.get(0);
Would you like me to elaborate on the **Dynamic Programming** approach for the Max Product Subarray to see how it handles negative numbers in a single pass?
```