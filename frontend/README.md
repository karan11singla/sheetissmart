# SheetIsSmart - Frontend

React frontend application for SheetIsSmart B2B workspace management platform.

## Tech Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: React Query + Zustand
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios

## Prerequisites

- Node.js 18 or higher
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

3. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Features

### Current (MVP)
- Sheet listing and creation
- Interactive sheet grid interface
- Add/remove columns and rows
- Edit cell values
- Real-time updates via React Query

### Coming Soon
- User authentication
- Multi-user collaboration
- Cell formatting options
- Formula support
- Keyboard shortcuts
- Drag-and-drop column reordering
- Export/import functionality

## Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   │   └── Layout.tsx
│   ├── pages/          # Page components
│   │   ├── HomePage.tsx
│   │   └── SheetPage.tsx
│   ├── services/       # API services
│   │   └── api.ts
│   ├── types/          # TypeScript type definitions
│   │   └── index.ts
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   ├── store/          # State management
│   ├── App.tsx         # Main app component
│   ├── main.tsx        # App entry point
│   └── index.css       # Global styles
├── public/             # Static assets
├── index.html          # HTML template
└── package.json
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## API Integration

The frontend communicates with the backend API at `http://localhost:3000` (configurable via `VITE_API_URL`).

API client is located at `src/services/api.ts` and uses Axios for HTTP requests.

## Styling

The app uses Tailwind CSS for styling with a custom color palette:

- Primary colors: Blue shades (primary-50 to primary-900)
- Background: Gray-50
- Text: Gray-900

## State Management

- **React Query**: Server state management (API data fetching, caching, and synchronization)
- **Zustand** (planned): Client state management for UI state

## Development Guidelines

### Component Structure
- Use functional components with hooks
- Prefer composition over inheritance
- Keep components small and focused

### Type Safety
- All API responses should be typed
- Use TypeScript strict mode
- Avoid `any` types

### Styling
- Use Tailwind utility classes
- Follow mobile-first responsive design
- Maintain consistent spacing and colors

## Building for Production

```bash
# Build the app
npm run build

# Preview the build
npm run preview
```

The build output will be in the `dist/` directory.

## Deployment

The frontend can be deployed to any static hosting service:

- Vercel
- Netlify
- Digital Ocean App Platform
- AWS S3 + CloudFront
- Nginx (on droplet)

Make sure to set the `VITE_API_URL` environment variable to point to your production backend API.

## Troubleshooting

### Port already in use
If port 5173 is already in use, Vite will automatically try the next available port.

### API connection errors
Make sure the backend is running on the correct port and the `VITE_API_URL` is set correctly.

## Next Steps

- [ ] Add keyboard shortcuts (arrow keys for navigation)
- [ ] Implement cell formatting (bold, italic, colors)
- [ ] Add column type-specific editors (date picker, dropdown)
- [ ] Implement undo/redo functionality
- [ ] Add copy/paste support
- [ ] Create dashboard view
- [ ] Implement report builder
