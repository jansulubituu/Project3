# 🚀 SETUP INSTRUCTIONS

Hướng dẫn cài đặt và chạy dự án EduLearn.

## ✅ Đã Setup Xong

Cấu trúc dự án và cấu hình cơ bản đã được tạo sẵn:

```
Project3/
├── backend/              ✅ Backend setup complete
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── types/
│   │   └── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── .eslintrc.json
│   └── .env.example
│
└── frontend/             ✅ Frontend setup complete
    ├── src/
    │   ├── app/
    │   ├── components/
    │   ├── lib/
    │   ├── hooks/
    │   ├── types/
    │   └── store/
    ├── public/
    ├── package.json
    ├── tsconfig.json
    ├── next.config.js
    ├── tailwind.config.ts
    └── .env.local.example
```

---

## 📝 BƯỚC TIẾP THEO

### 1. Install Dependencies (5-10 phút)

#### Backend
```bash
cd backend
npm install
```

Packages được cài đặt:
- ✅ express (Web framework)
- ✅ mongoose (MongoDB ODM)
- ✅ typescript (TypeScript support)
- ✅ jsonwebtoken (JWT authentication)
- ✅ bcryptjs (Password hashing)
- ✅ cors (CORS middleware)
- ✅ dotenv (Environment variables)
- ✅ multer (File uploads)
- ✅ cloudinary (Media storage)
- ✅ stripe (Payment processing)
- ✅ helmet (Security)
- ✅ morgan (Logging)

#### Frontend
```bash
cd ../frontend
npm install
```

Packages được cài đặt:
- ✅ next (Next.js framework)
- ✅ react (React library)
- ✅ typescript (TypeScript support)
- ✅ tailwindcss (CSS framework)
- ✅ axios (HTTP client)
- ✅ zustand (State management)
- ✅ react-hook-form (Form handling)
- ✅ zod (Schema validation)
- ✅ @stripe/stripe-js (Stripe integration)
- ✅ next-auth (Authentication)

---

### 2. Setup Environment Variables (5 phút)

#### Backend Environment

Tạo file `.env` trong thư mục `backend/`:
```bash
cd backend
cp .env.example .env
```

Chỉnh sửa `backend/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string_here
JWT_SECRET=your_jwt_secret_here
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
FRONTEND_URL=http://localhost:3000
```

#### Frontend Environment

Tạo file `.env.local` trong thư mục `frontend/`:
```bash
cd ../frontend
cp .env.local.example .env.local
```

Chỉnh sửa `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_public_key
```

**📚 Xem chi tiết**: `docs/ENV_TEMPLATE.md` để biết cách lấy credentials

---

### 3. Setup MongoDB Atlas (10-15 phút)

**Quan trọng**: Bạn cần MongoDB connection string trước khi chạy backend.

Làm theo hướng dẫn chi tiết trong:
```
docs/GETTING_STARTED.md (Step 2: Setup MongoDB Atlas)
```

Quick steps:
1. Tạo cluster trên MongoDB Atlas
2. Create database user
3. Configure network access (Allow 0.0.0.0/0)
4. Get connection string
5. Update `MONGODB_URI` trong `backend/.env`

---

### 4. Run Development Servers

#### Terminal 1: Backend
```bash
cd backend
npm run dev
```

Nếu thành công, bạn sẽ thấy:
```
✅ MongoDB connected successfully
🚀 Server running on port 5000
📝 Environment: development
🔗 Health check: http://localhost:5000/api/health
```

#### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

Nếu thành công, bạn sẽ thấy:
```
✓ Ready in 3.5s
○ Compiled / in 2.1s
✓ Ready on http://localhost:3000
```

---

### 5. Test Connection

Mở browser và truy cập: `http://localhost:3000`

Bạn sẽ thấy trang home với:
- ✅ **Backend Connection Status**: Connected Successfully!
- ✅ Message từ backend
- ✅ Environment info
- ✅ Tech stack overview

Nếu thấy "Connection Failed":
- Kiểm tra backend có đang chạy không
- Kiểm tra `NEXT_PUBLIC_API_URL` trong frontend/.env.local
- Kiểm tra CORS settings trong backend

---

## 🎯 VERIFICATION CHECKLIST

Kiểm tra các điểm sau để đảm bảo setup thành công:

### Backend ✅
- [ ] `npm install` chạy không lỗi
- [ ] `.env` file đã tạo và fill values
- [ ] `npm run dev` chạy được
- [ ] MongoDB connection thành công
- [ ] Health check endpoint hoạt động: `http://localhost:5000/api/health`

### Frontend ✅
- [ ] `npm install` chạy không lỗi
- [ ] `.env.local` file đã tạo
- [ ] `npm run dev` chạy được
- [ ] Page hiển thị tại `http://localhost:3000`
- [ ] Backend connection status = ✅ Connected

---

## 🆘 Troubleshooting

### Issue: npm install lỗi
```bash
# Clear npm cache
npm cache clean --force
# Try again
npm install
```

### Issue: MongoDB connection failed
```
❌ Error connecting to MongoDB
```
**Solution**: 
- Check `MONGODB_URI` trong `.env`
- Verify network access trên MongoDB Atlas
- Check database user credentials

### Issue: Port already in use
```
❌ Error: listen EADDRINUSE: address already in use :::5000
```
**Solution**:
```bash
# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process

# Or change PORT in .env
PORT=5001
```

### Issue: Frontend không connect được backend
```
❌ Connection Failed
```
**Solution**:
- Check backend đang chạy trên port 5000
- Verify `NEXT_PUBLIC_API_URL` trong `.env.local`
- Check CORS config trong `backend/src/server.ts`

### Issue: TypeScript errors
**Solution**:
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run type-check
```

---

## 📚 Next Steps

Sau khi setup xong, làm theo các bước trong roadmap:

1. **Setup Cloudinary** (cho upload media)
   - Xem: `docs/GETTING_STARTED.md` Step 3

2. **Setup Stripe** (cho payment)
   - Xem: `docs/GETTING_STARTED.md` Step 4

3. **Start Coding!**
   - Follow roadmap trong `PROJECT_PLAN.md`
   - Phase 1: Authentication system
   - Phase 2: Course management
   - Phase 3: Learning experience
   - ...

---

## 📖 Documentation

- **[PROJECT_PLAN.md](./PROJECT_PLAN.md)** - Master plan chi tiết
- **[docs/GETTING_STARTED.md](./docs/GETTING_STARTED.md)** - Setup guide đầy đủ
- **[docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)** - Database structure
- **[docs/API.md](./docs/API.md)** - API documentation
- **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Deployment guide

---

## ✅ Setup Complete!

Nếu tất cả checklist đều ✅, bạn đã sẵn sàng để bắt đầu coding! 🎉

**Next**: Đọc `PROJECT_PLAN.md` và bắt đầu Phase 1 - Authentication System

---

**Created**: 24/11/2024  
**Last Updated**: 24/11/2024


