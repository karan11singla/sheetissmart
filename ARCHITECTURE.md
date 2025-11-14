# SheetIsSmart - Architecture Documentation

## System Overview

SheetIsSmart is a B2B SaaS workspace management platform built with a modern microservices-inspired architecture. The system is designed to be scalable, maintainable, and performant.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                          Client Layer                        │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           React Frontend (Port 5173/80)              │   │
│  │   - React Router for SPA routing                     │   │
│  │   - React Query for server state                     │   │
│  │   - Tailwind CSS for styling                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Nginx Layer (Port 80/443)              │
│  - Reverse Proxy                                             │
│  - Load Balancing                                            │
│  - SSL Termination                                           │
│  - Rate Limiting                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│   Frontend Container      │   │   Backend Container       │
│   (Nginx + Static Files)  │   │   (Node.js + Express)     │
│   Port: 80                │   │   Port: 3000              │
└───────────────────────────┘   └───────────────────────────┘
                                            │
                                            │ Prisma ORM
                                            ▼
                                ┌───────────────────────────┐
                                │   PostgreSQL Database     │
                                │   Port: 5432              │
                                │   - sheets table          │
                                │   - columns table         │
                                │   - rows table            │
                                │   - cells table           │
                                └───────────────────────────┘
```

## Technology Stack

### Frontend Layer
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (for fast development and optimized production builds)
- **Routing**: React Router v6 (client-side routing)
- **State Management**:
  - React Query (server state, caching, synchronization)
  - Zustand (planned for client-side UI state)
- **Styling**: Tailwind CSS (utility-first CSS framework)
- **HTTP Client**: Axios (with interceptors for error handling)
- **Icons**: Lucide React

### Backend Layer
- **Runtime**: Node.js 18+ LTS
- **Language**: TypeScript (strict mode)
- **Framework**: Express.js 4.x
- **ORM**: Prisma (type-safe database client)
- **Validation**: Joi (planned for request validation)
- **Logging**: Winston (structured logging)
- **Security**: Helmet (HTTP headers), CORS, bcrypt, JWT

### Database Layer
- **Database**: PostgreSQL 16
- **ORM**: Prisma
- **Migrations**: Prisma Migrate
- **Schema Management**: Version controlled via Prisma

### Infrastructure Layer
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose
- **Reverse Proxy**: Nginx (load balancing, SSL termination)
- **Hosting**: Digital Ocean Droplet (Ubuntu)
- **CI/CD**: Planned (GitHub Actions)

## Database Schema

### Entity Relationship Diagram

```
┌──────────────┐
│    Sheet     │
├──────────────┤
│ id (PK)      │──┐
│ name         │  │
│ description  │  │
│ createdAt    │  │
│ updatedAt    │  │
└──────────────┘  │
                  │
        ┌─────────┴────────┬─────────────┬──────────┐
        │                  │             │          │
        ▼                  ▼             ▼          ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Column     │   │     Row      │   │     Cell     │
├──────────────┤   ├──────────────┤   ├──────────────┤
│ id (PK)      │   │ id (PK)      │   │ id (PK)      │
│ sheetId (FK) │   │ sheetId (FK) │   │ sheetId (FK) │
│ name         │   │ position     │   │ rowId (FK)   │
│ type         │   │ height       │   │ columnId(FK) │
│ position     │   │ createdAt    │   │ value        │
│ width        │   │ updatedAt    │   │ createdAt    │
│ createdAt    │   └──────────────┘   │ updatedAt    │
│ updatedAt    │           │          └──────────────┘
└──────────────┘           │                   │
        │                  │                   │
        └──────────────────┴───────────────────┘
```

### Table Details

#### sheets
- Primary entity for data organization
- One sheet can have multiple columns and rows
- Cascade delete: Deleting a sheet deletes all related columns, rows, and cells

#### columns
- Defines the structure/schema of the sheet
- Types: TEXT, NUMBER, DATE, DROPDOWN, CHECKBOX, FORMULA
- Position determines column order (sortable)
- Width is configurable (default 150px)

#### rows
- Represents a row in the sheet
- Position determines row order (sortable)
- Height is configurable (default 35px)

#### cells
- Stores actual data values
- Unique constraint on (rowId, columnId) - one cell per row-column intersection
- Value stored as JSON string for flexibility
- When a new row is created, cells are auto-created for all columns

## API Architecture

### RESTful API Design

Base URL: `/api/v1`

#### Resource Hierarchy
```
/api/v1/sheets                    # Collection
  ├─ GET    /                     # List all sheets
  ├─ POST   /                     # Create sheet
  ├─ GET    /:id                  # Get sheet details
  ├─ PUT    /:id                  # Update sheet
  ├─ DELETE /:id                  # Delete sheet
  │
  ├─ POST   /:id/columns          # Add column
  ├─ POST   /:id/rows             # Add row
  └─ PUT    /:id/cells/:cellId    # Update cell
```

#### Request/Response Format

**Standard Response Format**:
```json
{
  "status": "success" | "error",
  "data": { ... },
  "message": "Error message (if error)"
}
```

**Error Response**:
```json
{
  "status": "error",
  "message": "Descriptive error message"
}
```

### Backend Code Organization

```
backend-service/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.ts   # Prisma client setup
│   │   └── logger.ts     # Winston logger config
│   │
│   ├── controllers/      # Route handlers (thin layer)
│   │   └── sheet.controller.ts
│   │
│   ├── services/         # Business logic (fat layer)
│   │   └── sheet.service.ts
│   │
│   ├── routes/           # Route definitions
│   │   └── sheet.routes.ts
│   │
│   ├── middleware/       # Express middleware
│   │   └── errorHandler.ts
│   │
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── index.ts          # Application entry point
│
└── prisma/
    └── schema.prisma     # Database schema
```

### Layered Architecture Pattern

1. **Routes Layer** (`routes/`)
   - Define API endpoints
   - Map HTTP methods to controllers
   - Apply route-specific middleware

2. **Controllers Layer** (`controllers/`)
   - Handle HTTP request/response
   - Validate input data
   - Call service layer
   - Format responses

3. **Services Layer** (`services/`)
   - Business logic implementation
   - Database operations via Prisma
   - Complex calculations
   - Data transformations

4. **Data Access Layer** (Prisma)
   - Database queries
   - Type-safe operations
   - Automatic migrations

## Frontend Architecture

### Component Hierarchy

```
App
├── Layout
│   ├── Header (Logo, Navigation)
│   └── Main (Content Area)
│       │
│       ├── HomePage
│       │   ├── SheetList
│       │   └── CreateSheetForm
│       │
│       └── SheetPage
│           ├── SheetHeader
│           ├── SheetToolbar
│           └── SheetGrid
│               ├── GridHeader (Columns)
│               ├── GridBody (Rows)
│               └── GridCell (Editable)
```

### State Management Strategy

#### Server State (React Query)
- API data fetching and caching
- Automatic refetching and synchronization
- Optimistic updates
- Query invalidation

```typescript
// Example: Fetching sheets
const { data: sheets } = useQuery({
  queryKey: ['sheets'],
  queryFn: sheetApi.getAll,
});

// Example: Creating sheet
const createMutation = useMutation({
  mutationFn: sheetApi.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['sheets'] });
  },
});
```

#### Client State (Zustand - Planned)
- UI state (modals, sidebar, theme)
- User preferences
- Temporary editing state

### Frontend Code Organization

```
frontend/
├── src/
│   ├── components/       # Reusable components
│   │   └── Layout.tsx
│   │
│   ├── pages/            # Page-level components
│   │   ├── HomePage.tsx
│   │   └── SheetPage.tsx
│   │
│   ├── services/         # API client
│   │   └── api.ts
│   │
│   ├── hooks/            # Custom React hooks
│   │   └── useSheet.ts (planned)
│   │
│   ├── types/            # TypeScript types
│   │   └── index.ts
│   │
│   ├── utils/            # Helper functions
│   ├── store/            # Zustand stores
│   │
│   ├── App.tsx           # Root component
│   ├── main.tsx          # Application entry
│   └── index.css         # Global styles
```

## Deployment Architecture

### Docker Compose Setup

```
┌──────────────────────────────────────────┐
│         Docker Host (Droplet)             │
│                                           │
│  ┌────────────────────────────────────┐  │
│  │  Nginx Container (Port 80/443)     │  │
│  │  - Reverse Proxy                   │  │
│  │  - SSL Termination                 │  │
│  └────────────────────────────────────┘  │
│            │              │               │
│            ▼              ▼               │
│  ┌──────────────┐  ┌──────────────────┐  │
│  │  Frontend    │  │  Backend         │  │
│  │  (Nginx)     │  │  (Node.js)       │  │
│  │  Port: 5173  │  │  Port: 3000      │  │
│  └──────────────┘  └──────────────────┘  │
│                            │              │
│                            ▼              │
│                    ┌──────────────────┐  │
│                    │  PostgreSQL      │  │
│                    │  Port: 5432      │  │
│                    │  Volume: Data    │  │
│                    └──────────────────┘  │
└──────────────────────────────────────────┘
```

### Container Details

1. **Nginx Proxy Container**
   - Routes requests to appropriate services
   - Handles SSL termination
   - Implements rate limiting
   - Serves static files with caching

2. **Backend Container**
   - Multi-stage Docker build
   - Runs database migrations on startup
   - Exposes health check endpoint
   - Logs to stdout/stderr

3. **Frontend Container**
   - Built with Vite (optimized bundle)
   - Served by Nginx
   - SPA routing handled correctly
   - Static assets cached

4. **PostgreSQL Container**
   - Persistent volume for data
   - Health checks configured
   - Automated backups (planned)

### Deployment Flow

```
Developer → Git Push → Manual Deploy Script → Droplet
                           │
                           ├─ Package Application
                           ├─ Upload via SSH
                           ├─ Install Docker (if needed)
                           ├─ Build Containers
                           ├─ Run Migrations
                           └─ Start Services
```

## Security Architecture

### Authentication (Phase 2)
- JWT-based authentication
- HttpOnly cookies for token storage
- Refresh token rotation
- Password hashing with bcrypt

### Authorization (Phase 2)
- Role-based access control (RBAC)
- Resource-level permissions
- Workspace isolation (multi-tenancy)

### Current Security Measures
- Helmet.js for HTTP headers
- CORS configuration
- Input sanitization via Prisma
- Rate limiting in Nginx
- SQL injection prevention (Prisma)

### Planned Security Enhancements
- HTTPS/SSL with Let's Encrypt
- CSP (Content Security Policy)
- CSRF protection
- Request signing
- Audit logging
- Encryption at rest
- Regular security audits

## Scalability Considerations

### Current Limitations
- Single server deployment
- No horizontal scaling
- No caching layer
- No CDN

### Future Scalability

#### Horizontal Scaling
```
                Load Balancer
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
    Backend 1     Backend 2     Backend 3
        └─────────────┼─────────────┘
                      │
                PostgreSQL
              (Managed Service)
```

#### Performance Optimizations
- Redis for caching and sessions
- CDN for static assets
- Database read replicas
- Connection pooling
- Query optimization
- Lazy loading
- Virtual scrolling for large sheets

## Monitoring & Observability (Planned)

### Logging
- Structured logging with Winston
- Log aggregation (ELK/Loki)
- Error tracking (Sentry)

### Metrics
- Application metrics (Prometheus)
- Visualization (Grafana)
- Uptime monitoring
- Performance monitoring

### Health Checks
- Backend: `/health` endpoint
- Database: Connection check
- Frontend: Served correctly

## Data Flow Examples

### Creating a New Sheet

```
User → Frontend → Backend → Database
  │                           │
  │  POST /api/v1/sheets      │
  │  { name, description }    │
  │                           │
  └──→ SheetController        │
       └──→ SheetService      │
            └──→ Prisma       │
                 └──→ PostgreSQL
                      │
                 INSERT INTO sheets
                      │
                 ← Created sheet
            ← sheet object
       ← {status, data}
  ← HTTP 201 + sheet data
```

### Editing a Cell

```
User → Frontend → Backend → Database
  │                           │
  │  Click cell → Edit        │
  │  Blur/Enter               │
  │                           │
  │  PUT /cells/:cellId       │
  │  { value: "new value" }   │
  │                           │
  └──→ SheetController        │
       └──→ SheetService      │
            └──→ Prisma       │
                 └──→ PostgreSQL
                      │
                 UPDATE cells SET value
                      │
                 ← Updated cell
            ← cell object
       ← {status, data}
  ← HTTP 200 + cell data
  │
  React Query invalidates
  Sheet refetches
  UI updates
```

## Testing Strategy (Planned)

### Backend Testing
- Unit tests (Jest)
- Integration tests (Supertest)
- E2E tests (Playwright)

### Frontend Testing
- Component tests (React Testing Library)
- E2E tests (Playwright)

### Load Testing
- Artillery or k6
- Stress testing for concurrent users

## Performance Targets

### Response Times
- API: < 200ms (95th percentile)
- Page Load: < 2s
- Cell Edit: < 100ms

### Throughput
- API: 100 req/s per instance
- Concurrent Users: 1000+ (with scaling)

### Database
- Query Time: < 50ms (95th percentile)
- Connection Pool: 20 connections

## Disaster Recovery

### Backup Strategy
- Daily automated PostgreSQL backups
- Point-in-time recovery
- Backup retention: 30 days

### Recovery Procedures
1. Database restore from backup
2. Redeploy containers
3. Verify data integrity
4. Update DNS if needed

## Future Enhancements

### Phase 2: User Management
- Authentication system
- Multi-tenant architecture
- User workspaces
- Permission system

### Phase 3: Advanced Features
- Real-time collaboration (WebSockets)
- Formula engine
- Report builder
- Dashboard creator
- Workflow automation
- Third-party integrations
- Mobile app

### Phase 4: Enterprise
- SSO (SAML, OAuth)
- Advanced security
- Compliance (SOC 2, GDPR)
- SLA guarantees
- Dedicated support
- White-labeling
