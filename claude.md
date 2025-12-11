# SheetIsSmart - Project Knowledge Base

## Project Overview

SheetIsSmart is a B2B workspace management platform that provides spreadsheet-like functionality with collaboration features. Users can create sheets, manage data with different column types, collaborate with others, and add comments to rows.

**Tech Stack:**
- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **State Management**: Zustand, TanStack Query (React Query)
- **UI Components**: Custom components with lucide-react icons
- **Deployment**: Docker Compose on DigitalOcean (134.209.13.154)

## Repository Structure

```
sheetissmart/
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   ├── types/        # TypeScript type definitions
│   │   └── store/        # Zustand stores
│   └── package.json
├── backend-service/       # Express backend application
│   ├── src/
│   │   ├── controllers/  # Route controllers
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Express middleware
│   │   └── index.ts      # Entry point
│   ├── prisma/
│   │   └── schema.prisma # Database schema
│   └── package.json
└── infra/                 # Infrastructure and deployment
    ├── docker-compose.yml
    └── .env
```

## Database Schema (Prisma)

### Core Models

**User**
- Authentication and user management
- Relations: sheets (owned), sharesCreated, sharesReceived, rowComments

**Sheet**
- Primary workspace entity
- Fields: name, description, isFavorite, userId
- Relations: user (owner), columns, rows, cells, shares

**Column**
- Defines sheet columns with types
- Fields: name, type (ColumnType enum), position, width
- Types: TEXT, NUMBER, DATE, DROPDOWN, CHECKBOX, FORMULA
- Unique constraint: [sheetId, position]

**Row**
- Represents rows in a sheet
- Fields: name (optional custom name), position, height
- Relations: sheet, cells, comments
- Unique constraint: [sheetId, position]

**Cell**
- Individual data cells at row-column intersections
- Fields: value (stored as string, can be JSON)
- Relations: sheet, row, column
- Unique constraint: [rowId, columnId]

**RowComment**
- Comments attached to rows (NOT cells)
- Fields: content, userId, rowId
- Relations: row, user
- API: `/api/sheets/:sheetId/rows/:rowId/comments`

**SheetShare**
- Sharing and permissions management
- Fields: sharedWithEmail, sharedWithId, permission (VIEWER/EDITOR)
- Relations: sheet, sharedBy, sharedWith
- Unique constraint: [sheetId, sharedWithEmail]

### Important Schema Notes

1. **Row Comments (Not Cell Comments)**: Comments are associated with entire rows, not individual cells
2. **Position-Based Indexing**: Both rows and columns use position fields with unique constraints
3. **Owner vs Shares**: Sheet owner is stored in Sheet.userId, not in SheetShare table
4. **Cascade Deletes**: All related data (columns, rows, cells, shares, comments) cascade delete when sheet is deleted

## API Structure

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `GET /api/auth/users` - Get all users (for sharing autocomplete)

### Sheets
- `GET /api/sheets` - Get all sheets (owned + shared)
- `POST /api/sheets` - Create sheet
- `GET /api/sheets/:id` - Get sheet with columns, rows, cells
- `PATCH /api/sheets/:id` - Update sheet
- `DELETE /api/sheets/:id` - Delete sheet
- `PATCH /api/sheets/:id/favorite` - Toggle favorite

### Sharing
- `GET /api/sheets/:id/shares` - Get sheet shares
- `POST /api/sheets/:id/share` - Share sheet with user
- `DELETE /api/sheets/:sheetId/shares/:shareId` - Remove share

### Columns
- `POST /api/sheets/:id/columns` - Create column
- `PATCH /api/sheets/:sheetId/columns/:columnId` - Update column
- `DELETE /api/sheets/:sheetId/columns/:columnId` - Delete column

### Rows
- `POST /api/sheets/:id/rows` - Create row
- `PATCH /api/sheets/:sheetId/rows/:rowId` - Update row
- `DELETE /api/sheets/:sheetId/rows/:rowId` - Delete row

### Cells
- `PATCH /api/sheets/:sheetId/cells/:rowId/:columnId` - Update cell value

### Comments
- `GET /api/sheets/:sheetId/rows/:rowId/comments` - Get row comments
- `POST /api/sheets/:sheetId/rows/:rowId/comments` - Create comment
- `DELETE /api/sheets/:sheetId/rows/:rowId/comments/:commentId` - Delete comment

## Frontend Architecture

### Key Components

**Pages:**
- `HomePage.tsx` - Dashboard showing all sheets
- `SheetPage.tsx` - Main sheet view with grid, toolbar, and sidebar
- `LoginPage.tsx` / `RegisterPage.tsx` - Authentication

**Layout Components:**
- `RightSidebar.tsx` - Reusable right sidebar (for comments, etc.)
- Backdrop: `bg-slate-900/10 backdrop-blur-[2px]` (NOT black!)

**Sheet Components:**
- `SheetGrid.tsx` - Main spreadsheet grid with virtualization
- `CommentsPanel.tsx` - Comment list and input form
- `ShareModal.tsx` - Share sheet modal with user autocomplete

**Important UI Notes:**
- All modal/sidebar backdrops use `bg-slate-900/10 backdrop-blur-[2px]` (light overlay)
- Comments icon shows on row headers (indigo when has comments, gray on hover)
- Share button shows "Access" for viewers, "Share" for editors/owners

### State Management

**Zustand Stores:**
- `authStore.ts` - Authentication state (user, token, login, logout)

**TanStack Query:**
- Used for all API data fetching and mutations
- Query keys follow pattern: `['sheets']`, `['sheet', sheetId]`, `['comments', sheetId, rowId]`
- Automatic cache invalidation on mutations

### Type Definitions (frontend/src/types/index.ts)

```typescript
interface Sheet {
  id: string;
  name: string;
  description?: string;
  isFavorite?: boolean;
  owner?: { id: string; name: string; email: string }; // Owner info
  columns?: Column[];
  rows?: Row[];
  _count?: { rows: number; columns: number };
}

interface Share {
  id: string;
  sharedWithEmail: string;
  permission: 'VIEWER' | 'EDITOR' | 'OWNER'; // OWNER added for frontend display
  sharedWith?: { name: string; email: string };
}
```

**Important**: The `OWNER` permission in Share interface is frontend-only for displaying the owner in the access list. Backend SheetShare only has VIEWER/EDITOR.

## Permissions System

### Three Permission Levels:
1. **OWNER** - Sheet creator, full control
2. **EDITOR** - Can edit and share with others
3. **VIEWER** - Read-only access

### Permission Logic:
- Sheet owner determined by `Sheet.userId` (NOT in SheetShare table)
- Editors can share sheets with others (not just owners)
- Viewers can see access list but cannot modify shares
- Owner always shown in access list (computed on frontend via `sharesWithOwner`)
- `isViewOnly` prop used throughout components to disable edit features

### Computing Permissions (SheetPage.tsx):
```typescript
const userPermission = sheet?.userId === user?.id
  ? 'OWNER'
  : shares?.find(s => s.sharedWithId === user?.id)?.permission || 'VIEWER';

const isViewOnly = userPermission === 'VIEWER';
```

## Recent Changes & Patterns

### Comments Architecture
- **Changed from cell-level to row-level** comments
- Comment icon appears on row headers in SheetGrid
- RightSidebar + CommentsPanel pattern (NOT modal dialog)
- Backend endpoints: `/api/sheets/:sheetId/rows/:rowId/comments`

### Share Modal Features
- User autocomplete dropdown (fetches all users from `/api/auth/users`)
- Shows owner at top of access list with "Owner" label
- Owner computed on frontend: `sharesWithOwner = [ownerShare, ...actualShares]`
- `isViewOnly` prop hides share form for viewers
- Delete button hidden for owner and viewers

### UI/UX Standards
- Backdrop colors: `bg-slate-900/10 backdrop-blur-[2px]` (never plain black)
- Textarea/input backgrounds: Explicitly set `bg-white text-slate-900`
- Color scheme: Indigo for primary actions, slate for neutral
- Icons: lucide-react library

## Deployment

### Infrastructure
- **Server**: DigitalOcean Droplet at 134.209.13.154
- **Access**: SSH with password `L&AnpRRw34P6m=u`
- **Deployment Path**: `/opt/sheetissmart/`
- **Method**: Docker Compose

### Deployment Script (infra/deploy.sh)
```bash
#!/bin/bash
sshpass -p "L&AnpRRw34P6m=u" ssh -o StrictHostKeyChecking=no root@134.209.13.154 <<'ENDSSH'
cd /opt/sheetissmart
git fetch origin
git reset --hard origin/main
cd infra
docker-compose down
docker-compose up -d --build
ENDSSH
```

### Deployment Commands
```bash
# Deploy from local
./infra/deploy.sh

# Manual deployment steps
sshpass -p "L&AnpRRw34P6m=u" ssh -o StrictHostKeyChecking=no root@134.209.13.154 "cd /opt/sheetissmart && git fetch origin && git reset --hard origin/main"
sshpass -p "L&AnpRRw34P6m=u" ssh -o StrictHostKeyChecking=no root@134.209.13.154 "cd /opt/sheetissmart/infra && docker-compose down && docker-compose up -d --build"

# Check deployment status
sshpass -p "L&AnpRRw34P6m=u" ssh -o StrictHostKeyChecking=no root@134.209.13.154 "cd /opt/sheetissmart/infra && docker-compose ps"
sshpass -p "L&AnpRRw34P6m=u" ssh -o StrictHostKeyChecking=no root@134.209.13.154 "cd /opt/sheetissmart/infra && docker-compose logs backend --tail=30"

# Database migrations run automatically on container startup via docker-entrypoint.sh
# Manual migration (if needed):
sshpass -p "L&AnpRRw34P6m=u" ssh -o StrictHostKeyChecking=no root@134.209.13.154 "cd /opt/sheetissmart/infra && docker-compose exec -T backend npx prisma migrate deploy"
```

### Important Deployment Notes
1. **Migrations run automatically** on backend container startup via `docker-entrypoint.sh`
2. Git reset with `--hard origin/main` to ensure clean state
3. `--build` flag forces Docker rebuild
4. Check logs after deployment to verify backend started correctly
5. Frontend builds during Docker build process (`npm run build`)

## Git Workflow

### Commit Message Format
```
Brief summary of changes

- Detailed bullet points
- Of what was changed
- And why

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Common Commit Flow
```bash
git add .
git commit -m "$(cat <<'EOF'
Your commit message here

- Bullet points
- Of changes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
git push origin main
```

## Development Workflow

### Local Development
```bash
# Frontend
cd frontend
npm run dev          # Starts on http://localhost:5173

# Backend
cd backend-service
npm run dev          # Starts on http://localhost:3000

# Database
cd backend-service
npm run db:studio    # Prisma Studio on http://localhost:5555
```

### Making Schema Changes
```bash
# 1. Update backend-service/prisma/schema.prisma
# 2. Generate Prisma client locally
cd backend-service
npx prisma generate

# 3. Create migration file
npx prisma migrate dev --name your_migration_name

# 4. Commit and push to GitHub (include migration files)
# 5. Deploy - migrations run automatically on container startup
./infra/deploy.sh
```

### TypeScript Build Check
```bash
# Frontend
cd frontend
npx tsc --noEmit

# Backend
cd backend-service
npm run build
```

## Common Issues & Solutions

### TypeScript Errors
- **Symptoms**: Build fails with type errors
- **Common Causes**:
  - Adding new fields to interfaces without updating all usage
  - Missing permission types (OWNER vs VIEWER/EDITOR)
  - Sheet.owner field missing in types
- **Solution**: Update `frontend/src/types/index.ts` and component interfaces

### Black Backgrounds in Modals
- **Symptoms**: Modal/sidebar backdrops appear black instead of light
- **Root Cause**: Using `bg-black` or `bg-black/50` instead of proper slate colors
- **Solution**: Use `bg-slate-900/10 backdrop-blur-[2px]` for all backdrops

### Comments Not Showing
- **Check**: Are you using row-level endpoints (`/rows/:rowId/comments`)?
- **Not**: Cell-level endpoints (these no longer exist)
- **Model**: RowComment (not CellComment)

### Deployment Failures
1. Check TypeScript compilation locally first: `npx tsc --noEmit`
2. Check backend logs: `docker-compose logs backend --tail=50`
3. Verify database connection in docker-compose.yml
4. Ensure Prisma client is generated: `npx prisma generate`

### Owner Not in Access List
- **Frontend Fix**: Use `useMemo` to create `sharesWithOwner` array
- **Pattern**: `[{ id: 'owner', permission: 'OWNER' as const, ... }, ...shares]`
- **Location**: SheetPage.tsx

## Feature Flags & Upcoming Work

### Recently Completed
- ✅ Right sidebar for comments (replacing modal)
- ✅ Row-level comments (changed from cell-level)
- ✅ Share access for editors (not just owners)
- ✅ Viewers can see access list
- ✅ Owner shown in access list
- ✅ Light backdrop colors throughout
- ✅ Undo/Redo for cell formatting
- ✅ Drag selection (rectangle selection like Google Sheets)
- ✅ Playwright E2E testing framework

### In Progress / Planned
- ⏳ Row Hierarchy & Indentation (parent-child rows)
- ⏳ Sorting (multi-column, persistent)
- ⏳ Advanced Filtering UI

## Current Feature Capabilities (as of Dec 2024)

### Column Types (6 types)
- TEXT, NUMBER, DATE, DROPDOWN, CHECKBOX, FORMULA

### Cell Formatting (Fully Implemented)
- Text: Bold, Italic, Underline, Strikethrough
- Font: Family, Size (8-72pt)
- Colors: Text color, Background/fill color
- Alignment: Horizontal (left/center/right), Vertical (top/middle/bottom)
- Number formats: General, Number, Currency, Percentage, Date formats
- Advanced: Text wrapping, rotation (-90 to 90°), decimal places
- Borders: Individual control (top/bottom/left/right)
- Cell merging: Merge/unmerge with row/column span

### Advanced Features (DB Ready, Partial UI)
- **Conditional Formatting**: Rules in DB (ConditionalFormat model)
- **Charts**: Bar, Column, Line, Area, Scatter, Pie, Doughnut (Chart model)
- **Data Validation**: Dropdown, Number, Text, Date, Formula (DataValidation model)
- **Pivot Tables**: Row/column/value fields, aggregations (PivotTable model)
- **Filtering**: Basic text filter per column
- **Notifications**: Model exists for comment/share alerts

### Key Component Files
- `frontend/src/components/Toolbar.tsx` - Main formatting toolbar
- `frontend/src/components/MenuBar.tsx` - Menu bar with sheet operations
- `frontend/src/components/SheetTable/SheetTable.tsx` - Grid component
- `frontend/src/components/*Panel.tsx` - Feature panels
- `frontend/src/types/index.ts` - All TypeScript interfaces
- `backend-service/prisma/schema.prisma` - Database models

## Smartsheet Parity Roadmap

### Phase 1: Core Data Modeling (HIGH PRIORITY)
| Feature | Status | Notes |
|---------|--------|-------|
| Row Hierarchy/Indentation | 🔴 Missing | Parent-child rows, tree view, expand/collapse |
| Multi-column Sorting | 🔴 Missing | Sort by multiple columns, persist sort order |
| Advanced Filter UI | 🟡 Partial | Need operators (equals, contains, between), AND/OR |
| Additional Column Types | 🔴 Missing | MULTISELECT, ATTACHMENT, USER, PROGRESS |

### Phase 2: Essential Views (HIGH PRIORITY)
| Feature | Status | Notes |
|---------|--------|-------|
| Timeline/Gantt View | 🔴 Missing | Date range bars, dependencies, critical path |
| Card/Kanban View | 🔴 Missing | Board layout, drag-drop, status swimlanes |
| Forms View | 🔴 Missing | Form builder, submissions, pre-fill links |

### Phase 3: Automation (MEDIUM PRIORITY)
| Feature | Status | Notes |
|---------|--------|-------|
| Workflows | 🔴 Missing | Triggers, actions, scheduled automations |
| Webhooks | 🔴 Missing | Event-driven integrations |
| Bulk Operations | 🔴 Missing | Find/replace, bulk edit, duplicate rows |

### Phase 4: Reporting (MEDIUM PRIORITY)
| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard View | 🔴 Missing | Combine multiple reports/charts |
| Export (CSV/PDF) | 🔴 Missing | Formatted export options |
| Report Builder | 🔴 Missing | Advanced aggregations |

### Phase 5: Collaboration (MEDIUM PRIORITY)
| Feature | Status | Notes |
|---------|--------|-------|
| Cell History/Audit | 🔴 Missing | Who changed what and when |
| Real-time Cursors | 🔴 Missing | See other users' positions |
| @Mentions | 🟡 Partial | UI exists, notifications partial |
| Column/Row Permissions | 🔴 Missing | Granular access control |

## Testing

### Frontend Testing
- Framework: Vitest + Testing Library
- Run: `npm test`
- Coverage: `npm run test:coverage`

### Manual Testing Checklist
1. Authentication (register, login, logout)
2. Sheet CRUD (create, read, update, delete)
3. Sharing (share with editor/viewer, remove share)
4. Comments (view, create on rows)
5. Permissions (viewer read-only, editor can edit/share)
6. Cell editing (all column types)
7. Favorites (toggle favorite status)

## Environment Variables

### Backend (.env)
```
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
NODE_ENV="production"
PORT=3000
```

### Frontend
- API URL configured in services/api.ts
- Production: Uses relative URLs
- Development: http://localhost:3000

## API Response Patterns

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

### Pagination (if implemented)
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

## Performance Considerations

1. **Sheet Grid**: Uses virtualization for large datasets
2. **Query Caching**: TanStack Query caches all GET requests
3. **Optimistic Updates**: Cell edits update UI before server response
4. **Batch Operations**: Consider batching cell updates for performance

## Security Notes

1. **Authentication**: JWT tokens stored in localStorage
2. **Authorization**: Permission checks on all API endpoints
3. **CORS**: Configured in backend for frontend domain
4. **SQL Injection**: Prisma ORM prevents SQL injection
5. **XSS**: React automatically escapes content
6. **Secrets**: Never commit .env files

## Debugging Tips

### Frontend
```javascript
// Enable React Query DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// Check authentication state
console.log(useAuthStore.getState())
```

### Backend
```typescript
// Winston logger available
import logger from './config/logger';
logger.info('Debug message', { data });
```

### Database
```bash
# Connect to Prisma Studio
npx prisma studio

# View logs
docker-compose logs postgres
```

## Resources

- React Query: https://tanstack.com/query/latest
- Prisma Docs: https://www.prisma.io/docs
- TailwindCSS: https://tailwindcss.com/docs
- Lucide Icons: https://lucide.dev

## Contact & Support

- **Owner**: Karan Singla
- **Repository**: Private
- **Deployment Server**: 134.209.13.154

---

Last Updated: 2025-12-11
