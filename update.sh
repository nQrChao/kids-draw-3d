#!/bin/bash

# ============================================
# Kids Draw 3D - 更新脚本
# ============================================
# 使用方法: 
#   chmod +x update.sh
#   sudo ./update.sh
# ============================================

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

INSTALL_DIR="/opt/kids-draw-3d"

echo -e "${BLUE}🔄 开始更新 Kids Draw 3D...${NC}"

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo "请使用 sudo 运行此脚本"
    exit 1
fi

echo -e "${YELLOW}[1/4] 更新后端代码...${NC}"
cd $INSTALL_DIR/backend
git pull

# 激活虚拟环境并更新依赖
source venv/bin/activate
pip install -r requirements.txt
deactivate

echo -e "${YELLOW}[2/4] 更新前端代码...${NC}"
cd $INSTALL_DIR/frontend
git pull

echo -e "${YELLOW}[3/4] 重新构建前端...${NC}"
npm install
npm run build
cp -r dist/* /var/www/html/kids-draw-3d/

echo -e "${YELLOW}[4/4] 重启服务...${NC}"
systemctl restart kids-draw-backend
systemctl restart nginx

echo ""
echo -e "${GREEN}✅ 更新完成！${NC}"
echo ""
echo "后端状态:"
systemctl status kids-draw-backend --no-pager -l | head -5
echo ""
