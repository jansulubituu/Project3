# 🎨 EduLearn Frontend

Frontend application cho EduLearn E-Learning Platform được xây dựng với Next.js 14.

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- npm or yarn

### Installation

1. **Install dependencies**
```bash
npm install
```

2. **Setup environment variables**
```bash
cp .env.local.example .env.local
# Edit .env.local and fill in your values
```

3. **Start development server**
```bash
npm run dev
```

Application will start on `http://localhost:3000`

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Home page
│   │   └── globals.css   # Global styles
│   ├── components/       # React components
│   ├── lib/              # Utility functions
│   │   ├── api.ts        # API client (Axios)
│   │   └── utils.ts      # Helper functions
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript type definitions
│   │   └── index.ts      # Shared types
│   └── store/            # State management (Zustand)
├── public/               # Static assets
├── .env.local.example    # Environment variables example
├── next.config.js        # Next.js configuration
├── tailwind.config.ts    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
└── README.md
```

## 🎨 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form + Zod
- **Payment**: Stripe
- **Authentication**: NextAuth.js

## 🔧 Scripts

```bash
npm run dev         # Start development server
npm run build       # Build for production
npm start           # Start production server
npm run lint        # Lint code
npm run type-check  # TypeScript type checking
```

## 🌐 Environment Variables

See `.env.local.example` for all required environment variables.

Key variables:
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXTAUTH_URL` - NextAuth URL
- `NEXTAUTH_SECRET` - NextAuth secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe public key

## 📱 Features

- ✅ Server-side rendering (SSR)
- ✅ Static site generation (SSG)
- ✅ API routes
- ✅ Authentication with NextAuth
- ✅ Responsive design
- ✅ Dark mode ready
- ✅ SEO optimized
- ✅ Image optimization
- ✅ TypeScript support

## 📚 Documentation

- [API Documentation](../docs/API.md)
- [Getting Started](../docs/GETTING_STARTED.md)
- [Project Plan](../PROJECT_PLAN.md)

## 🎯 Next Steps

1. Setup authentication pages
2. Create course listing page
3. Build course detail page
4. Implement enrollment system
5. Add payment integration
6. Create dashboards

## 📝 License

MIT



