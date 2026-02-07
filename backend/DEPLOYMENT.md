# 🚀 Kids Draw 3D - 服务器部署指南

## 📋 系统要求

- Ubuntu 22.04 LTS
- 最低配置：2核 CPU / 4GB 内存 / 20GB 存储
- 推荐配置：4核 CPU / 8GB 内存 / 50GB 存储

## 🔧 快速部署

### 方法一：一键部署脚本

```bash
# 1. 上传脚本到服务器（或直接下载）
scp deploy.sh user@your-server:/tmp/

# 2. SSH 登录服务器
ssh user@your-server

# 3. 运行部署脚本
chmod +x /tmp/deploy.sh
sudo /tmp/deploy.sh
```

### 方法二：手动部署

详见 [手动部署步骤](#手动部署步骤)

---

## 📁 目录结构

部署完成后的目录结构：

```
/opt/kids-draw-3d/
├── backend/                 # 后端 API
│   ├── main.py
│   ├── venv/               # Python 虚拟环境
│   ├── outputs/            # 生成的3D模型
│   └── ...
├── frontend/               # 前端源码
│   ├── src/
│   ├── dist/               # 构建产物
│   └── ...
└── deploy.sh               # 部署脚本

/var/www/html/kids-draw-3d/  # Nginx 静态文件
```

---

## 🔄 更新部署

```bash
sudo /opt/kids-draw-3d/update.sh
```

或手动更新：

```bash
cd /opt/kids-draw-3d/backend
sudo git pull
sudo systemctl restart kids-draw-backend

cd /opt/kids-draw-3d/frontend
sudo git pull
npm install
npm run build
sudo cp -r dist/* /var/www/html/kids-draw-3d/
sudo systemctl restart nginx
```

---

## 🔒 配置 HTTPS（推荐）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书（替换为你的域名）
sudo certbot --nginx -d your-domain.com

# 自动续期测试
sudo certbot renew --dry-run
```

---

## 📊 常用命令

| 操作 | 命令 |
|------|------|
| 查看后端状态 | `sudo systemctl status kids-draw-backend` |
| 查看后端日志 | `sudo journalctl -u kids-draw-backend -f` |
| 重启后端 | `sudo systemctl restart kids-draw-backend` |
| 查看 Nginx 日志 | `sudo tail -f /var/log/nginx/kids-draw-3d-error.log` |
| 重启 Nginx | `sudo systemctl restart nginx` |
| 检查端口占用 | `sudo netstat -tlnp \| grep -E '80\|8000'` |

---

## ❓ 常见问题

### Q: 页面打不开
```bash
# 检查 Nginx 是否运行
sudo systemctl status nginx

# 检查防火墙
sudo ufw status
```

### Q: API 请求失败
```bash
# 检查后端是否运行
sudo systemctl status kids-draw-backend

# 查看错误日志
sudo journalctl -u kids-draw-backend -n 50
```

### Q: 3D 模型生成失败
```bash
# 检查 outputs 目录权限
ls -la /opt/kids-draw-3d/backend/outputs/

# 修复权限
sudo chown -R www-data:www-data /opt/kids-draw-3d/backend/outputs/
```

---

## 🌐 自定义域名

1. 编辑 Nginx 配置：
   ```bash
   sudo nano /etc/nginx/sites-available/kids-draw-3d
   ```

2. 修改 `server_name` 为你的域名：
   ```nginx
   server_name your-domain.com www.your-domain.com;
   ```

3. 重启 Nginx：
   ```bash
   sudo nginx -t && sudo systemctl restart nginx
   ```

---

## 📞 技术支持

如有问题，请提交 Issue：
- 前端：https://github.com/nQrChao/kids-draw-3d-frontend/issues
- 后端：https://github.com/nQrChao/kids-draw-3d-backend/issues
