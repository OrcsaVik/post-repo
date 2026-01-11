---
title: Linux 内存 / 编译 / 调试 / 文件描述符速记
---
# 一、内存管理

## 1. Swap 文件配置

```bash
#!/bin/bash
# ===========================================
# Swap 文件配置模块
# ===========================================

SWAPFILE=${SWAPFILE:-/swapfile}
SWAPSIZE_GB=${SWAPSIZE_GB:-4}

echo "========== 配置 swap 文件 =========="

# 如果已有 swap 文件，先卸载
if grep -q "$SWAPFILE" /proc/swaps; then
    swapoff $SWAPFILE
    rm -f $SWAPFILE
    sed -i "\\|$SWAPFILE|d" /etc/fstab
fi

# 创建 swap 文件
fallocate -l ${SWAPSIZE_GB}G $SWAPFILE || \
    dd if=/dev/zero of=$SWAPFILE bs=1M count=$((SWAPSIZE_GB*1024))

chmod 600 $SWAPFILE
mkswap $SWAPFILE
swapon $SWAPFILE

# 开机自启
echo "$SWAPFILE swap swap defaults 0 0" >> /etc/fstab

swapon --show
```

------

## 2. ZRAM 配置

```bash
#!/bin/bash
# ===========================================
# zram 配置模块
# ===========================================

ZRAM_DEVICE=/dev/zram0

# 卸载已有 zram swap
if grep -q "$ZRAM_DEVICE" /proc/swaps; then
    swapoff $ZRAM_DEVICE
fi

# 重置 zram
[ -f /sys/block/zram0/reset ] && echo 1 > /sys/block/zram0/reset

# 加载模块
modprobe zram

# 设置 zram 大小 = 物理内存一半
MEM_TOTAL=$(free -b | awk '/Mem:/ {print $2}')
echo $((MEM_TOTAL/2)) > /sys/block/zram0/disksize

mkswap $ZRAM_DEVICE
swapon $ZRAM_DEVICE -p 100

zramctl
```

------

# 二、GDB 调试

```bash
gdb ./test

(gdb) break test.c:8 if i == 1000
(gdb) run
(gdb) print i
(gdb) set variable i = 10000
(gdb) continue
(gdb) quit
```

------

# 三、多文件编译与库

## 1. 头文件

**mysort.h**

```c
#ifndef MYSORT_H
#define MYSORT_H

void select_sort(int *arr, int n);
void bubble_sort(int *arr, int n);
void quick_sort(int *arr, int left, int right);

#endif
```

------

## 2. 静态库构建

```bash
gcc -c -std=c99 select_sort.c
gcc -c -std=c99 bubble_sort.c
gcc -c -std=c99 quick_sort.c

ar rcs libmysort.a select_sort.o bubble_sort.o quick_sort.o
```

------

## 3. 链接主程序

```bash
gcc -std=c99 main.c -L. -lmysort -o sortprog
```

------

# 四、静态库与动态库对比

| 维度       | 静态库     | 动态库     |
| ---------- | ---------- | ---------- |
| 链接时机   | 编译期     | 运行期     |
| 可执行文件 | 大         | 小         |
| 更新       | 需重编     | 无需重编   |
| 内存       | 各自一份   | 共享       |
| 依赖       | 无外部依赖 | 依赖库文件 |

------

# 五、Shell 技巧

## Here-Document

```bash
cat << EOF > src.txt
hhh
EOF
```

------

# 六、文件描述符

## 1. 覆盖写入

```c
open(DEST_FILE, O_WRONLY | O_CREAT | O_TRUNC, 0644);
```

------

## 2. fcntl 复制描述符

- `fcntl(fd, F_DUPFD, startfd)`
- 新旧 fd 指向同一 `struct file`
- 共享偏移量与状态标志

------

# 七、编译阶段说明

```bash
gcc -c rm.c -o rm.o
gcc rm.o -o test
```