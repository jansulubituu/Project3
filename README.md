# 📚 EduLearn - E-Learning Platform

> Nền tảng học trực tuyến hiện đại, chuyên nghiệp được xây dựng với **Next.js 14**, **Express.js** và **MongoDB Atlas**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.18-green?style=flat-square&logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=flat-square&logo=mongodb)](https://www.mongodb.com/)

---

## 🎯 Về Dự Án

EduLearn là nền tảng học trực tuyến full-stack với đầy đủ tính năng:
- 🎓 **Quản lý khóa học** - Tạo, chỉnh sửa, publish courses
- 📹 **Video-based learning** - Upload và xem video bài giảng
- 📊 **Progress tracking** - Theo dõi tiến độ học tập chi tiết
- 💳 **Payment integration** - Thanh toán qua Stripe
- ⭐ **Reviews & Ratings** - Đánh giá và review khóa học
- 🎨 **Modern UI/UX** - TailwindCSS + shadcn/ui
- 🔐 **Secure authentication** - JWT-based auth system
- 📱 **Responsive design** - Mobile-friendly

---

## 📖 Documentation

### 🚀 **[QUICKSTART.md](./QUICKSTART.md)** ← **BẮT ĐẦU Ở ĐÂY!**
Overview nhanh về toàn bộ dự án, tài liệu có sẵn và cách bắt đầu.

### 📋 Tài liệu chi tiết:

| File | Mô tả | Khi nào đọc |
|------|-------|-------------|
| **[PROJECT_PLAN.md](./PROJECT_PLAN.md)** | Kế hoạch dự án đầy đủ nhất | Đọc đầu tiên để hiểu tổng quan |
| **[docs/GETTING_STARTED.md](./docs/GETTING_STARTED.md)** | Hướng dẫn setup từ A-Z | Khi bắt đầu setup môi trường |
| **[docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)** | Chi tiết database structure | Khi implement models |
| **[docs/API.md](./docs/API.md)** | API endpoints documentation | Khi build APIs hoặc integrate |
| **[docs/ENV_TEMPLATE.md](./docs/ENV_TEMPLATE.md)** | Environment variables | Khi setup .env files |
| **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** | Production deployment guide | Khi ready to deploy |

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ 
- npm hoặc yarn
- MongoDB Atlas account
- Cloudinary account (cho upload media)

### Installation

#### 1. Clone repository
```bash
git clone <repository-url>
cd Project3
```

#### 2. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Cập nhật các environment variables trong .env
npm run dev
```

#### 3. Setup Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Cập nhật các environment variables trong .env.local
npm run dev
```

### Environment Variables

**Backend (.env)**
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
NODE_ENV=development
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
NEXT_PUBLIC_STRIPE_KEY=your_stripe_public_key
```

## 📖 Documentation

- [Project Plan](./PROJECT_PLAN.md) - Kế hoạch dự án chi tiết
- [Database Schema](./docs/DATABASE_SCHEMA.md) - Cấu trúc database
- [API Documentation](./docs/API.md) - API endpoints

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT

## 🎯 Features

- ✅ Authentication & Authorization
- ✅ Course Management (CRUD)
- ✅ Video-based Learning
- ✅ Progress Tracking
- ✅ Reviews & Ratings
- ✅ Payment Integration (Stripe)
- ✅ Student/Instructor/Admin Dashboards
- ✅ Certificate Generation

## 📁 Project Structure

```
Project3/
├── frontend/          # Next.js application
├── backend/           # Express.js API
├── docs/              # Documentation
└── README.md
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🚀 Deployment

### Frontend (Vercel)
```bash
cd frontend
vercel deploy --prod
```

### Backend (Railway/Render)
```bash
cd backend
# Follow platform-specific deployment instructions
```

## 📝 Available Scripts

### Backend (`cd backend`)
```bash
npm run dev          # Start dev server with hot reload
npm run build        # Compile TypeScript to JavaScript
npm start            # Start production server
npm test             # Run tests (when implemented)
npm run lint         # Lint code (when configured)
```

### Frontend (`cd frontend`)
```bash
npm run dev          # Start Next.js dev server
npm run build        # Build for production
npm start            # Start production server
npm test             # Run tests (when implemented)
npm run lint         # Run ESLint
```

---

## 🏗️ Project Status

### ✅ Phase 0: Planning & Setup (COMPLETED - 24/11/2024)
- [x] Project structure defined
- [x] Tech stack decided
- [x] Database schema designed
- [x] API endpoints planned
- [x] Development roadmap created
- [x] All documentation written
- [x] **Backend structure initialized** ✨
- [x] **Frontend structure initialized** ✨
- [x] **Base code implemented** ✨

### 📋 Next Steps: Ready for Development!
1. **Install dependencies** - `npm install` (backend & frontend)
2. **Configure MongoDB Atlas** - Follow docs/GETTING_STARTED.md
3. **Setup environment variables** - Create .env files
4. **Run servers** - `npm run dev` in both folders
5. **Start Phase 1** - Authentication system

**👉 Follow: [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)**  
**Xem chi tiết roadmap trong [PROJECT_PLAN.md](./PROJECT_PLAN.md)**

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Team

HUST - Project 3 - 2024

## 📞 Support

For support, email your-email@example.com or create an issue in the repository.

---

**Happy Learning! 🎓**

