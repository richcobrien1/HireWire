# HireWire Frontend

Next.js 15 frontend for HireWire platform.

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Utility-first styling with CSS variables
- **Electric Theme** - Custom dark theme with bright accents

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Required variables:
- `NEXT_PUBLIC_API_URL` - API Gateway URL (default: http://localhost:4000)
- `NEXT_PUBLIC_MATCHING_ENGINE_URL` - Matching Engine URL (default: http://localhost:8001)
- `NEXT_PUBLIC_WS_URL` - WebSocket URL (default: ws://localhost:4000)

## Features

### Current
- ✅ Landing page with HireWire branding
- ✅ Electric theme (dark with bright accents)
- ✅ Responsive design
- ✅ CSS variables for theming

### Coming Soon
- 🔄 Career context questionnaire
- 🔄 Job swipe interface
- 🔄 Match dashboard
- 🔄 Real-time notifications
- 🔄 Chat interface
- 🔄 Profile management

## Project Structure

```
web/
├── app/                  # Next.js App Router
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page
│   └── globals.css      # Global styles + theme
├── components/          # React components (coming soon)
├── lib/                 # Utilities (coming soon)
├── public/              # Static assets
└── package.json         # Dependencies
```

## Theme Colors

- **Primary (Electric Blue)**: #00A8FF
- **Secondary (Lightning Yellow)**: #FFD700
- **Success (Neon Green)**: #00FF41
- **Warning (Orange Alert)**: #FF6B35
- **Background (Dark Navy)**: #0A1628
- **Card (Gray)**: #1E2A3A

## Development

This frontend connects to:
- API Gateway (port 4000) - Auth, profiles, onboarding
- Matching Engine (port 8001) - Career matching, AI insights
- WebSocket (port 4000) - Real-time notifications

Make sure all backend services are running.
