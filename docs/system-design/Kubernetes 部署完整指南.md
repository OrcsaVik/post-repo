# 虚拟机



重启会改变ip DHCP NAT VMware-8





[VMware虚拟机部署k8s集群_vmqk18-CSDN博客](https://blog.csdn.net/qq_41860461/article/details/122418639)



[K8S构建1台master2台node+Harbor - 一代肝帝 - 博客园 (cnblogs.com)](https://www.cnblogs.com/yyq1/p/13991453.html)





[Ubuntu18.04下安装配置SSH服务_ubuntu18.04 ssh yrs-CSDN博客](https://blog.csdn.net/wgc0802402/article/details/91046196)





[VMware 虚拟机网络配置 【100%解决】【超详细】_vmware虚拟机网络配置-CSDN博客](https://blog.csdn.net/weixin_56261190/article/details/144807447)

[VMware虚拟机和主机间复制粘贴共享剪贴板 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/665154528#:~:text=安装open-vm-tools安装open-vm-tools-desktop如图开启虚拟机设置)



[(14 条消息) 【Ubuntu】Ubuntu 18.04 LTS 更换国内源——解决终端下载速度慢的问题 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/61228593#:~:text=最近装了ubuntu18.04 LTS，下载软件有点慢，网上搜了下解决方案，大致是两种：一、把/etc/apt/sources.list文件里的源更换一下，改成阿里云或者其它的镜像的文件；二、更换software&updates里的select)





```
network:
  ethernets:
    ens33:  # 网卡名称，与 ip addr 显示的一致
      dhcp4: no  # 关闭 DHCP
      addresses: [192.168.66.10/24]  # 静态 IP 及子网掩码（/24 对应 255.255.255.0）
      gateway4: 192.168.66.1  # 网关（从之前的路由信息推测，通常是 NAT 模式的虚拟网关）
      nameservers:
        addresses: [8.8.8.8, 223.6.6.6]  # DNS 服务器
  version: 2
  renderer: networkd
```



```bash
sudo vim /etc/netplan/01-network-manager-all.yaml
```

### 四、正确配置：让静态 IP 生效

若要使用 `netplan` 配置静态 IP（而非图形界面），需调整 `01-network-manager-all.yaml`，让特定接口由 `networkd` 管理，避免冲突。

#### 步骤 1：编辑 `01-network-manager-all.yaml`

bas

```bash
sudo vim /etc/netplan/01-network-manager-all.yaml
```

#### 步骤 2：修改配置（关键）

保留 `NetworkManager` 管理其他接口（如需），但指定 `ens33` 由 `networkd` 管理（用于静态 IP）：

yaml











```yaml
network:
  version: 2
  renderer: NetworkManager  # 其他接口仍由 NetworkManager 管理
  ethernets:
    ens33:  # 针对你的网卡（ens33）单独指定渲染器
      renderer: networkd  # 用 networkd 管理该接口（适合静态 IP）
```

#### 步骤 3：确保 `01-netcfg.yaml` 配置正确

编辑 `01-netcfg.yaml`（若不存在可创建），配置静态 IP：

yaml











```yaml
network:
  version: 2
  renderer: networkd  # 与上一步的 ens33 渲染器一致
  ethernets:
    ens33:
      dhcp4: no  # 关闭 DHCP
      addresses: [192.168.66.130/24]  # 静态 IP
      gateway4: 192.168.66.1  # 网关（从 ip route 确认）
      nameservers:
        addresses: [223.5.5.5, 223.6.6.6]  # DNS
```

#### 步骤 4：应用配置并验证

bash











```bash
# 检查配置格式错误
sudo netplan try

# 应用配置
sudo netplan apply

# 重启网络服务
sudo systemctl restart systemd-networkd

# 验证 IP 是否生效
ip addr show ens33
```



echo "192.168.66.10 master
192.168.66.11 node01
192.168.66.12 node02"/>> /etc/hosts



```
# master 节点
sudo hostnamectl set-hostname k8s-master01

# node1 节点
sudo hostnamectl set-hostname k8s-node01

# node2 节点
sudo hostnamectl set-hostname k8s-node02

# Harbor 节点
sudo hostnamectl set-hostname hub

# 验证主机名
hostname
```





depends:        nf_defrag_ipv6,libcrc32c,nf_defrag_ipv4





### 3. **能否通过降级 K8s 版本来使用 Docker-CE？**

✅ **可以，但仅限于 Kubernetes ≤ 1.23 版本。**

| Kubernetes 版本 | 是否支持 Docker-CE        | 说明                        |
| --------------- | ------------------------- | --------------------------- |
| ≤ 1.23          | ✅ 支持（通过 dockershim） | 可以使用 `docker://` 运行时 |
| ≥ 1.24          | ❌ 不支持                  | `dockershim` 已移除         |





#### 使用其他容器进行部署

containerd 使用文档

配置第三方镜像

[Containerd配置国内镜像源 - CharyGao - 博客园 (cnblogs.com)](https://www.cnblogs.com/Chary/articles/18701060)

[containerd容器运行时快速入门使用指南 - 尹正杰 - 博客园 (cnblogs.com)](https://www.cnblogs.com/yinzhengjie/p/18058010)



修改原先部署文档



使用新版本k8s进行部署 container



```
WARN[0000] runtime connect using default endpoints: [unix:///var/run/dockershim.sock unix:///run/containerd/containerd.sock unix:///run/crio/crio.sock unix:///var/run/cri-dockerd.sock]. As the default settings are now deprecated, you should set the endpoint instead. 
ERRO[0000] validate service connection: validate CRI v1 runtime API for endpoint "unix:///var/run/dockershim.sock": rpc error: code = Unavailable desc = connection error: desc = "transport: Error while dialing dial unix /var/run/dockershim.sock: connect: no such file or directory" 
Version:  0.1.0
RuntimeName:  containerd
RuntimeVersion:  1.6.12-0ubuntu1~18.04.1
RuntimeApiVersion:  v1
检查错误

从错误信息来看，crictl 无法正常连接容器运行时（dockershim 不可用，但检测到了 containerd），主要原因是 K8s 1.24+ 已移除 dockershim，而你的环境中实际使用的是 containerd 作为容器运行时，但 crictl 默认配置仍指向 dockershim，导致连接失败。以下是具体解决步骤：
```



```
步骤 3：验证配置是否生效
再次执行 crictl version，若输出类似以下内容，说明连接成功：
plaintext
Version:  0.1.0
RuntimeName:  containerd
RuntimeVersion:  1.6.12-0ubuntu1~18.04.1
RuntimeApiVersion:  v1
步骤 4：测试 crictl 功能
bash
# 查看镜像列表（与 `ctr images list` 类似）
crictl images

# 查看正在运行的容器
crictl ps
```



scp sz rz

[Linux文件传输详解:rz、sz与scp命令_rz命令 – 菜鸟-创作你的创作 (52runoob.com)](https://www.52runoob.com/archives/4832)





例如：本地当前用 `user1` 登录，执行上述命令时，会默认尝试用 `user1@192.168.1.100` 登录远程服务器。

⚠️ 注意：若远程服务器不存在与本地相同的用户名（如本地 `user1`，远程无 `user1`），会直接报错 `Permission denied` 或 `No such user`。





这是 `scp` 首次连接远程主机 `192.168.66.11` 时的正常安全验证提示，目的是确认远程主机身份，防止 “中间人攻击”。后续输出及操作步骤如下：





kubectl启动失败

```
10月 01 20:09:22 k8s-master01 kubelet[15723]: E1001 20:09:22.444493   15723 run.go:74] "command failed" err="failed to load kubelet config file, path: /var/lib/kubelet/config.yaml, error: failed to load Kubelet config file /var/lib/kubelet/config.yaml, error failed to read kubelet config file \"/var/lib/kubelet/config.yaml\", error: open /var/lib/kubelet/config.yaml: no such file or directory"
10月 01 20:09:22 k8s-master01 systemd[1]: kubelet.service: Main process exited, code=exited, status=1/FAILURE
10月 01 20:09:22 k8s-master01 systemd[1]: kubelet.service: Failed with result 'exit-code'.
10月 01 20:09:32 k8s-master01 systemd[1]: kubelet.service: Service hold-off time over, scheduling restart.
10月 01 20:09:32 k8s-master01 systemd[1]: kubelet.service: Scheduled restart job, restart counter is at 37.
10月 01 20:09:32 k8s-master01 systemd[1]: Stopped kubelet: The Kubernetes Node Agent.
10月 01 20:09:32 k8s-master01 systemd[1]: Started kubelet: The Kubernetes Node Agent.
10月 01 20:09:32 k8s-master01 kubelet[15754]: E1001 20:09:32.688448   15754 run.go:74] "command failed" err="failed to load kubelet config file, path: /var/lib/kubelet/config.yaml, error: failed to load Kubelet config file /var/lib/kubelet/config.yaml, error failed to read kubelet config file \"/var/lib/kubelet/config.yaml\", error: open /var/lib/kubelet/config.yaml: no such file or directory"
10月 01 20:09:32 k8s-master01 systemd[1]: kubelet.service: Main process exited, code=exited, status=1/FAILURE
10月 01 20:09:32 k8s-master01 systemd[1]: kubelet.service: Failed with result 'exit-code'.

```



```
# 查看可用版本（确认 1.28.2 可用）
apt-cache madison kubeadm | grep -E '1\.28\.2|1\.28\.1'

# 安装 1.28.2 版本（关键修正）
VERSION=1.28.2-00
sudo apt install -y kubeadm=$VERSION kubelet=$VERSION kubectl=$VERSION

# 锁定版本（防止自动升级）
sudo apt-mark hold kubeadm kubelet kubectl

# 启用并启动 kubelet
sudo systemctl enable --now kubelet
```

#### 2. 验证安装（关键验证）





使用一键式进行部署

```
# 1. 检查 K8s 版本
kubectl version --client --short
# 输出：Client Version: v1.28.2

# 2. 检查节点状态
kubectl get nodes
# 输出：k8s-master01   Ready   ...   v1.28.2

# 3. 检查 Flannel 状态
kubectl get pods -n kube-system -l k8s-app=flannel
# 输出：kube-flannel-ds-...   Running
```



#### 配置加载模块

```
error execution phase preflight: [preflight] Some fatal errors occurred:
	[ERROR FileContent--proc-sys-net-bridge-bridge-nf-call-iptables]: /proc/sys/net/bridge/bridge-nf-call-iptables does not exist
[preflight] If you know what you are doing, you can make a check non-fatal with `--ignore-preflight-errors=...`
To see the stack trace of this error execute with --v=5 or higher
```

> 这个错误是因为 Linux 内核模块 br_netfilter 没有加载，导致 /proc/sys/net/bridge/bridge-nf-call-iptables 不存在。
>
> 这是 Kubernetes 的常见前置检查项，必须修复（不能简单忽略），否则 Pod 网络会异常。



### Habor镜像仓库设置

```

八、部署 Harbor 镜像仓库（v2.11）
（Harbor 配置保持不变，但需确保 Docker 依赖已移除）

1. 安装 Docker Compose
Bash
编辑
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
2. 解压 Harbor 安装包（v2.11.0）
Bash
编辑
cd /root
tar xzvf harbor-offline-installer-v2.11.0.tgz
sudo mv harbor /usr/local/
3. 配置 Harbor（关键：启用 insecure-registries）
Bash
编辑
cd /usr/local/harbor
sudo vim harbor.cfg
Ini
编辑
hostname = hub.yyq.com
ui_url_protocol = https
db_password = root123
ssl_cert = /data/cert/server.crt
ssl_cert_key = /data/cert/server.key
harbor_admin_password = Harbor12345
# 添加以下配置（让 K8s 节点信任 Harbor）
insecure_registry = hub.yyq.com
4. 生成 HTTPS 证书（同原文档，但路径需修正）
Bash
编辑
sudo mkdir -p /data/cert
cd /data/cert
sudo openssl genrsa -des3 -out server.key 2048
sudo openssl req -new -key server.key -out server.csr
sudo cp server.key server.key.org
sudo openssl rsa -in server.key.org -out server.key
sudo openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt
sudo chmod 644 server.*
5. 安装 Harbor
Bash
编辑
cd /usr/local/harbor
sudo ./install.sh
九、K8s 部署应用并测试
1. 部署 nginx 应用（使用 Harbor 镜像）
Bash
编辑
# 创建 Deployment
kubectl run nginx-deployment --image=hub.yyq.com/library/mynginx:v1 --port=80 --replicas=1

# 验证
kubectl get pods -o wide
2. 暴露应用为 Service
Bash
编辑
kubectl expose deployment nginx-deployment --port=30000 --target-port=80 --type=NodePort
kubectl get svc
3. 外部访问测试
Bash
编辑
# 在宿主机浏览器访问
http://192.168.66.20:31679  # 替换为实际 NodePort
✅ 成功标志：浏览器显示 "Welcome to nginx!"

🔥 关键验证命令（部署后必做）
Bash
编辑
# 1. 验证 K8s 版本
kubectl version --short

# 2. 验证 CRI 运行时
sudo crictl info | grep -A 2 runtime

# 3. 验证 Flannel 网络
kubectl get pods -n kube-system | grep flannel

# 4. 验证 Harbor 镜像仓库
curl -k https://hub.yyq.com/v2/  # -k 忽略 SSL 证书错误
```





2. 基于二进制文件部署

**步骤：**

1. 手动下载 Kubernetes 组件（如 kube-apiserver、kube-controller-manager 等）。
2. 配置每个组件的参数和启动命令。
3. 部署 etcd 集群作为数据存储。
4. 启动 Kubernetes 组件并配置网络插件。

**适用场景：** 适合需要高度自定义和深入了解 Kubernetes 工作原理的用户。





[K8S——平台规划和部署方式（尚硅谷，二进制安装方式不太友好）_尚硅谷kubernetes部署文档-CSDN博客](https://blog.csdn.net/weixin_42789698/article/details/130041994)



错误

```
info: node \"k8s-master01\" not found"
10月 01 20:21:21 k8s-master01 kubelet[18425]: E1001 20:21:21.782698   18425 event.go:289] Unable to write event: '&v1.Event{TypeMeta:v1.TypeMeta{Kind:"", APIVersion:""}, ObjectMeta:v1.ObjectMeta{Name:"k8s-master01.186a5d58fd5aabfb", GenerateName:"", Namespace:"default", SelfLink:"", UID:"", ResourceVersion:"", Generation:0, CreationTimestamp:time.Date(1, time.January, 1, 0, 0, 0, 0, time.UTC), DeletionTimestamp:<ni/>, DeletionGracePeriodSeconds:(*int64)(nil), Labels:map[string]string(nil), Annotations:map[string]string(nil), OwnerReferences:[]v1.OwnerReference(nil), Finalizers:[]string(nil), ManagedFields:[]v1.ManagedFieldsEntry(nil)}, InvolvedObject:v1.ObjectReference{Kind:"Node", Namespace:"", Name:"k8s-master01", UID:"k8s-master01", APIVersion:"", ResourceVersion:"", FieldPath:""}, Reason:"Starting", Message:"Starting kubelet.", Source:v1.EventSource{Component:"kubelet", Host:"k8s-master01"}, FirstTimestamp:time.Date(2025, time.October, 1, 20, 20, 41, 230683131, time.Local), LastTimestamp:time.Date(2025, time.October, 1, 20, 20, 41, 230683131, time.Local), Count:1, Type:"Normal", EventTime:time.Date(1, time.January, 1, 0, 0, 0, 0, time.UTC), Series:(*v1.EventSeries)(nil), Action:"", Related:(*v1.ObjectReference)(nil), ReportingController:"kubelet", ReportingInstance:"k8s-master01"}': 'Post "https://192.168.66.10:6443/api/v1/namespaces/default/events": dial tcp 192.168.66.10:6443: connect: connection refused'(may retry after sleeping)
10月 01 20:21:21 k8s-master01 kubelet[18425]: E1001 20:21:21.851302   18425 controller.go:146] "Failed to ensure lease exists, will retry" err="Get \"https://192.168.66.10:6443/apis/coordination.k8s.io/v1/namespaces/kube-node-lease/leases/k8s-master01?timeout=10s\": dial tcp 192.168.66.10:6443: connect: connection refused" interval="7s"
10月 01 20:21:22 k8s-master01 kubelet[18425]: I1001 20:21:22.007152   18425 kubelet_node_status.go:70] "Attempting to register node" node="k8s-master01"
10月 01 20:21:22 k8s-master01 kubelet[18425]: E1001 20:21:22.007825   18425 kubelet_node_status.go:92] "Unable to register node with API server" err="Post \"https://192.168.66.10:6443/api/v1/nodes\": dial tcp 192.168.66.10:6443: connect: connection refused" node="k8s-master01"

# 

```





配置镜像原

```
# 设置阿里云镜像源（关键修复！）
export REGISTRY=registry.aliyuncs.com/google_containers
```









#### node安装k8s文档

设置相同镜像

root@k8s-node01:/etc/apt# pwd
/etc/apt



```
# 1. remove old k8s repo if exists
rm -f /etc/apt/sources.list.d/kubernetes.list

# 2. add the official k8s repo
curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
cat <<EOF | sudo tee /etc/apt/sources.list.d/kubernetes.list
deb https://pkgs.k8s.io/core:/stable:/v1.28/deb/ /  # v1.28 repo
EOF

# 3. update package index
apt-get update
```

```
apt-cache madison kubelet kubeadm kubectl
```

```
apt-get install -y \
  kubelet=1.28.2-1.1 \
  kubeadm=1.28.2-1.1 \
  kubectl=1.28.2-1.1
```

```
apt-mark hold kubelet kubeadm kubectl
```

**systemctl enable kubelet --now**









这里版本对应1.28.2-1.1

同时在unbuunru上运行

````
当然可以！以下是**改写并优化后的完整流程说明**，适配你当前的环境（Ubuntu 18.04 + Kubernetes v1.28.2 + 阿里云镜像源），并**明确指出关键配置与常见陷阱**（如 `NotReady` 问题）：

---

### 🚀 初始化 Master 节点（使用阿里云镜像源，避免拉取超时）

```bash
kubeadm init \
  --apiserver-advertise-address=192.168.66.10 \
  --image-repository=registry.aliyuncs.com/google_containers \
  --kubernetes-version=v1.28.2 \
  --service-cidr=10.96.0.0/12 \
  --pod-network-cidr=10.244.0.0/16
```

> ✅ 说明：
> - `--image-repository` 指定阿里云镜像仓库，避免访问 `k8s.gcr.io` 超时
> - `--pod-network-cidr=10.244.0.0/16` 为 **Flannel 网络插件**的标准 CIDR（若用 Calico 等需调整）
> - `--apiserver-advertise-address` 必须是你 master 的 **实际内网 IP**

执行成功后，会输出类似以下的 `kubeadm join` 命令（**务必保存！**）。

---

### 🧾 配置 kubectl（仅在 master 执行）

```bash
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

现在你可以使用 `kubectl` 管理集群。

---

### 🔍 查看节点状态

```bash
kubectl get nodes
```

你会看到 master 节点状态为 **`NotReady`** —— 这是**正常现象**，因为 **CNI 网络插件尚未安装**。

> ⚠️ 所有节点（包括 master）在未安装 CNI 前都会是 `NotReady`！

---


### ➕ 将 Worker 节点加入集群

在 **每个 worker 节点**（如 `k8s-node01`）上执行你在 master 初始化后获得的 `join` 命令，例如：

```bash
kubeadm join 192.168.66.10:6443 \
  --token 2g250x.30bomobd2v6s3hjm \
  --discovery-token-ca-cert-hash sha256:02a19437bd9725fc8067ed26dce92120a55918e60afc95d3c72a2564e1d76de8
```

> 💡 如果 token 过期（默认 24 小时），在 master 重新生成：
> ```bash
> kubeadm token create --print-join-command
> ```

---

### ✅ 最终验证

在 master 执行：

```bash
kubectl get nodes
```

输出应类似：

```
NAME           STATUS   ROLES           AGE   VERSION
k8s-master01   Ready    control-plane   5m    v1.28.2
k8s-node01     Ready    <non/>          1m    v1.28.2
```

所有节点 `STATUS` 为 **`Ready`**，表示集群已正常运行！

---

### 🔒 补充建议

- **不要忽略 CNI 安装**：这是 `NotReady` 的最常见原因
- **确保所有节点时间同步**：使用 `chrony` 或 `ntp`
- **关闭 swap**（已在 kubeadm preflight 检查中强制要求）：
  ```bash
  swapoff -a
  sed -i '/ swap / s/^/#/' /etc/fstab
  ```

---

现在你的集群已经完整搭建成功！🎉  
下一步可以部署应用、安装 Ingress、Metrics Server 等。
````





>/> **`[kubelet-check] Initial timeout of 40s passed.`**
>/>  并且卡在 `[wait-control-plane] Waiting for the kubelet to boot up the control plane...`
>
> 这说明 **kubelet 启动了，但 control plane Pods（apiserver、etcd 等）迟迟没有 Running**。





```
root@k8s-master01:/home/master# crictl pull registry.aliyuncs.com/google_containers/kube-apiserver:v1.28.2
Image is up to date for sha256:cdcab12b2dd16cce4efc5dd43c082469364f19ad978e922d110b74a42eff7cce


Logs begin at Wed 2025-10-01 16:00:37 CST, end at Thu 2025-10-02 11:53:18 CST. --
10月 02 11:52:06 k8s-master01 kubelet[4104]: E1002 11:52:06.228980    4104 event.go:289] Unable to write event: '&v1.Event{TypeMeta:v1.TypeMeta{Kind:"", APIVersion:""}, ObjectMeta:v1.ObjectMeta{Name:"k8s-master01.186a8ff2eec565b2", GenerateName:"", Namespace:"default", SelfLink:"", UID:"", ResourceVersion:"", Generation:0, CreationTimestamp:time.Date(1, time.January, 1, 0, 0, 0, 0, time.UTC), DeletionTimestamp:<ni/>, DeletionGracePeriodSeconds:(*int64)(nil), Labels:map[string]string(nil), Annotations:map[string]string(nil), OwnerReferences:[]v1.OwnerReference(nil), Finalizers:[]string(nil), ManagedFields:[]v1.ManagedFieldsEntry(nil)}, InvolvedObject:v1.ObjectReference{Kind:"Node", Namespace:"", Name:"k8s-master01", UID:"k8s-master01", APIVersion:"", ResourceVersion:"", FieldPath:""}, Reason:"NodeHasSufficientMemory", Message:"Node k8s-master01 status is now: NodeHasSufficientMemory", Source:v1.EventSource{Component:"kubelet", Host:"k8s-master01"}, FirstTimestamp:time.Date(2025, time.October, 2, 11, 47, 57, 992371634, time.Local), LastTimestamp:time.Date(2025, time.October, 2, 11, 47, 57, 992371634, time.Local), Count:1, Type:"Normal", EventTime:time.Date(1, time.January, 1, 0, 0, 0, 0, time.UTC), Series:(*v1.EventSeries)(nil), Action:"", Related:(*v1.ObjectReference)(nil), ReportingController:"kubelet", ReportingInstance:"k8s-master01"}': 'Post "https://192.168.66.10:6443/api/v1/namespaces/default/events": dial tcp 192.168.66.10:6443: connect: connection refused'(may retry after sleeping)


requesting a signed certificate from the control plane: cannot create certificate signing request: Post "https://192.168.66.10:6443/apis/certificates.k8s.io/v1/certificatesigningrequests": dial tcp 192.168.66.10:6443: connect: connection refused
10月 02 11:53:18 k8s-master01 kubelet[4104]: E1002 11:53:18.618084    4104 controller.go:146] "Failed to ensure lease exists, will retry" err="Get \"https://192.168.66.10:6443/apis/coordination.k8s.io/v1/namespaces/kube-node-lease/leases/k8s-master01?timeout=10s\": dial tcp 192.168.66.10:6443: connect: connection refused" interval="7s"
10月 02 11:53:18 k8s-master01 kubelet[4104]: I1002 11:53:18.764238    4104 kubelet_node_status.go:70] "Attempting to register node" node="k8s-master01"
10月 02 11:53:18 k8s-master01 kubelet[4104]: E1002 11:53:18.764446    4104 kubelet_node_status.go:92] "Unable to register node with API server" err="Post \"https://192.168.66.10:6443/api/v1/nodes\": dial tcp 192.168.66.10:6443: connect: connection refused" node="k8s-master01"


init] Using Kubernetes version: v1.28.2
[preflight] Running pre-flight checks
error execution phase preflight: [preflight] Some fatal errors occurred:
	[ERROR FileAvailable--etc-kubernetes-manifests-kube-apiserver.yaml]: /etc/kubernetes/manifests/kube-apiserver.yaml already exists
	[ERROR FileAvailable--etc-kubernetes-manifests-kube-controller-manager.yaml]: /etc/kubernetes/manifests/kube-controller-manager.yaml already exists
	[ERROR FileAvailable--etc-kubernetes-manifests-kube-scheduler.yaml]: /etc/kubernetes/manifests/kube-scheduler.yaml already exists
	[ERROR FileAvailable--etc-kubernetes-manifests-etcd.yaml]: /etc/kubernetes/manifests/etcd.yaml already exists
	[ERROR Port-10250]: Port 10250 is in use
[preflight] If you know what you are doing, you can make a check non-fatal with `--ignore-preflight-errors=...`
To see the stack trace of this error execute with --v=5 or higher

```





> 1. **连接被拒绝**：多次出现`dial tcp 192.168.66.10:6443: connect: connection refused`错误。这意味着Kubernetes API服务器（kube-apiserver）可能没有正确运行或监听在指定的IP和端口上。
> 2. **文件已存在错误**：尝试初始化集群时，kubeadm报告说某些关键的manifest文件已经存在于`/etc/kubernetes/manifests/`目录下。这通常意味着之前的尝试可能已经在系统中留下了部分配置，导致冲突。
> 3. **端口占用**：错误指出`Port 10250 is in use`，这是kubelet使用的健康检查端口。如果该端口已经被占用，可能需要进一步调查是什么进程占用了这个端口。



```
关于 API Server 的状态 当你检查 kube-apiserver 的状态时，得到了“Unit kube-apiserver.service could not be found”的消息。这是因为 kube-apiserver 是作为一个静态 Pod 运行在 kubelet 上的，而不是作为系统服务直接管理的。你可以通过以下命令查看所有静态 Pods 的状态：
Bash
编辑
crictl pods
查找包含 kube-apiserver 名称的 Pod 来确认其状态。
清理旧的 Kubeconfig 文件 如提示所述，kubeadm reset 不会自动删除 $HOME/.kube/config 文件。如果你之前运行过 kubeadm init 或者有其他配置，应该手动删除或备份这个文件，然后重新生成新的 kubeconfig 文件：
Bash
编辑
rm $HOME/.kube/config
mkdir -p $HOME/.kube
kubectl --kubeconfig=/etc/kubernetes/admin.conf config use-context kubernetes-admin@kubernetes
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

```
to reset your system's IPVS tables.

The reset process does not clean your kubeconfig files and you must remove them manually.
Please, check the contents of the $HOME/.kube/config file.
root@k8s-master01:/home/master# crictl pods
POD ID              CREATED             STATE               NAME                NAMESPACE           ATTEMPT             RUNTIME
root@k8s-master01:/home/master# rm $HOME/.kube/config
rm: cannot remove '/root/.kube/config': No such file or directory
root@k8s-master01:/home/master# mkdir -p $HOME/.kube
root@k8s-master01:/home/master# sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
cp: cannot stat '/etc/kubernetes/admin.conf': No such file or directory

```





 输出：/tmp/k8s_diagnostics_<timestam/>.tar.gz （包含所有收集文件）



[历尽艰辛的问题：Waiting for the kubelet to boot up the control plane......This can take up to 4m0s-CSDN博客](https://blog.csdn.net/ygd11/article/details/129277208)



```
root@k8s-master01:/home/master# kubectl get node
E1002 13:05:29.495309    2432 memcache.go:265] couldn't get current server API group list: Get "http://localhost:8080/api?timeout=32s": dial tcp 127.0.0.1:8080: connect: connection refused
E1002 13:05:29.495561    2432 memcache.go:265] couldn't get current server API group list: Get "http://localhost:8080/api?timeout=32s": dial tcp 127.0.0.1:8080: connect: connection refused
E1002 13:05:29.499705    2432 memcache.go:265] couldn't get current server API group list: Get "http://localhost:8080/api?timeout=32s": dial tcp 127.0.0.1:8080: connect: connection refused
E1002 13:05:29.499971    2432 me
```



```
[sudo] password for master: 
[reset] Reading configuration from the cluster...
[reset] FYI: You can look at this config file with 'kubectl -n kube-system get cm kubeadm-config -o yaml'
eW1002 13:10:00.561454    2704 reset.go:120] [reset] Unable to fetch the kubeadm-config ConfigMap from cluster: failed to get config map: Get "https://192.168.66.10:6443/api/v1/namespaces/kube-system/configmaps/kubeadm-config?timeout=10s": dial tcp 192.168.66.10:6443: connect: connection refused
W1002 13:10:00.562294    2704 preflight.go:56] [reset] WARNING: Changes made to this host by 'kubeadm init' or 'kubeadm join' will be reverted.
[reset] Are you sure you want to proceed? [y/N]: ^H^H^H^H
```



```
10月 02 13:27:38 k8s-master01 containerd[4468]: time="2025-10-02T13:27:38.708382930+08:00" level=info msg="Start cni network conf syncer for default"
10月 02 13:27:38 k8s-master01 containerd[4468]: time="2025-10-02T13:27:38.708386238+08:00" level=info msg="Start streaming server"
root@k8s-master01:/etc/containerd# 
root@k8s-master01:/etc/containerd# sudo crictl info | grep -A 5 -B 5 "registry\|systemdCgroup"
      "confDir": "/etc/cni/net.d",
      "maxConfNum": 1,
      "confTemplate": "",
      "ipPref": ""
    },
    "registry": {
      "configPath": "",
      "mirrors": {},
      "configs": {},
      "auths": {},
      "headers": {
--
    "streamServerAddress": "127.0.0.1",
    "streamServerPort": "0",
    "streamIdleTimeout": "4h0m0s",
    "enableSelinux": false,
    "selinuxCategoryRange": 1024,
    "sandboxImage": "registry.k8s.io/pause:3.6",
    "statsCollectPeriod": 10,
    "systemdCgroup": false,
    "enableTLSStreaming": false,
    "x509KeyPairStreaming": {
      "tlsCertFile": "",
      "tlsKeyFile": ""
    },
root@k8s
```





# ！！！！！成功安装对应k8s

使用定义对应config

root@k8s-master01:/home/init# kubeadm version

```
kubeadm version: &version.Info{Major:"1", Minor:"28", GitVersion:"v1.28.2", GitCommit:"89a4ea3e1e4ddd7f7572286090359983e0387b2f", GitTreeState:"clean", BuildDate:"2023-09-13T09:34:32Z", GoVersion:"go1.20.8", Compiler:"gc", Platform:"linux/amd64"}
```

kubeadm version

同时配置

结构 下载对应本地镜像  --针对网络延迟导致服务失效



使用阿里云 



取消swap

桥接流量

设置容器 CRIctl控制器 kubelet服务运行

```
apiVersion: kubeadm.k8s.io/v1beta3
bootstrapTokens:
- groups:
  - system:bootstrappers:kubeadm:default-node-token
  token: abcdef.0123456789abcdef
  ttl: 24h0m0s
  usages:
  - signing
  - authentication
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: 192.168.66.10 //主节点ip
  bindPort: 6443
nodeRegistration:
  criSocket: unix:///var/run/containerd/containerd.sock
  imagePullPolicy: IfNotPresent
  name: k8s-master01 //主机名 hostname 查看
  taints:
   - effect: NoSchedule
     key: node-role.kubernetes.io/master
---
apiServer:
  timeoutForControlPlane: 4m0s
apiVersion: kubeadm.k8s.io/v1beta3
certificatesDir: /etc/kubernetes/pki
clusterName: kubernetes
controllerManager: {}
dns: {}
etcd:
  local:
    dataDir: /var/lib/etcd
imageRepository: registry.aliyuncs.com/google_containers
kind: ClusterConfiguration
kubernetesVersion: 1.28.2 //核心 针对主节点镜像的版本
//防止远程拉取失败

//CIDR格式
//CIDR（Classless Inter-Domain Routing）表示法由两部分组成：
networking:
  dnsDomain: cluster.local
  podSubnet: 172.7.0.0/16 //网络插件
  serviceSubnet: 10.96.0.0/12

scheduler: {}
~                                                                                                                                                                                                                 
```



[kudeadm 部署 k8s_kubedam-CSDN博客](https://blog.csdn.net/Jerry00713/article/details/126440061?csdn_share_tail={"type"%3A"blog"%2C"rType"%3A"article"%2C"rId"%3A"126440061"%2C"source"%3A"Jerry00713"})







从节点 加载对应模块

```
ternatively, if you are the root user, you can run:

  export KUBECONFIG=/etc/kubernetes/admin.conf

You should now deploy a pod network to the cluster.
Run "kubectl apply -f [podnetwork].yaml" with one of the options listed at:
  https://kubernetes.io/docs/concepts/cluster-administration/addons/

Then you can join any number of worker nodes by running the following on each as root:

kubeadm join 192.168.66.10:6443 --token abcdef.0123456789abcdef \
	--discovery-token-ca-cert-hash sha256:344d6fd9bec10f5c88663d7ffb4c3538cfe8efd184a580cee2a78224b47cef0c 
root@k8s-master01:/home/init# kubetctl get node

Command 'kubetctl' not found, did you mean:

  command 'kubectl' from snap kubectl (1.34.1)

See 'snap info <snapnam/>' for additional versions.

root@k8s-master01:/home/init# kubectl get node

```



```

This node has joined the cluster:
* Certificate signing request was sent to apiserver and a response was received.
* The Kubelet was informed of the new secure connection details.


```



加载模块脚本

```sh
#!/bin/bash

set -euo pipefail

echo "[INFO] 加载 br_netfilter 内核模块..."
modprobe br_netfilter

echo "[INFO] 持久化加载 br_netfilter 模块（避免重启后失效）..."
cat/> /etc/modules-load.d/k8s.conf <<EOF
br_netfilter
EOF

echo "[INFO] 配置 sysctl 参数..."
cat/> /etc/sysctl.d/k8s.conf <<EOF
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward = 1
EOF

echo "[INFO] 应用 sysctl 配置..."
sysctl --system

echo "[INFO] 验证配置..."
if [[ $(sysctl -n net.bridge.bridge-nf-call-iptables) == "1" ]] && \
   [[ $(sysctl -n net.bridge.bridge-nf-call-ip6tables) == "1" ]] && \
   [[ $(sysctl -n net.ipv4.ip_forward) == "1" ]]; then
    echo "[SUCCESS] Kubernetes 网络前置条件已满足！"
else
    echo "[ERROR] 配置未生效，请手动检查。"
    exit 1
fi
```





## CNI 结合部署的对应ip

```
# 查看当前镜像
grep image kube-flannel.yml

# 替换为阿里云镜像（以 v0.25.1 为例）
sed -i 's|docker.io/flannel/flannel:.*|registry.aliyuncs.com/google_containers/flannel:v0.25.1|g' kube-flannel.yml
```

[]()

> networking:
>   dnsDomain: cluster.local
>   podSubnet: 172.7.0.0/16 //网络插件
>   serviceSubnet: 10.96.0.0/12



```
10月 02 15:26:32 k8s-master01 kubelet[10841]: E1002 15:26:32.114818   10841 kubelet.go:2855] "Container runtime network not ready" networkReady="NetworkReady=false reason:NetworkPluginNotReady mes
10月 02 15:26:37 k8s-master01 kubelet[10841]: E1002 15:26:37.116014   10841 kubelet.go:2855] "Container runtime network not ready" networkReady="NetworkReady=false reason:NetworkPluginNotReady mes
10月 02 15:26:42 k8s-master01 kubelet[10841]: E1002 15:26:42.118353   10841 kubelet.go:2855] "Container runtime network not ready" networkReady="NetworkReady=false reason:NetworkPluginNotReady mes
10月 02 15:26:47 k8s-master01 kubelet[10841]: E1002 15:26:47.119720   10841 kubelet.go:2855] "Container runtime network not ready" networkReady="NetworkReady=false reason:NetworkPluginNotReady mes
10月 02 15:26:52 k8s-master01 kubelet[10841]: E1002 15:26:52.121843   10841 kubelet.go:2855] "Container runtime network not ready" networkReady="NetworkReady=false reason:NetworkPluginNotReady mes
10月 02 15:26:57 k8s-master01 kubelet[10841]: E1002 15:26:57.123354   10841 kubelet.go:2855] "Container runtime network not ready" networkReady="NetworkReady=false reason:NetworkPluginNotReady mes
10月 02 15:27:02 k8s-master01 kubelet[10841]: E1002 15:27:02.125403   10841 kubelet.go:2855] "Container runtime network not ready" networkReady="Netw
```



          value: "false"
        image: ghcr.io/flannel-io/flannel:v0.27.3



```
kube-flannel.yml 中定义了：
一个 DaemonSet（kind: DaemonSet）
一个 ConfigMap（包含 CNI 配置）
一个 ServiceAccount 和 RBAC 权限
```



```
#!/bin/bash

set -euo pipefail

FLANNEL_YAML="kube-flannel.yml"
POD_CIDR="172.7.0.0/16"
ALIYUN_REGISTRY="registry.aliyuncs.com/google_containers"


echo "[INFO] 修改 Pod CIDR 为 $POD_CIDR..."
sed -i "s|10\.244\.0\.0/16|$POD_CIDR|g" "$FLANNEL_YAML"

echo "[INFO] 替换镜像为阿里云镜像..."

# 替换 flannel 主镜像（ghcr.io/flannel-io/flannel → 阿里云）
sed -i "s|ghcr.io/flannel-io/flannel:$.*$|$ALIYUN_REGISTRY/flannel:\1|g" "$FLANNEL_YAML"

# 替换 flannel-cni-plugin 镜像（这个阿里云可能没有，但可尝试用 dockerhub 镜像或保留）
# 注意：截至 2025 年，阿里云暂未同步 flannel-cni-plugin，但该插件体积小，通常可拉取
# 如果拉取失败，可手动在各节点拉取或使用代理

echo "[INFO] 当前使用的镜像："
grep "image:" "$FLANNEL_YAML" | sort -u

echo "[INFO] 部署 Flannel 到集群..."
kubectl apply -f "$FLANNEL_YAML"

echo "[INFO] 等待 Flannel Pod 启动（约 30 秒）..."
sleep 10

echo "[INFO] 当前 Flannel Pod 状态："
kubectl get pods -n kube-flannel

echo "[INFO] 节点状态："
kubectl get nodes

echo "[SUCCESS] Flannel 部署完成！请观察 1 分钟，节点应变为 Ready。"
```



```
结合上下文 每次输入的k8s版本为1-28.02kubeadm version: &version.Info{Major:"1", Minor:"28", GitVersion:"v1.28.2", GitCommit:"89a4ea3e1e4ddd7f7572286090359983e0387b2f", GitTreeState:"clean", BuildDate:"2023-09-13T09:34:32Z", GoVersion:"go1.20.8", Compiler:"gc", Platform:"linux/amd64"}，使用contain容器，本地已安装好yaml文件，继续完善
```





CNI每个镜像都挺有





scp传输

```
# 导入 flannel 主镜像
ctr -n k8s.io images import ./flannel.tar

# 导入 cni-plugin 镜像
ctr -n k8s.io images import ./flannel-cni-plugin.tar
```



每个kubelet都需要进行部署文件 配置servie

> 是的，**完全可以保证不包含主节点（master/control-plane）特有内容** —— 只需**排除仅 master 节点才需要的参数**。
>
> ---
>
> ### ✅ 主节点 vs 从节点：关键区别
>
> | 参数                                                         | 主节点（Master）                        | 从节点（Worker）                   | 是否应包含在 worker 的 service 文件中？ |
> | ------------------------------------------------------------ | --------------------------------------- | ---------------------------------- | --------------------------------------- |
> | `--pod-manifest-path=/etc/kubernetes/manifests`              | ✅ 用于运行静态 Pod（如 kube-apiserver） | ❌ worker 不运行 control-plane 组件 | **❌ 不应包含**                          |
> | `--register-with-taints=node-role.kubernetes.io/master:NoSchedule` | ✅ 主节点专用污点                        | ❌ worker 不需要                    | **❌ 不应包含**                          |
> | `--node-labels=node-role.kubernetes.io/master`               | ✅ 主节点标签                            | ❌                                  | **❌ 不应包含**                          |
> | `--bootstrap-kubeconfig`                                     | ✅ 首次加入时需要（master/worker 都有）  | ✅ worker 加入集群时也需要          | **✅ 应保留**                            |
> | `--kubeconfig`                                               | ✅                                       | ✅                                  | **✅ 保留**                              |
> | `--config`                                                   | ✅                                       | ✅                                  | **✅ 保留**                              |
> | `--container-runtime-endpoint`                               | ✅                                       | ✅                                  | **✅ 保留**                              |
> | `--pod-infra-container-image`                                | 可选                                    | 可选（但你正要加）                 | **✅ 按需添加**                          |
>
>/> 📌 **结论**：只要**不写 `--pod-manifest-path` 和 master 专属标签/污点**，就是干净的 worker 配置。
>
> ---
>
> ### ✅ 纯净的从节点 `kubelet.service`（无任何 master 内容）
>
> ```ini
> # /etc/systemd/system/kubelet.service
> [Unit]
> Description=kubelet: The Kubernetes Node Agent
> Documentation=https://kubernetes.io/docs/
> Wants=network-online.target
> After=network-online.target
> 
> [Service]
> ExecStart=/usr/bin/kubelet \
>   --bootstrap-kubeconfig=/etc/kubernetes/bootstrap-kubelet.conf \
>   --kubeconfig=/etc/kubernetes/kubelet.conf \
>   --config=/var/lib/kubelet/config.yaml \
>   --container-runtime-endpoint=unix:///run/containerd/containerd.sock \
>   --pod-infra-container-image=registry.aliyuncs.com/google_containers/pause:3.9
> 
> Restart=always
> RestartSec=10
> StartLimitInterval=0
> KillMode=process
> 
> [Install]
> WantedBy=multi-user.target
> ```
>
> ✅ **这个配置：**
> - **没有** `--pod-manifest-path`（worker 不需要静态 Pod）
> - **没有** 任何 master 标签、污点、control-plane 参数
> - **保留了** worker 必需的认证和配置路径
> - **添加了**你需要的 pause 镜像替换
>
> ---
>
> ### 🔍 验证是否“干净”
>
> 你可以在一个已加入集群的 worker 节点上执行：
> ```bash
> # 查看当前 kubelet 实际启动参数（由 kubeadm 默认生成）
> ps aux | grep kubelet
> ```
>
> 你会发现默认的 worker kubelet **本来就没有 `--pod-manifest-path`**，所以我们的配置是准确的。
>
> ---
>
> ### 🛠️ 最终建议
>
> - **使用上述纯净版 service 文件覆盖从节点的 `/etc/systemd/system/kubelet.service`**
> - 执行：
>   ```bash
>   sudo systemctl daemon-reload
>   sudo systemctl restart kubelet
>   ```
> - 之后可通过 `kubectl get node <worker-nam/> -o wide` 确认节点仍处于 `Ready` 状态
>
>/> ✅ 这样既解决了 pause 镜像拉取问题，又**完全避免了主节点专属配置污染**，安全且符合最佳实践。



[Kubernetes Pod Network CIDR_pod-network-cidr-CSDN博客](https://blog.csdn.net/jiuyanjin5740/article/details/146369614)





https://www.bookstack.cn/read/kubernetes-handbook-201910/concepts-persistent-volume.md



```

# =========================
# 2. 创建静态 PV
# =========================
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-test-volume
spec:
  capacity:
    storage: 1Gi              # PV 容量
  accessModes:
    - ReadWriteOnce           # 单节点可读写
  persistentVolumeReclaimPolicy: Retain  # 测试后可保留数据
  storageClassName: manual               # 使用手动类型
  hostPath:                             # 使用宿主机路径（本地测试常用）
    path: /mnt/data/pv-test-volume
    type: DirectoryOrCreate

---
# =========================
# 3. 创建 PVC（绑定 PV）
# =========================
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pvc-test-claim
  namespace: linhaixin
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: manual               # 必须与 PV 的 storageClassName 对应
  resources:
    requests:
      storage: 500Mi                     # 请求小于等于 PV 容量即可
  volumeName: pv-test-volume             # 指定绑定哪个 PV

---
# =========================
# 4. 创建 Pod 挂载 PVC 并写入数据测试
# =========================
apiVersion: v1
kind: Pod
metadata:
  name: pv-pvc-test-pod
  namespace: pv-test
spec:
  containers:
  - name: linhaixin.registry/linhaixin/busybox:v1.0
    image: 
    command: ["/bin/sh", "-c"]
    args: ["echo 'hello-pv-pvc'/> /data/test.txt && sleep 3600"]
    volumeMounts:
      - mountPath: /data
        name: test-volume
  volumes:
  - name: test-volume
    persistentVolumeClaim:
      claimName: pvc-test-claim

```

> 

