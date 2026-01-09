# VEERA Student Dashboard Frontend

React 18 application for the VEERA Student Dashboard with mobile-first design.

## Features

- ✅ React 18 with TypeScript
- ✅ Tailwind CSS for styling
- ✅ Lucide React icons
- ✅ API-driven data fetching
- ✅ Role-based routing
- ✅ Mobile-first responsive layout
- ✅ Skill bars widget
- ✅ Active projects widget
- ✅ Submissions status widget
- ✅ Notifications widget

## Tech Stack

- **React 18**: Latest React with hooks
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful icon library
- **React Router**: Client-side routing
- **Axios**: HTTP client for API calls

## Getting Started

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:3001`

### Build

```bash
npm run build
```

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── SkillBarsWidget.tsx
│   │   │   ├── ActiveProjectsWidget.tsx
│   │   │   ├── SubmissionsWidget.tsx
│   │   │   └── NotificationsWidget.tsx
│   │   └── ProtectedRoute.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   └── StudentDashboard.tsx
│   ├── services/
│   │   ├── api.ts
│   │   └── dashboardService.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Widgets

### Skill Bars Widget
- Displays skill progress with visual bars
- Shows average level and progress
- Groups skills by category
- Recent skills display

### Active Projects Widget
- Lists active project assignments
- Shows due dates and overdue status
- Submission status indicators
- Project details and notes

### Submissions Widget
- Displays submitted projects
- Shows grades and feedback
- Status indicators (submitted, graded, returned)
- Submission dates

### Notifications Widget
- Real-time notifications
- Unread count badge
- Type-based styling (info, success, warning, error)
- Time-relative formatting

## API Integration

The frontend connects to the backend API at `/api/v1`:

- **Login**: `POST /auth/login`
- **Dashboard**: `GET /student-dashboard/my-dashboard`

All requests include:
- `Authorization: Bearer <token>` header
- `X-Active-Role: Student` header

## Authentication

- JWT token stored in localStorage
- Active role stored in localStorage
- Automatic token refresh handling
- Protected routes with role checking

## Responsive Design

### Mobile First
- Base styles optimized for mobile
- Breakpoints:
  - `sm`: 640px (tablets)
  - `lg`: 1024px (desktops)

### Layout
- Single column on mobile
- Two-column grid on desktop (main content + sidebar)
- Sticky header
- Card-based widgets

## Role-Based Routing

- `/login`: Public login page
- `/dashboard`: Protected student dashboard
- Automatic redirect if not authenticated
- Role validation on protected routes

## Styling

Uses Tailwind CSS with custom configuration:
- Primary color: Blue scale
- Card components
- Button variants
- Responsive utilities

## Environment Setup

The app proxies API requests to the backend:
- Development: `http://localhost:3000`
- Configured in `vite.config.ts`

## Development Notes

- TypeScript strict mode enabled
- ESLint configured
- Hot module replacement (HMR) enabled
- Source maps for debugging

