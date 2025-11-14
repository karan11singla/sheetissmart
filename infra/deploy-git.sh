#!/bin/bash

# SheetIsSmart Git-based Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

DROPLET_USER="root"
DROPLET_IP="134.209.13.154"
DROPLET_PASSWORD="L&AnpRRw34P6m=u"
DEPLOY_PATH="/opt/sheetissmart"

echo -e "${GREEN}🚀 Deploying SheetIsSmart via Git...${NC}"

# Push to GitHub
echo -e "${YELLOW}📤 Pushing to GitHub...${NC}"
git push origin main

# Deploy to droplet
echo -e "${YELLOW}⚙️  Deploying on droplet...${NC}"
sshpass -p "$DROPLET_PASSWORD" ssh -o StrictHostKeyChecking=no $DROPLET_USER@$DROPLET_IP << 'EOF'
cd /opt/sheetissmart

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Build and restart containers
echo "🏗️  Rebuilding containers..."
cd infra
docker-compose down
docker-compose up -d --build

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 15

# Show status
echo "🏥 Checking service health..."
docker-compose ps

echo "📋 Recent logs:"
docker-compose logs --tail=20

echo ""
echo "✅ Deployment complete!"
echo "🌐 Frontend: https://ridgeport.finance"
echo "🔌 Backend API: https://ridgeport.finance/api"
echo "🏥 Health check: https://ridgeport.finance/health"
EOF

echo -e "${GREEN}🎉 Deployment script finished!${NC}"
