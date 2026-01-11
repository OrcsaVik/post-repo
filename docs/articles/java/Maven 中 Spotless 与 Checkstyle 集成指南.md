---

title: Maven 中 Spotless 与 Checkstyle 集成指南

excerpt: 详解如何在 Maven 项目中集成 Spotless 与 Checkstyle，统一代码风格并避免格式冲突，实现 CI/CD 流水线中的自动化代码质量管控。
---

# Maven 中 Spotless 与 Checkstyle 集成指南

## 一、Spotless 与 Checkstyle 的定位与关系

- **Spotless**：代码格式化工具（自动修复），目标是“让代码看起来统一”。
- **Checkstyle**：代码风格检查工具（只检查、不修复），目标是“发现不符合规范的代码”。

**核心冲突点**  
当两者的 **样式规则配置不一致** 时，会出现“Spotless 格式化后，Checkstyle 仍报错”的情况。  
常见冲突场景：
- Spotless 配置“方法参数换行缩进 8 空格”，Checkstyle 配置“缩进 4 空格”。
- Spotless 未开启行尾空格删除，Checkstyle 开启“禁止行尾空格”。
- Spotless 使用 LF 换行符，Checkstyle 强制 CRLF。

**解决原则**  
**Spotless 先行** → 自动格式化 → **Checkstyle 后验** → 校验格式化结果。

## 二、Maven 生命周期绑定策略

| 插件       | 绑定阶段 | 目标（goal）  | 作用                          | 执行顺序 |
| ---------- | -------- | ------------- | ----------------------------- | -------- |
| Spotless   | validate | apply + check | 自动格式化 + 检查是否已格式化 | 先执行   |
| Checkstyle | verify   | check         | 严格校验格式是否符合规范      | 后执行   |

**推荐流程**  
1. validate 阶段：Spotless apply（强制格式化）  
2. validate 阶段：Spotless check（验证格式化结果）  
3. verify 阶段：Checkstyle check（最终质量门）

## 三、完整 pom.xml 配置（推荐）

```xml
<build>
    <plugins>
        <!-- 1. Spotless：自动格式化 + 版权头 -->
        <plugin>
            <groupId>com.diffplug.spotless</groupId>
            <artifactId>spotless-maven-plugin</artifactId>
            <version>${spotless.version}</version> <!-- 推荐 2.40.0+ -->
            <executions>
                <execution>
                    <phase>validate</phase>
                    <goals>
                        <goal>apply</goal>  <!-- 自动格式化 -->
                        <goal>check</goal>  <!-- 检查是否符合格式 -->
                    </goals>
                </execution>
            </executions>
            <configuration>
                <java>
                    <!-- Eclipse 格式化规则（必须与 Checkstyle 保持一致） -->
                    <eclipse>
                        <file>${project.basedir}/config/spotless/eclipse-formatter.xml</file>
                    </eclipse>
                    <!-- 统一换行符为 LF（Linux 标准） -->
                    <lineEndings>LF</lineEndings>
                    <!-- 删除行尾空格 -->
                    <trimTrailingWhitespace/>
                    <!-- 移除多余导入 -->
                    <removeUnusedImports/>
                    <!-- 格式化 Java 代码 -->
                    <googleJavaFormat/>
                </java>
                <!-- 自动添加版权头 -->
                <licenseHeader>
                    <file>${project.basedir}/config/spotless/copyright.txt</file>
                </licenseHeader>
            </configuration>
        </plugin>

        <!-- 2. Checkstyle：严格校验 -->
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-checkstyle-plugin</artifactId>
            <version>${checkstyle.version}</version> <!-- 推荐 3.2.1+ -->
            <executions>
                <execution>
                    <phase>verify</phase>
                    <goals>
                        <goal>check</goal>
                    </goals>
                </execution>
            </executions>
            <configuration>
                <!-- 使用 Eclipse 官方规范 -->
                <configLocation>${project.basedir}/config/checkstyle/checkstyle.xml</configLocation>
                <encoding>UTF-8</encoding>
                <failOnViolation>true</failOnViolation>
                <linkXRef>false</linkXRef>
            </configuration>
        </plugin>
    </plugins>
</build>
```

## 四、配置文件说明

### 4.1 Eclipse 格式化规则（eclipse-formatter.xml）

- **导出方式**：Eclipse → Window → Preferences → Java → Code Style → Formatter → Export
- **关键配置建议**：
  - 缩进：4 个空格
  - 换行符：LF
  - 行长度：120
  - 左大括号位置：同行
  - 导入排序：静态导入在前，* 通配符最后

### 4.2 Checkstyle 配置（checkstyle.xml）

推荐使用 Eclipse 官方预设规则（Google/Eclipse 风格）：
```xml
<module name="Checker">
    <module name="TreeWalker">
        <!-- 缩进检查，与 Spotless 保持一致 -->
        <module name="Indentation">
            <property name="basicOffset" value="4"/>
        </module>
        <!-- 行长度 -->
        <module name="LineLength">
            <property name="max" value="120"/>
        </module>
        <!-- 禁止行尾空格 -->
        <module name="RegexpSingleline">
            <property name="format" value="\s+$"/>
            <property name="message" value="行尾存在空格"/>
        </module>
    </module>
    <!-- 文件必须以 LF 换行符结束 -->
    <module name="NewlineAtEndOfFile"/>
</module>
```

## 五、常见问题与解决方案

| 问题                                | 原因                       | 解决方案                              |
| ----------------------------------- | -------------------------- | ------------------------------------- |
| Spotless 格式化后 Checkstyle 仍报错 | 规则不一致                 | 统一使用同一份 Eclipse 格式化配置文件 |
| 构建失败：文件未格式化              | 开发者本地未格式化提交     | 强制在 validate 阶段 apply            |
| 行尾空格/换行符不一致               | Windows/Linux 开发环境差异 | 强制 LF + trimTrailingWhitespace      |
| 版权头重复添加                      | 格式化器未识别已有版权头   | 配置 licenseHeader 的匹配正则         |

## 六、CI/CD 集成建议（GitHub Actions 示例）

```yaml
name: Maven CI with Spotless & Checkstyle

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 11
        uses: actions/setup-java@v4
        with:
          java-version: '11'
          distribution: 'temurin'
      - name: Cache Maven packages
        uses: actions/cache@v4
        with:
          path: ~/.m2
          key: ${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}
          restore-keys: ${{ runner.os }}-m2
      - name: Build with Maven
        run: mvn clean verify --file pom.xml
```

**效果**  
- 提交代码 → 自动格式化（Spotless apply）  
- 格式不符合规范 → 构建失败（Spotless check / Checkstyle check）  
- 强制团队代码风格一致性

## 七、总结最佳实践

1. **规则统一**：Spotless 和 Checkstyle 共用同一份 Eclipse 格式化配置文件  
2. **生命周期分离**：Spotless 绑定 validate（修复+检查），Checkstyle 绑定 verify（最终把关）  
3. **强制执行**：apply + check 组合，确保提交前已格式化  
4. **版权头管理**：统一 licenseHeader，自动添加  
5. **CI 门禁**：构建失败即阻断合并

通过以上配置，可实现 **“提交即格式化、格式化即合规”** 的自动化代码质量管控闭环。
```
