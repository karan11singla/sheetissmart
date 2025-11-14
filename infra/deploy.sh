#!/bin/bash
# Deployment script for SheetIsSmart to Digital Ocean droplet

set -e

# Configuration
DROPLET_IP="${DROPLET_IP:-134.209.13.154}"
DROPLET_USER="${DROPLET_USER:-root}"
DROPLET_PASSWORD="${DROPLET_PASSWORD:-L&AnpRRw34P6m=u}"
APP_DIR="/opt/sheetissmart"
PROJECT_NAME="sheetissmart"

echo "🚀 Deploying SheetIsSmart to droplet..."

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo "⚠️  sshpass not found. Installing..."
    brew install hudochenkov/sshpass/sshpass || apt-get install -y sshpass
fi

# Create deployment package
echo "📦 Creating deployment package..."
cd "$(dirname "$0")/.."
tar -czf /tmp/sheetissmart-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    --exclude='logs' \
    backend-service/ frontend/ infra/

# Copy files to droplet
echo "📤 Uploading to droplet..."
sshpass -p "$DROPLET_PASSWORD" scp -o StrictHostKeyChecking=no \
    /tmp/sheetissmart-deploy.tar.gz \
    $DROPLET_USER@$DROPLET_IP:/tmp/

# Execute deployment on droplet
echo "⚙️  Setting up on droplet..."
sshpass -p "$DROPLET_PASSWORD" ssh -o StrictHostKeyChecking=no \
    $DROPLET_USER@$DROPLET_IP << 'ENDSSH'

set -e

APP_DIR="/opt/sheetissmart"

echo "📂 Setting up directory..."
mkdir -p $APP_DIR
cd /tmp
tar -xzf sheetissmart-deploy.tar.gz -C $APP_DIR

cd $APP_DIR

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "🐙 Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Create .env file if it doesn't exist
if [ ! -f infra/.env ]; then
    echo "📝 Creating .env file..."
    cp infra/.env.example infra/.env
    echo "⚠️  WARNING: Update infra/.env with production values!"
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
cd infra
docker-compose down || true

# Build and start containers
echo "🏗️  Building and starting containers..."
docker-compose up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
docker-compose ps

# Show logs
echo "📋 Recent logs:"
docker-compose logs --tail=50

echo ""
echo "✅ Deployment complete!"
echo "🌐 Frontend: http://134.209.13.154"
echo "🔌 Backend API: http://134.209.13.154/api"
echo "🏥 Health check: http://134.209.13.154/health"
echo ""
echo "📊 View logs: cd $APP_DIR/infra && docker-compose logs -f"
echo "🔄 Restart: cd $APP_DIR/infra && docker-compose restart"
echo "🛑 Stop: cd $APP_DIR/infra && docker-compose down"

ENDSSH

# Cleanup
rm /tmp/sheetissmart-deploy.tar.gz

echo ""
echo "🎉 Deployment script finished!"
echo "📝 Next steps:"
echo "   1. SSH to droplet: ssh root@$DROPLET_IP"
echo "   2. Update .env file: nano $APP_DIR/infra/.env"
echo "   3. Restart services: cd $APP_DIR/infra && docker-compose restart"
