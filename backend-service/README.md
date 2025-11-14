# SheetIsSmart - Backend Service

RESTful API service for SheetIsSmart B2B workspace management platform.

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (Phase 2)

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 14 or higher
- npm or yarn

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Set up the database:
```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database (development)
npm run db:push

# Or run migrations (production)
npm run db:migrate
```

4. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Health Check
- `GET /health` - Service health check

### Sheets
- `POST /api/v1/sheets` - Create a new sheet
- `GET /api/v1/sheets` - Get all sheets
- `GET /api/v1/sheets/:id` - Get sheet by ID
- `PUT /api/v1/sheets/:id` - Update sheet
- `DELETE /api/v1/sheets/:id` - Delete sheet

### Columns
- `POST /api/v1/sheets/:id/columns` - Add column to sheet

### Rows
- `POST /api/v1/sheets/:id/rows` - Add row to sheet

### Cells
- `PUT /api/v1/sheets/:id/cells/:cellId` - Update cell value

## API Examples

### Create a Sheet
```bash
curl -X POST http://localhost:3000/api/v1/sheets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q1 Sales Data",
    "description": "Sales tracking for Q1 2025"
  }'
```

### Add a Column
```bash
curl -X POST http://localhost:3000/api/v1/sheets/{sheetId}/columns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Name",
    "type": "TEXT",
    "position": 0,
    "width": 200
  }'
```

### Add a Row
```bash
curl -X POST http://localhost:3000/api/v1/sheets/{sheetId}/rows \
  -H "Content-Type: application/json" \
  -d '{
    "position": 0
  }'
```

### Update a Cell
```bash
curl -X PUT http://localhost:3000/api/v1/sheets/{sheetId}/cells/{cellId} \
  -H "Content-Type: application/json" \
  -d '{
    "value": "iPhone 15"
  }'
```

## Project Structure

```
backend-service/
├── src/
│   ├── config/         # Configuration files (database, logger)
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Express middleware
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── types/          # TypeScript types
│   ├── utils/          # Utility functions
│   └── index.ts        # Application entry point
├── prisma/
│   └── schema.prisma   # Database schema
├── package.json
└── tsconfig.json
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run lint` - Run ESLint
- `npm test` - Run tests

## Development

The API uses Prisma ORM for database operations. Key concepts:

1. **Schema**: Defined in `prisma/schema.prisma`
2. **Migrations**: Database changes tracked in `prisma/migrations/`
3. **Client**: Auto-generated TypeScript client for type-safe database access

## Database Schema

Core entities:
- **Sheet**: Main container for data
- **Column**: Defines data structure (name, type, position)
- **Row**: Represents a row in the sheet
- **Cell**: Individual data points (intersection of row/column)

Column types:
- TEXT
- NUMBER
- DATE
- DROPDOWN
- CHECKBOX
- FORMULA

## Next Steps

- [ ] Add input validation (Joi schemas)
- [ ] Add unit tests
- [ ] Implement user authentication
- [ ] Add real-time updates (WebSockets)
- [ ] Implement formula engine
- [ ] Add bulk operations API
