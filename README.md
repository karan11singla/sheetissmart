# SheetIsSmart - B2B Workspace Management Platform

A modern, intelligent workspace management platform inspired by Smartsheet, built for B2B SaaS.

## Project Overview

SheetIsSmart is a workspace management platform centered around a powerful spreadsheet-like interface (Excel on steroids). The platform enables teams to:

- Manage data in flexible, intelligent sheets
- Build reports and dashboards from sheet data
- Create automated workflows
- Collaborate in real-time
- Scale for enterprise B2B use cases

## Architecture

### Core Components

1. **backend-service** - RESTful API service (Node.js + TypeScript)
   - Sheet data management
   - User authentication & authorization
   - Real-time collaboration
   - Workflow automation engine

2. **frontend** - Web application (React + TypeScript)
   - Interactive sheet interface
   - Dashboard and reporting views
   - Real-time updates
   - Responsive design

3. **infra** - Infrastructure & deployment
   - Docker configurations
   - CI/CD pipelines
   - Digital Ocean deployment scripts
   - Database setup

## Core Features (MVP)

### Phase 1 - Basic Sheet Functionality
- [x] Project structure setup
- [ ] Sheet CRUD operations
- [ ] Cell editing and formatting
- [ ] Basic data types (text, number, date, dropdown)
- [ ] Row/column operations

### Phase 2 - User Management
- [ ] User authentication
- [ ] Multi-tenant architecture
- [ ] Role-based access control (RBAC)
- [ ] Team/workspace management

### Phase 3 - Advanced Features
- [ ] Reports and dashboards
- [ ] Workflow automation
- [ ] Real-time collaboration
- [ ] API integrations

## Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Cache**: Redis (optional)
- **Authentication**: JWT

### Frontend
- **Framework**: React 18+
- **Language**: TypeScript
- **Build Tool**: Vite
- **State Management**: React Query + Zustand
- **UI Components**: Tailwind CSS + shadcn/ui
- **Grid Library**: AG-Grid or TanStack Table

### Infrastructure
- **Hosting**: Digital Ocean Droplet
- **Containerization**: Docker
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt

## Development Setup

See individual README files in each service directory for detailed setup instructions.

## Deployment

Droplet Information:
- **IP**: 134.209.13.154
- **Server**: Ubuntu (Digital Ocean)

See `infra/README.md` for deployment instructions.

## Getting Started

```bash
# Clone the repository
git clone <repo-url> sheetissmart
cd sheetissmart

# Setup backend
cd backend-service
npm install
npm run dev

# Setup frontend (in a new terminal)
cd frontend
npm install
npm run dev
```

## License

Proprietary - All rights reserved

## Contact

Karan Singla
