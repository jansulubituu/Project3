# 🔧 EduLearn Backend API

Backend API cho EduLearn E-Learning Platform.

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB Atlas account
- npm or yarn

### Installation

1. **Install dependencies**
```bash
npm install
```

2. **Setup environment variables**
```bash
cp .env.example .env
# Edit .env and fill in your values
```

3. **Start development server**
```bash
npm run dev
```

Server will start on `http://localhost:5000`

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   └── database.ts   # MongoDB connection
│   ├── controllers/      # Route controllers
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   │   ├── auth.ts      # Authentication middleware
│   │   └── errorHandler.ts  # Error handling
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   │   └── jwt.ts       # JWT utilities
│   ├── types/           # TypeScript type definitions
│   │   └── express.d.ts # Express type extensions
│   └── server.ts        # App entry point
├── dist/                # Compiled JavaScript (generated)
├── .env.example         # Environment variables example
├── package.json
├── tsconfig.json        # TypeScript configuration
└── README.md
```

## 🔌 API Endpoints

### Health Check
```
GET /api/health - Check server status
```

### Authentication (Coming soon)
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

## 🛠️ Scripts

```bash
npm run dev       # Start development server with hot reload
npm run build     # Build for production
npm start         # Start production server
npm run lint      # Lint code
npm run lint:fix  # Lint and fix code
npm test          # Run tests
```

## 🔐 Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT tokens
- `FRONTEND_URL` - Frontend URL for CORS

## 🧪 Testing

```bash
npm test
```

## 📚 Documentation

- [API Documentation](../docs/API.md)
- [Database Schema](../docs/DATABASE_SCHEMA.md)
- [Getting Started](../docs/GETTING_STARTED.md)

## 🔒 Security

- JWT authentication
- Helmet for security headers
- CORS configuration
- Rate limiting
- Input validation

## 📝 License

MIT


