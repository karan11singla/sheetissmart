# SheetIsSmart - Infrastructure

Infrastructure as code and deployment configurations for SheetIsSmart.

## Components

- **Docker Compose**: Multi-container orchestration
- **Nginx**: Reverse proxy and load balancer
- **PostgreSQL**: Primary database
- **Deployment Scripts**: Automated deployment to Digital Ocean

## Prerequisites

- Docker & Docker Compose
- Digital Ocean droplet (Ubuntu 22.04+)
- SSH access to droplet

## Droplet Information

- **IP**: 134.209.13.154
- **User**: root
- **Password**: L&AnpRRw34P6m=u

## Local Development

### Start all services

```bash
cd infra
cp .env.example .env
# Edit .env with your local configuration
docker-compose up -d
```

### View logs

```bash
docker-compose logs -f
```

### Stop services

```bash
docker-compose down
```

### Rebuild services

```bash
docker-compose up -d --build
```

## Deployment to Digital Ocean

### Initial Setup

1. Update environment variables:
```bash
cd infra
cp .env.example .env
# Edit .env with production values
```

2. Deploy:
```bash
./deploy.sh
```

The script will:
- Package the application
- Upload to droplet
- Install Docker & Docker Compose (if needed)
- Build and start containers
- Run database migrations

### Manual Deployment Steps

If you prefer manual deployment:

1. SSH to droplet:
```bash
ssh root@134.209.13.154
```

2. Install Docker:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable docker
systemctl start docker
```

3. Install Docker Compose:
```bash
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

4. Clone/upload project:
```bash
mkdir -p /opt/sheetissmart
cd /opt/sheetissmart
# Upload project files
```

5. Configure environment:
```bash
cd infra
cp .env.example .env
nano .env  # Edit with production values
```

6. Start services:
```bash
docker-compose up -d --build
```

## Services

### PostgreSQL
- **Port**: 5432
- **Database**: sheetissmart
- **User**: sheetissmart
- **Health check**: `docker-compose exec postgres pg_isready`

### Backend API
- **Port**: 3000
- **Health endpoint**: `/health`
- **API base**: `/api/v1`

### Frontend
- **Port**: 5173 (dev), 80 (production via nginx)
- **Build**: Vite static build served by nginx

### Nginx
- **HTTP Port**: 80
- **HTTPS Port**: 443 (when SSL configured)
- **Config**: `nginx.conf`

## Docker Commands

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f [service_name]

# Restart a service
docker-compose restart [service_name]

# Execute command in container
docker-compose exec [service_name] [command]

# Database shell
docker-compose exec postgres psql -U sheetissmart -d sheetissmart

# Backend shell
docker-compose exec backend sh

# Stop all services
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v
```

## Database Operations

### Run migrations
```bash
docker-compose exec backend npx prisma migrate deploy
```

### View Prisma Studio
```bash
docker-compose exec backend npx prisma studio
```

### Backup database
```bash
docker-compose exec postgres pg_dump -U sheetissmart sheetissmart > backup.sql
```

### Restore database
```bash
cat backup.sql | docker-compose exec -T postgres psql -U sheetissmart -d sheetissmart
```

## SSL Setup (Let's Encrypt)

1. Install certbot on droplet:
```bash
apt-get update
apt-get install -y certbot
```

2. Generate certificate:
```bash
certbot certonly --standalone -d your-domain.com
```

3. Update nginx.conf to use SSL (uncomment HTTPS section)

4. Copy certificates:
```bash
mkdir -p /opt/sheetissmart/infra/ssl
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/sheetissmart/infra/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/sheetissmart/infra/ssl/key.pem
```

5. Restart nginx:
```bash
docker-compose restart nginx
```

## Monitoring

### Check service health
```bash
curl http://134.209.13.154/health
```

### View resource usage
```bash
docker stats
```

### View system logs
```bash
journalctl -u docker -f
```

## Troubleshooting

### Services not starting
```bash
# Check logs
docker-compose logs

# Restart services
docker-compose restart

# Rebuild from scratch
docker-compose down
docker-compose up -d --build
```

### Database connection issues
```bash
# Check database status
docker-compose exec postgres pg_isready

# View database logs
docker-compose logs postgres

# Verify connection string in .env
```

### Nginx errors
```bash
# Test nginx config
docker-compose exec nginx nginx -t

# Reload nginx
docker-compose exec nginx nginx -s reload
```

## Security Considerations

- [ ] Change default database password
- [ ] Set strong JWT secret
- [ ] Enable HTTPS with SSL
- [ ] Configure firewall (ufw)
- [ ] Set up automatic backups
- [ ] Enable fail2ban
- [ ] Regular security updates
- [ ] Implement rate limiting
- [ ] Set up monitoring & alerts

## Scaling

For horizontal scaling:
1. Set up load balancer
2. Deploy multiple backend instances
3. Use managed PostgreSQL (Digital Ocean Managed Database)
4. Implement Redis for session storage
5. Use CDN for frontend assets

## Backup Strategy

1. **Database**: Daily automated backups via cron
2. **Application files**: Version controlled via git
3. **Environment configs**: Secure encrypted backup

## Next Steps

- [ ] Set up domain name and DNS
- [ ] Configure SSL certificate
- [ ] Implement monitoring (Prometheus/Grafana)
- [ ] Set up log aggregation
- [ ] Configure automatic backups
- [ ] Set up CI/CD pipeline
