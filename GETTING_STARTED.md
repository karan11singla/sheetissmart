# Getting Started with SheetIsSmart

Complete guide to get SheetIsSmart up and running on your local machine or deploying to production.

## Prerequisites

### Required Software
- **Node.js**: v18 or higher ([Download](https://nodejs.org/))
- **npm**: v9 or higher (comes with Node.js)
- **PostgreSQL**: v14 or higher ([Download](https://www.postgresql.org/download/))
- **Docker** (optional, for containerized development): ([Download](https://www.docker.com/))
- **Git**: For version control

### Optional Tools
- **Prisma Studio**: Database GUI (installed with Prisma)
- **Postman**: For API testing
- **VSCode**: Recommended editor with extensions:
  - ESLint
  - Prettier
  - Prisma
  - Tailwind CSS IntelliSense

## Quick Start (Local Development)

### 1. Clone the Repository

```bash
cd ~/git
git clone <repository-url> sheetissmart
cd sheetissmart
```

### 2. Set Up PostgreSQL Database

#### Option A: Using Docker
```bash
docker run --name sheetissmart-postgres \
  -e POSTGRES_DB=sheetissmart \
  -e POSTGRES_USER=sheetissmart \
  -e POSTGRES_PASSWORD=sheetissmart_password \
  -p 5432:5432 \
  -d postgres:16-alpine
```

#### Option B: Using Local PostgreSQL
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE sheetissmart;
CREATE USER sheetissmart WITH PASSWORD 'sheetissmart_password';
GRANT ALL PRIVILEGES ON DATABASE sheetissmart TO sheetissmart;
\q
```

### 3. Set Up Backend

```bash
cd backend-service

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database URL
# DATABASE_URL="postgresql://sheetissmart:sheetissmart_password@localhost:5432/sheetissmart?schema=public"
nano .env  # or use your preferred editor

# Generate Prisma Client
npm run db:generate

# Push database schema
npm run db:push

# Start development server
npm run dev
```

The backend API will start on `http://localhost:3000`

Verify it's running:
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok","timestamp":"...","service":"sheetissmart-backend"}
```

### 4. Set Up Frontend

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env if needed (default should work)
# VITE_API_URL=http://localhost:3000
nano .env

# Start development server
npm run dev
```

The frontend will start on `http://localhost:5173`

### 5. Open the Application

Visit `http://localhost:5173` in your browser

You should see the SheetIsSmart interface!

## Testing the Application Locally

### Create Your First Sheet

1. Click "New Sheet" button
2. Enter a name: "My First Sheet"
3. Add a description (optional)
4. Click "Create"

### Add Columns

1. In the sheet view, click "Add Column"
2. Repeat to add 3-4 columns
3. Columns will be named "Column 1", "Column 2", etc.

### Add Rows

1. Click "Add Row" button
2. Repeat to add several rows
3. Notice cells are automatically created for each column

### Edit Cells

1. Click any cell to edit
2. Type a value
3. Press Enter or click outside to save
4. The value should persist (check by refreshing the page)

### API Testing with cURL

```bash
# Create a sheet
curl -X POST http://localhost:3000/api/v1/sheets \
  -H "Content-Type: application/json" \
  -d '{"name":"Sales Data","description":"Q1 2025 sales"}'

# Get all sheets
curl http://localhost:3000/api/v1/sheets

# Get a specific sheet (replace {id} with actual ID)
curl http://localhost:3000/api/v1/sheets/{id}
```

## Docker Development Environment

### Using Docker Compose

```bash
cd infra

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

Services will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- PostgreSQL: localhost:5432

### Stopping Docker Services

```bash
cd infra
docker-compose down

# To remove volumes (WARNING: deletes database)
docker-compose down -v
```

## Production Deployment

### Deploy to Digital Ocean Droplet

#### 1. Prepare Environment

```bash
cd infra

# Copy and edit production environment
cp .env.example .env
nano .env
```

Update these values in `.env`:
```bash
DB_PASSWORD=your_secure_postgres_password_here
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars
CORS_ORIGIN=http://134.209.13.154  # or your domain
API_URL=http://134.209.13.154/api
```

#### 2. Run Deployment Script

```bash
./deploy.sh
```

The script will:
1. Package the application
2. Upload to the droplet (134.209.13.154)
3. Install Docker & Docker Compose on droplet
4. Build containers
5. Run database migrations
6. Start all services

#### 3. Verify Deployment

After deployment completes (takes 5-10 minutes):

```bash
# Check if services are running
ssh root@134.209.13.154 "cd /opt/sheetissmart/infra && docker-compose ps"

# Check health
curl http://134.209.13.154/health

# View logs
ssh root@134.209.13.154 "cd /opt/sheetissmart/infra && docker-compose logs --tail=50"
```

#### 4. Access Production Application

Open browser: `http://134.209.13.154`

### Manual Deployment (If Script Fails)

#### 1. SSH to Droplet

```bash
ssh root@134.209.13.154
# Password: L&AnpRRw34P6m=u
```

#### 2. Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable docker
systemctl start docker
```

#### 3. Install Docker Compose

```bash
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

#### 4. Upload Project Files

From your local machine:

```bash
cd ~/git/sheetissmart
tar -czf sheetissmart.tar.gz backend-service frontend infra
scp sheetissmart.tar.gz root@134.209.13.154:/opt/
```

On the droplet:

```bash
cd /opt
mkdir -p sheetissmart
tar -xzf sheetissmart.tar.gz -C sheetissmart
cd sheetissmart/infra
```

#### 5. Configure and Start

```bash
# Create .env
cp .env.example .env
nano .env  # Edit with production values

# Start services
docker-compose up -d --build

# Check logs
docker-compose logs -f
```

## Common Issues & Troubleshooting

### Issue: Backend won't start

**Error**: `Database connection failed`

**Solution**:
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Verify DATABASE_URL in .env
```

### Issue: Frontend shows "Network Error"

**Solution**:
```bash
# Check if backend is running
curl http://localhost:3000/health

# Check VITE_API_URL in frontend/.env
# Make sure it matches backend URL

# Clear browser cache and reload
```

### Issue: Port already in use

**Error**: `Port 3000 is already allocated`

**Solution**:
```bash
# Find process using the port
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in .env and restart
```

### Issue: Prisma Client not generated

**Error**: `Cannot find module '@prisma/client'`

**Solution**:
```bash
cd backend-service
npm run db:generate
```

### Issue: Docker build fails

**Solution**:
```bash
# Clean Docker cache
docker system prune -a

# Rebuild
docker-compose build --no-cache
```

### Issue: Can't connect to droplet

**Solution**:
```bash
# Test SSH connection
ssh -v root@134.209.13.154

# Check firewall (on droplet)
ufw status
ufw allow 22
ufw allow 80
ufw allow 443
```

## Database Management

### View Database with Prisma Studio

```bash
cd backend-service
npm run db:studio
```

Opens GUI at `http://localhost:5555`

### Run Migrations

```bash
cd backend-service

# Create a new migration
npm run db:migrate

# Apply pending migrations
npx prisma migrate deploy
```

### Reset Database (Development Only)

```bash
cd backend-service
npx prisma migrate reset
```

### Backup Database

```bash
# Local backup
pg_dump -U sheetissmart -d sheetissmart > backup.sql

# Docker backup
docker-compose exec postgres pg_dump -U sheetissmart sheetissmart > backup.sql
```

### Restore Database

```bash
# Local restore
psql -U sheetissmart -d sheetissmart < backup.sql

# Docker restore
cat backup.sql | docker-compose exec -T postgres psql -U sheetissmart -d sheetissmart
```

## Development Workflow

### Making Code Changes

1. **Backend Changes**:
   ```bash
   cd backend-service
   # Edit code
   # Server auto-reloads with tsx watch
   ```

2. **Frontend Changes**:
   ```bash
   cd frontend
   # Edit code
   # Browser auto-reloads with Vite HMR
   ```

3. **Database Schema Changes**:
   ```bash
   cd backend-service
   # Edit prisma/schema.prisma
   npm run db:push  # For development
   # or
   npm run db:migrate  # For production
   ```

### Running Tests (When Implemented)

```bash
# Backend tests
cd backend-service
npm test

# Frontend tests
cd frontend
npm test
```

### Building for Production

```bash
# Backend
cd backend-service
npm run build

# Frontend
cd frontend
npm run build

# Preview frontend build
npm run preview
```

## Next Steps After Setup

1. **Explore the API**: Use Postman or cURL to test all endpoints
2. **Create Test Data**: Add multiple sheets, columns, rows
3. **Check Logs**: Monitor application logs for errors
4. **Read Documentation**: Check ARCHITECTURE.md for system design
5. **Plan Features**: Review README.md for upcoming features
6. **Set Up Git**: Initialize git repo and make first commit

## Useful Commands Reference

### Backend
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm start            # Start production server
npm run db:generate  # Generate Prisma Client
npm run db:push      # Push schema to DB (dev)
npm run db:migrate   # Run migrations (prod)
npm run db:studio    # Open Prisma Studio
npm run lint         # Run ESLint
```

### Frontend
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Docker
```bash
docker-compose up -d              # Start all services
docker-compose down               # Stop all services
docker-compose ps                 # List containers
docker-compose logs -f            # View logs
docker-compose logs -f backend    # View backend logs only
docker-compose restart backend    # Restart backend
docker-compose exec backend sh    # Shell into backend
docker-compose exec postgres psql -U sheetissmart  # DB shell
```

## Additional Resources

- **Main README**: `/README.md`
- **Architecture**: `/ARCHITECTURE.md`
- **Backend README**: `/backend-service/README.md`
- **Frontend README**: `/frontend/README.md`
- **Infrastructure README**: `/infra/README.md`
- **Claude Context**: `/.clauderc`

## Getting Help

1. Check error logs: `docker-compose logs`
2. Review documentation in the README files
3. Check GitHub issues (if available)
4. Review Prisma docs: https://www.prisma.io/docs
5. Review React Query docs: https://tanstack.com/query/latest

## Success Checklist

- [ ] PostgreSQL database running
- [ ] Backend API responding at `/health`
- [ ] Frontend loading in browser
- [ ] Can create a new sheet
- [ ] Can add columns and rows
- [ ] Can edit cell values
- [ ] Changes persist after page refresh
- [ ] Docker containers running (if using Docker)
- [ ] Production deployed to droplet (if deploying)

Congratulations! You're ready to start building with SheetIsSmart! 🎉
