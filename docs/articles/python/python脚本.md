---

title: Python脚本
---

云服务器是否支持重新配置操作系统





中国 (香港) 选择靠近您客户的地域可提高网络访问速度。非中国内地地域（如中国香港、新加坡等）提供国际带宽，如您在中国内地使用，会有较大的网络延迟。教我选择？



国外服务器代理





[学生用券中心-阿里云云工开物 (aliyun.com)](https://university.aliyun.com/buycenter/?spm=5176.28623341.J_dE6iKTQZWCaqh5bpcaeTX.2.505a3180Px5B6f)



```
阿里云轻量应用服务器支持 Docker 技术。
用户可以通过两种方式在轻量应用服务器上部署 Docker：一种是在创建服务器时，选择 Docker 应用镜像，这样在服务器创建完成后，
```





端口映射技术



1. 有两种常见方式：
   - 方式 1：给宿主机（轻量服务器）绑定多个弹性公网 IP（EIP），再通过 “网桥（Bridge）” 将 EIP 分别分配给每个 VM，让 VM 直接拥有独立外网 IP；
   - 方式 2：宿主机只保留 1 个外网 IP，通过 “端口映射”（如 iptables 配置）将不同端口转发到不同 VM（比如宿主机 8081 端口→vm1 的 80 端口，8082 端口→vm2 的 80 端口）。
2. **配置负载均衡**
   - 若用方式 1（VM 有独立外网 IP）：可在云厂商控制台创建 “负载均衡器”（如阿里云 SLB），将多个 VM 的外网 IP 作为 “后端服务器”，配置转发规则（如 HTTP/HTTPS），实现流量分发；
   - 若用方式 2（端口映射）：可在宿主机上安装 Nginx，通过 Nginx 的反向代理功能，将用户请求转发到不同 VM（比如根据 URL 路径或域名分发）。





### 二、Linux 下二次虚拟化的常规操作逻辑（以 KVM 为例）

如果服务器支持二次虚拟化（如部分 ECS），在 Linux 系统中操作流程大致是这样的：







vCPU2 核

内存2 GB

ESSD40 GB

限峰值带宽200 Mbps

公网线路类型BGP

固定公网地址1 IPv4



个人云电脑





[无影云电脑：在最破的电脑上玩最顶配的游戏 - 哔哩哔哩 (bilibili.com)](https://www.bilibili.com/opus/975310605371047945)





### 一、核心配置与每小时核时消耗推算

文档明确 “核时 = CPU 核心数 × 使用小时数”，结合剩余 7791 核时可使用的时长，反向算出两种模式的 **每小时核时消耗**，进而对应到配置：

| 运行模式 | 剩余核时（7791 核时）可使用时长 | 每小时核时消耗（计算逻辑）            | 对应配置（文档明确）               |
| -------- | ------------------------------- | ------------------------------------- | ---------------------------------- |
| 经济模式 | 1950 小时                       | 7791 核时 ÷ 1950 小时 ≈ 4 核时 / 小时 | 4 核 CPU + 8GiB 内存               |
| 电竞模式 | 130 小时                        | 7791 核时 ÷ 130 小时 ≈ 60 核时 / 小时 | 12 核 CPU + 46GiB 内存 + 11GiB GPU |

- 关键验证：文档后续直接说明 “电竞模式费率 60 核时 / 小时”“经济模式费率 4 核时 / 小时”，与推算结果完全一致，配置信息也匹配文档中 “切换模式” 的参数说明。





已安装对应云服务器电脑模式





仍然使用购买对应服务





8.138.163.189



passwwd

Rootlinhaixin@



网络配置情况

### 一、`ifconfig eth0` 输出解析（网络接口运行状态）

`ifconfig` 主要显示网卡的**IP 配置、数据收发统计**等运行时信息，`eth0` 是服务器的主网卡（阿里云 ECS 通常默认用此命名）：

| 字段                             | 含义解析                                                     |
| -------------------------------- | ------------------------------------------------------------ |
| `eth0: flags=4163<...>`          | 网卡状态标志：`UP`：网卡已启用；`BROADCAST`：支持广播；`RUNNING`：网卡正在运行（物理链路已连接）；`MULTICAST`：支持多播。 |
| `mtu 1500`                       | 最大传输单元（Maximum Transmission Unit），默认 1500 字节（以太网标准，无需修改），表示单次发送的数据包最大尺寸。 |
| `inet 172.18.37.225`             | 网卡的 IPv4 地址（内网 IP，阿里云 ECS 的私网地址，用于同一地域内的云资源通信）。 |
| `netmask 255.255.192.0`          | 子网掩码，与 IP 地址配合划分网段，此处表示该 IP 属于 `172.18.0.0/18` 网段（计算：255.255.192.0 对应前缀长度 18）。 |
| `broadcast 172.18.63.255`        | 广播地址，该网段内的广播数据包会发送到这个地址（供网段内所有设备接收）。 |
| `inet6 fe80::216:3eff:fe08:ff18` | 网卡的 IPv6 地址（本地链路地址，仅用于同一物理链路内的 IPv6 通信，不联网）。 |
| `prefixlen 64`                   | IPv6 前缀长度（类似 IPv4 的子网掩码，64 是常见值）。         |
| `scopeid 0x20<link>`             | IPv6 地址的作用域：`link` 表示仅在当前链路（本地网络）有效。 |
| `ether 00:16:3e:08:ff:18`        | 网卡的 MAC 地址（物理地址，全球唯一，阿里云 ECS 的 MAC 由厂商分配）。 |
| `txqueuelen 1000`                | 发送队列长度（1000 个数据包），超过此长度的数据包会被缓存或丢弃，避免网卡过载。 |
| `(Ethernet)`                     | 网卡类型为以太网（阿里云 ECS 默认使用以太网接口）。          |
| **数据收发统计（RX/TX）**        |                                                              |
| `RX packets 4350`                | 接收的数据包总数：4350 个。                                  |
| `bytes 2150125 (2.0 MiB)`        | 接收的总字节数：约 2.0 MiB。                                 |
| `RX errors 0`                    | 接收错误数：0（无错误，正常）。                              |
| `dropped 0`                      | 接收时丢弃的数据包数：0（无丢弃，网络稳定）。                |
| `overruns 0`                     | 接收缓冲区溢出数：0（缓冲区足够，未因繁忙丢失数据）。        |
| `frame 0`                        | 接收帧错误数：0（物理层无帧格式错误）。                      |
| `TX packets 3375`                | 发送的数据包总数：3375 个。                                  |
| `bytes 1072144 (1.0 MiB)`        | 发送的总字节数：约 1.0 MiB。                                 |
| `TX errors 0` 等                 | 发送相关错误数均为 0（发送正常，无故障）。                   |
| `collisions 0`                   | 发送冲突数：0（以太网中多设备同时发送导致的冲突，0 表示网络无拥堵） |





`mirrors.cloud.aliyuncs.com` 是阿里云**专属内部源**，仅对阿里云服务器（ECS、轻量应用服务器等）开放访问权限；非阿里云服务器（如腾讯云、华为云、自建服务器）访问该源时会被限制，导致 Docker 安装包下载失败或速度极慢。



```
version: '3.8'

services:
  # =======================
  # MySQL 数据库
  # =======================
  db:
    image: mysql:8.0
    container_name: wordpress_db
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wpuser
      MYSQL_PASSWORD: wppass
    ports:
      - "3306:3306"
    volumes:
      - ./mysql:/var/lib/mysql
    command: --default-authentication-plugin=mysql_native_password

  # =======================
  # WordPress 应用（PHP-FPM）
  # =======================
  wordpress:
    image: wordpress:fpm-alpine
    container_name: wordpress_app
    restart: always
    environment:
      WORDPRESS_DB_HOST: db:3306
      WORDPRESS_DB_USER: wpuser
      WORDPRESS_DB_PASSWORD: wppass
      WORDPRESS_DB_NAME: wordpress
    volumes:
      - ./wordpress:/var/www/html
    depends_on:
      - db

  # =======================
  # Nginx 反向代理
  # =======================
  nginx:
    image: nginx:alpine
    container_name: wordpress_nginx
    restart: always
    ports:
      - "80:80"
    volumes:
      - ./wordpress:/var/www/html
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - wordpress

networks:
  default:
    name: wordpress_network

```



wordpress -pass

6Rul5Vv*uvp4vtCD54M$@hNC



添加nginx进行辅助



静态缓存资源





静态css

```
/*网站字体*/
/*原则上你可以设置多个字体，然后在不同的部位使用不同的字体。*/
@font-face{
    font-family:echo;
src:url(https://fastly.jsdelivr.net/gh/huangwb8/bloghelper@latest/fonts/13.woff2) format('woff2')
}
 
body{
		font-family: 'echo', Georgia, -apple-system, 'Nimbus Roman No9 L', 'PingFang SC', 'Hiragino Sans GB', 'Noto Serif SC', 'Microsoft Yahei', 'WenQuanYi Micro Hei', 'ST Heiti', sans-serif
}
 
/*横幅字体大小*/
.banner-title {
  font-size: 2.5em;
}
.banner-subtitle{
  font-size: 28px;
	
	-webkit-text-fill-color: transparent;        
background: linear-gradient(94.75deg,rgb(60, 172, 247) 0%,rgb(131, 101, 253) 43.66%,                rgb(255, 141, 112) 64.23%,rgb(247, 201, 102) 83.76%,rgb(172, 143, 100) 100%);        
-webkit-background-clip: text;
}
 
/*文章标题字体大小*/
.post-title {
    font-size: 25px
}
 
/*正文字体大小（不包含代码）*/
.post-content p{
    font-size: 1.25rem;
}
li{
    font-size: 1.2rem;
	
}
 
/*评论区字体大小*/
p {
    font-size: 1.2rem
			
}
 
/*评论发送区字体大小*/
.form-control{
    font-size: 1.2rem
}
 
/*评论勾选项目字体大小*/
.custom-checkbox .custom-control-input~.custom-control-label{
    font-size: 1.2rem
}
/*评论区代码的强调色*/
code {
  color: rgba(var(--themecolor-rgbstr));
}
 
/*说说字体大小和颜色设置*/
.shuoshuo-title {
    font-size: 25px;
/*  color: rgba(var(--themecolor-rgbstr)); */
}
 
/*尾注字体大小*/
.additional-content-after-post{
    font-size: 1.2rem
}
 
/* 公告居中 */
.leftbar-announcement-title {
    font-size: 20px;
/*     text-align: center; */
 				color: #00FFFF
}
 
.leftbar-announcement-content {
    font-size: 15px;
    line-height: 1.8;
    padding-top: 8px;
    opacity: 0.8;
/*     text-align: center; */
			color:#00FFFF;
}
 
/* 一言居中 */
.leftbar-banner-title {
    font-size: 20px;
    display: block;
    text-align: center;
		opacity: 0.8;
}
 
/* 个性签名居中 */
.leftbar-banner-subtitle {
    margin-top: 15px;
    margin-bottom: 8px;
    font-size: 13px;
    opacity: 0.8;
    display: block;
    text-align: center;
}
 
/*========颜色设置===========*/
 
/*文章或页面的正文颜色*/
body{
    color:#364863
}
 
/*引文属性设置*/
blockquote {
    /*添加弱主题色为背景色*/
    background: rgba(var(--themecolor-rgbstr), 0.1) !important;
    width: 100%
}
 
/*引文颜色 建议用主题色*/
:root {
    /*也可以用类似于--color-border-on-foreground-deeper: #009688;这样的命令*/
    --color-border-on-foreground-deeper: rgba(var(--themecolor-rgbstr));
}
 
/*左侧菜单栏突出颜色修改*/
.leftbar-menu-item > a:hover, .leftbar-menu-item.current > a{
    background-color: #f9f9f980;
}
 
/*站点概览分隔线颜色修改*/
.site-state-item{
    border-left: 1px solid #aaa;
}
.site-friend-links-title {
    border-top: 1px dotted #aaa;
}
#leftbar_tab_tools ul li {
    padding-top: 3px;
    padding-bottom: 3px;
    border-bottom:none;
}
html.darkmode #leftbar_tab_tools ul li {
    border-bottom:none;
}
 
/*左侧栏搜索框的颜色*/
button#leftbar_search_container {
    background-color: transparent;
}
 
/*========透明设置===========*/
 
/*白天卡片背景透明*/
.card{
    background-color:rgba(255, 255, 255, 0.8) !important;
    /*backdrop-filter:blur(6px);*//*毛玻璃效果主要属性*/
    -webkit-backdrop-filter:blur(6px);
}
 
/*小工具栏背景完全透明*/
/*小工具栏是card的子元素，如果用同一个透明度会叠加变色，故改为完全透明*/
.card .widget,.darkmode .card .widget,#post_content > div > div > div.argon-timeline-card.card.bg-gradient-secondary.archive-timeline-title{
    background-color:#ffffff00 !important;
    backdrop-filter:none;
    -webkit-backdrop-filter:none;
}
.emotion-keyboard,#fabtn_blog_settings_popup{
    background-color:rgba(255, 255, 255, 0.95) !important;
}
 
/*分类卡片透明*/
.bg-gradient-secondary{
    background:rgba(255, 255, 255, 0.1) !important;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter:blur(10px);
}
 
/*夜间透明*/
html.darkmode.bg-white,html.darkmode .card,html.darkmode #footer{
    background:rgba(66, 66, 66, 0.9) !important;
}
html.darkmode #fabtn_blog_settings_popup{
    background:rgba(66, 66, 66, 0.95) !important;
}
 
/*标签背景
.post-meta-detail-tag {
    background:rgba(255, 255, 255, 0.5)!important;
}*/
 
 
/*========排版设置===========*/
 
/*左侧栏层级置于上层*/
#leftbar_part1 {
    z-index: 1;
}
 
/*分类卡片文本居中*/
#content > div.page-information-card-container > div > div{
    text-align:center;
}
 
/*子菜单对齐及样式调整*/
.dropdown-menu .dropdown-item>i{
    width: 10px;
}
.dropdown-menu>a {
    color:var(--themecolor);
}
.dropdown-menu{
    min-width:max-content;
}
.dropdown-menu .dropdown-item {
    padding: .5rem 1.5rem 0.5rem 1rem;
}
.leftbar-menu-subitem{
    min-width:max-content;
}
.leftbar-menu-subitem .leftbar-menu-item>a{
    padding: 0rem 1.5rem 0rem 1rem;
}
 
/*左侧栏边距修改*/
.tab-content{
    padding:10px 0px 0px 0px !important;
}
.site-author-links{
    padding:0px 0px 0px 10px ;
}
/*目录位置偏移修改*/
#leftbar_catalog{
    margin-left: 0px;
}
/*目录条目边距修改*/
#leftbar_catalog .index-link{
    padding: 4px 4px 4px 4px;
}
/*左侧栏小工具栏字体缩小*/
#leftbar_tab_tools{
    font-size: 14px;
}
 
/*正文图片边距修改*/
article figure {margin:0;}
/*正文图片居中显示*/
.fancybox-wrapper {
    margin: auto;
}
/*正文表格样式修改*/
article table > tbody > tr > td,
article table > tbody > tr > th,
article table > tfoot > tr > td,
article table > tfoot > tr > th,
article table > thead > tr > td,
article table > thead > tr > th{
    padding: 8px 10px;
    border: 1px solid;
}
/*表格居中样式*/
.wp-block-table.aligncenter{margin:10px auto;}
 
/*回顶图标放大*/
button#fabtn_back_to_top, button#fabtn_go_to_comment, button#fabtn_toggle_blog_settings_popup, button#fabtn_toggle_sides, button#fabtn_open_sidebar{
    font-size: 1.2rem;
}
 
/*顶栏菜单放大*/
/*这里也可以设置刚刚我们设置的btfFont字体。试试看！*/
 
.navbar-nav .nav-link {
    font-size: 1rem;
    font-family: 'echo';
			
}
.navbar-brand {
	font-family: 'echo';
    font-size: 1.2rem;
    margin-right: 1.0 rem;
    padding-bottom: 0.2 rem;
	
	-webkit-text-fill-color: transparent;        
background: linear-gradient(94.75deg,rgb(60, 172, 247) 0%,rgb(131, 101, 253) 43.66%,                rgb(255, 141, 112) 64.23%,rgb(247, 201, 102) 83.76%,rgb(172, 143, 100) 100%);        
-webkit-background-clip: text;
}
 
/*菜单大小*/
.nav-link-inner--text {
    font-size: 1.25em;
}
.navbar-nav .nav-item {
    margin-right:0;
}
.mr-lg-5, .mx-lg-5 {
    margin-right:1rem !important;
}
.navbar-toggler-icon {
    width: 1.8rem;
    height: 1.8rem;
}
/*菜单间距*/
.navbar-expand-lg .navbar-nav .nav-link {
    padding-right: 1.4em;
    padding-left: 1.4em;
}
 
/*隐藏wp-SEO插件带来的线条阴影（不一定要装）*/
*[style='position: relative; z-index: 99998;'] {
    display: none;
}
 
/* Github卡片样式*/
.github-info-card-header a {
    /*Github卡片抬头颜色*/
    color: black !important;
    font-size: 1.5rem;
}
.github-info-card {
    /*Github卡片文字（非链接）*/
    font-size: 1rem;
    color: black !important;
}
.github-info-card.github-info-card-full.card.shadow-sm {
    /*Github卡片背景色*/
    background-color: rgba(var(--themecolor-rgbstr), 0.1) !important;
}
 
/*      左侧栏外观CSS     */
 
/* 头像 */
#leftbar_overview_author_image {
    width: 100px;
    height: 100px;
    margin: auto;
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
    background-color: rgba(127, 127, 127, 0.1);
    overflow: hidden;
    transition: transform 0.3s ease;
}
 
/*  头像亮暗  */
#leftbar_overview_author_image:hover {
	transform: scale(1.23);
	filter: brightness(150%);
}
 
/* 名称 */
#leftbar_overview_author_name {
  	margin-top: 15px;
	font-size: 18px;align-content;
	color:#00FFFF;
}
 
/* 简介 */
#leftbar_overview_author_description {
    font-size: 14px;
    margin-top: -4px;
    opacity: 0.8;
	color:#c21f30;
}
 
/* 标题，链接等 */
a, .btn-neutral {
    color:#AF7AC5 ;
	
}
 
/* 页脚透明 */
#footer {
    background: var(--themecolor-gradient);
    color: #fff;
    width: 100%;
    float: right;
    margin-bottom: 25px;
    text-align: center;
    padding: 25px 20px;
    line-height: 1.8;
    transition: none;
    opacity: 0.6;
}
```



http://8.138.163.189/wp-content/uploads/2025/10/7f0a0c18bdc4a3c03291fe82d06db4cc.jpg



http://8.138.163.189/wp-content/uploads/2025/10/681bc9d02e4b876c78d6e67ddeba2069.jpg





http://8.138.163.189/wp-content/uploads/2025/10/681bc9d02e4b876c78d6e67ddeba2069.jpg







```
root@deaa63ee8e78:/# ls
bin   docker-entrypoint-initdb.d  home	 media	proc  sbin  tmp
boot  entrypoint.sh		  lib	 mnt	root  srv   usr
dev   etc			  lib64  opt	run   sys   var
root@deaa63ee8e78:/# mysql -u root -p
Enter password: 
ERROR 1045 (28000): Access denied for user 'root'@'localhost' (using password: YES)

```



### 解释



```
Database changed
mysql> shwo tables;
ERROR 1064 (42000): You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'shwo tables' at line 1
mysql> show tables;
+-----------------------+
| Tables_in_wordpress   |
+-----------------------+
| wp_commentmeta        |
| wp_comments           |
| wp_links              |
| wp_options            |
| wp_postmeta           |
| wp_posts              |
| wp_term_relationships |
| wp_term_taxonomy      |
| wp_termmeta           |
| wp_terms              |
| wp_usermeta           |
| wp_users              |

```

