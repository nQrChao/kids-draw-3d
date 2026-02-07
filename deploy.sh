#!/bin/bash

# ============================================
# Kids Draw 3D - Ubuntu 22 一键部署脚本
# ============================================
# 使用方法: 
#   chmod +x deploy.sh
#   sudo ./deploy.sh
# ============================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量 - 请根据需要修改
DOMAIN="localhost"                    # 你的域名或IP地址
GITHUB_USER="nQrChao"                 # GitHub用户名
INSTALL_DIR="/opt/kids-draw-3d"       # 安装目录
FRONTEND_PORT=80                      # 前端端口
BACKEND_PORT=8000                     # 后端端口

echo -e "${BLUE}"
echo "============================================"
echo "   🎨 Kids Draw 3D 一键部署脚本"
echo "   适用于 Ubuntu 22.04 LTS"
echo "============================================"
echo -e "${NC}"

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用 sudo 运行此脚本${NC}"
    exit 1
fi

# 获取实际用户（非root）
REAL_USER=${SUDO_USER:-$USER}

echo -e "${YELLOW}[1/8] 更新系统包...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}[2/8] 安装必要依赖...${NC}"
apt install -y \
    git \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    nginx \
    curl \
    ufw

# 检查 Node.js 版本，如果太旧则安装新版本
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${YELLOW}安装 Node.js 18.x...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi

echo -e "${YELLOW}[3/8] 创建安装目录...${NC}"
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

echo -e "${YELLOW}[4/8] 克隆项目代码...${NC}"
# 如果目录存在则更新，否则克隆
if [ -d "backend" ]; then
    echo "更新后端代码..."
    cd backend && git pull && cd ..
else
    git clone https://github.com/${GITHUB_USER}/kids-draw-3d-backend.git backend
fi

if [ -d "frontend" ]; then
    echo "更新前端代码..."
    cd frontend && git pull && cd ..
else
    git clone https://github.com/${GITHUB_USER}/kids-draw-3d-frontend.git frontend
fi

echo -e "${YELLOW}[5/8] 配置后端服务...${NC}"
cd $INSTALL_DIR/backend

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install --upgrade pip
pip install -r requirements.txt
pip install uvicorn gunicorn

# 创建outputs目录
mkdir -p outputs

deactivate

# 创建systemd服务文件
cat > /etc/systemd/system/kids-draw-backend.service << EOF
[Unit]
Description=Kids Draw 3D Backend API Service
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$INSTALL_DIR/backend
Environment="PATH=$INSTALL_DIR/backend/venv/bin"
ExecStart=$INSTALL_DIR/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port $BACKEND_PORT
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 设置权限
chown -R www-data:www-data $INSTALL_DIR/backend

echo -e "${YELLOW}[6/8] 构建前端应用...${NC}"
cd $INSTALL_DIR/frontend

# 安装依赖并构建
npm install
npm run build

# 创建Nginx目录并复制文件
mkdir -p /var/www/html/kids-draw-3d
cp -r dist/* /var/www/html/kids-draw-3d/
chown -R www-data:www-data /var/www/html/kids-draw-3d

echo -e "${YELLOW}[7/8] 配置Nginx...${NC}"

# 创建Nginx配置
cat > /etc/nginx/sites-available/kids-draw-3d << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 前端静态文件
    root /var/www/html/kids-draw-3d;
    index index.html;

    # 前端路由
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API代理
    location /api {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
        # 支持大文件上传（图片）
        client_max_body_size 50M;
    }

    # 静态模型文件
    location /outputs {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }

    # 错误页面
    error_page 404 /index.html;

    # 日志
    access_log /var/log/nginx/kids-draw-3d-access.log;
    error_log /var/log/nginx/kids-draw-3d-error.log;
}
EOF

# 启用站点配置
ln -sf /etc/nginx/sites-available/kids-draw-3d /etc/nginx/sites-enabled/

# 删除默认配置（可选）
rm -f /etc/nginx/sites-enabled/default

# 测试Nginx配置
nginx -t

echo -e "${YELLOW}[8/8] 启动服务...${NC}"

# 重新加载systemd
systemctl daemon-reload

# 启动后端服务
systemctl enable kids-draw-backend
systemctl restart kids-draw-backend

# 重启Nginx
systemctl enable nginx
systemctl restart nginx

# 配置防火墙
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   ✅ 部署完成！${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "访问地址: ${BLUE}http://$DOMAIN${NC}"
echo -e "API文档:  ${BLUE}http://$DOMAIN/api/docs${NC}"
echo ""
echo -e "${YELLOW}常用命令:${NC}"
echo "  查看后端状态:  sudo systemctl status kids-draw-backend"
echo "  查看后端日志:  sudo journalctl -u kids-draw-backend -f"
echo "  重启后端:      sudo systemctl restart kids-draw-backend"
echo "  重启Nginx:     sudo systemctl restart nginx"
echo ""
echo -e "${YELLOW}添加HTTPS (推荐):${NC}"
echo "  sudo apt install certbot python3-certbot-nginx"
echo "  sudo certbot --nginx -d your-domain.com"
echo ""
