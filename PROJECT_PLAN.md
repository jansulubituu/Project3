# 📚 EDULEARN - KẾ HOẠCH DỰ ÁN WEBSITE HỌC TRỰC TUYẾN

## 🎯 TỔNG QUAN DỰ ÁN

### Mô tả
EduLearn là nền tảng học trực tuyến (E-Learning Platform) cho phép giảng viên tạo và quản lý khóa học, học viên đăng ký học và theo dõi tiến độ học tập của mình.

### Mục tiêu
- Tạo môi trường học tập trực tuyến hiện đại và dễ sử dụng
- Hỗ trợ nhiều định dạng nội dung: video, tài liệu, quiz
- Theo dõi tiến độ học tập chi tiết
- Hệ thống thanh toán an toàn
- Dashboard quản lý mạnh mẽ

---

## 🛠️ TECH STACK

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **State Management**: Zustand / Redux Toolkit
- **Form Handling**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Video Player**: Video.js / Plyr
- **Rich Text Editor**: TipTap / Quill

### Backend
- **Runtime**: Node.js v18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Authentication**: JWT + bcrypt
- **File Upload**: Multer + Cloudinary
- **Validation**: express-validator
- **API Documentation**: Swagger

### Database
- **Database**: MongoDB
- **Cloud Provider**: MongoDB Atlas
- **ODM**: Mongoose
- **Caching**: Redis (optional, future)

### DevOps & Tools
- **Version Control**: Git + GitHub
- **Package Manager**: npm / yarn
- **Testing**: Jest, Supertest, Playwright
- **Linting**: ESLint, Prettier
- **Deployment**: Vercel (Frontend), Railway/Render (Backend)

---

## 📁 CẤU TRÚC DỰ ÁN CHI TIẾT

```
Project3/
├── frontend/
│   ├── src/
│   │   ├── app/                      # Next.js App Router
│   │   │   ├── (auth)/              # Auth group
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   └── forgot-password/
│   │   │   ├── (student)/           # Student routes
│   │   │   │   ├── dashboard/
│   │   │   │   ├── courses/
│   │   │   │   ├── my-learning/
│   │   │   │   └── profile/
│   │   │   ├── (instructor)/        # Instructor routes
│   │   │   │   ├── instructor/
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── courses/
│   │   │   │   │   └── analytics/
│   │   │   ├── (admin)/             # Admin routes
│   │   │   │   └── admin/
│   │   │   │       ├── dashboard/
│   │   │   │       ├── users/
│   │   │   │       └── courses/
│   │   │   ├── course/              # Public course pages
│   │   │   │   └── [slug]/
│   │   │   ├── learn/               # Learning interface
│   │   │   │   └── [courseId]/
│   │   │   ├── api/                 # API routes
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── ui/                  # Base UI components
│   │   │   ├── layout/              # Layout components
│   │   │   ├── course/              # Course related
│   │   │   ├── lesson/              # Lesson components
│   │   │   ├── auth/                # Auth components
│   │   │   └── shared/              # Shared components
│   │   ├── lib/
│   │   │   ├── api.ts               # API client
│   │   │   ├── auth.ts              # Auth utilities
│   │   │   ├── utils.ts             # Helper functions
│   │   │   └── constants.ts         # Constants
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useCourse.ts
│   │   │   └── useEnrollment.ts
│   │   ├── types/
│   │   │   ├── user.ts
│   │   │   ├── course.ts
│   │   │   └── lesson.ts
│   │   ├── store/                   # State management
│   │   │   ├── authStore.ts
│   │   │   └── courseStore.ts
│   │   └── styles/
│   │       └── globals.css
│   ├── public/
│   │   ├── images/
│   │   └── icons/
│   ├── .env.local
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── userController.ts
│   │   │   ├── courseController.ts
│   │   │   ├── lessonController.ts
│   │   │   ├── enrollmentController.ts
│   │   │   ├── reviewController.ts
│   │   │   └── paymentController.ts
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Course.ts
│   │   │   ├── Section.ts
│   │   │   ├── Lesson.ts
│   │   │   ├── Enrollment.ts
│   │   │   ├── Progress.ts
│   │   │   ├── Review.ts
│   │   │   ├── Category.ts
│   │   │   └── Payment.ts
│   │   ├── routes/
│   │   │   ├── authRoutes.ts
│   │   │   ├── userRoutes.ts
│   │   │   ├── courseRoutes.ts
│   │   │   ├── lessonRoutes.ts
│   │   │   ├── enrollmentRoutes.ts
│   │   │   └── paymentRoutes.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts
│   │   │   ├── validation.ts
│   │   │   ├── roleCheck.ts
│   │   │   └── upload.ts
│   │   ├── services/
│   │   │   ├── emailService.ts
│   │   │   ├── uploadService.ts
│   │   │   ├── paymentService.ts
│   │   │   └── analyticsService.ts
│   │   ├── utils/
│   │   │   ├── jwt.ts
│   │   │   ├── validator.ts
│   │   │   └── helpers.ts
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── cloudinary.ts
│   │   │   └── stripe.ts
│   │   ├── types/
│   │   │   └── express.d.ts
│   │   └── server.ts
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── .env
│   ├── tsconfig.json
│   └── package.json
│
├── docs/
│   ├── API.md
│   ├── DATABASE_SCHEMA.md
│   └── DEPLOYMENT.md
│
├── .cursorrules
├── .gitignore
├── PROJECT_PLAN.md
└── README.md
```

---

## 🗄️ DATABASE SCHEMA

### 1. Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  fullName: String,
  avatar: String,
  role: Enum ['student', 'instructor', 'admin'],
  bio: String,
  headline: String, // For instructors
  website: String,
  social: {
    facebook: String,
    twitter: String,
    linkedin: String
  },
  isEmailVerified: Boolean,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Courses Collection
```javascript
{
  _id: ObjectId,
  title: String,
  slug: String (unique),
  description: String,
  shortDescription: String,
  instructor: ObjectId (ref: User),
  category: ObjectId (ref: Category),
  level: Enum ['beginner', 'intermediate', 'advanced'],
  thumbnail: String,
  previewVideo: String,
  price: Number,
  discountPrice: Number,
  language: String,
  requirements: [String],
  learningOutcomes: [String],
  tags: [String],
  status: Enum ['draft', 'published', 'archived'],
  enrollmentCount: Number,
  averageRating: Number,
  totalReviews: Number,
  duration: Number, // Total minutes
  createdAt: Date,
  updatedAt: Date
}
```

### 3. Sections Collection
```javascript
{
  _id: ObjectId,
  course: ObjectId (ref: Course),
  title: String,
  description: String,
  order: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### 4. Lessons Collection
```javascript
{
  _id: ObjectId,
  section: ObjectId (ref: Section),
  course: ObjectId (ref: Course),
  title: String,
  description: String,
  type: Enum ['video', 'article', 'quiz', 'assignment'],
  content: {
    videoUrl: String,
    duration: Number, // For video
    articleContent: String, // For article
    quizQuestions: [Object], // For quiz
    attachments: [String]
  },
  order: Number,
  isFree: Boolean, // Preview lesson
  createdAt: Date,
  updatedAt: Date
}
```

### 5. Enrollments Collection
```javascript
{
  _id: ObjectId,
  student: ObjectId (ref: User),
  course: ObjectId (ref: Course),
  enrolledAt: Date,
  progress: Number, // 0-100%
  completedLessons: [ObjectId],
  status: Enum ['active', 'completed', 'suspended'],
  lastAccessed: Date,
  certificateIssued: Boolean,
  certificateUrl: String,
  createdAt: Date,
  updatedAt: Date
}
```

### 6. Progress Collection
```javascript
{
  _id: ObjectId,
  enrollment: ObjectId (ref: Enrollment),
  student: ObjectId (ref: User),
  lesson: ObjectId (ref: Lesson),
  status: Enum ['not_started', 'in_progress', 'completed'],
  timeSpent: Number, // minutes
  lastPosition: Number, // For video position
  completedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### 7. Reviews Collection
```javascript
{
  _id: ObjectId,
  course: ObjectId (ref: Course),
  student: ObjectId (ref: User),
  rating: Number (1-5),
  comment: String,
  isPublished: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### 8. Categories Collection
```javascript
{
  _id: ObjectId,
  name: String,
  slug: String,
  description: String,
  icon: String,
  parent: ObjectId (ref: Category), // For subcategories
  courseCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### 9. Payments Collection
```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  course: ObjectId (ref: Course),
  amount: Number,
  currency: String,
  paymentMethod: Enum ['stripe', 'vnpay'],
  paymentIntent: String,
  status: Enum ['pending', 'completed', 'failed', 'refunded'],
  metadata: Object,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔌 API ENDPOINTS

### Authentication APIs
```
POST   /api/auth/register           - Đăng ký tài khoản
POST   /api/auth/login              - Đăng nhập
POST   /api/auth/logout             - Đăng xuất
POST   /api/auth/forgot-password    - Quên mật khẩu
POST   /api/auth/reset-password     - Reset mật khẩu
GET    /api/auth/me                 - Lấy thông tin user hiện tại
POST   /api/auth/verify-email       - Xác thực email
```

### User APIs
```
GET    /api/users/:id               - Lấy thông tin user
PUT    /api/users/:id               - Cập nhật thông tin
PUT    /api/users/:id/avatar        - Upload avatar
GET    /api/users/:id/courses       - Lấy danh sách khóa học
```

### Course APIs
```
GET    /api/courses                 - Lấy danh sách khóa học (public)
GET    /api/courses/:id             - Lấy chi tiết khóa học
POST   /api/courses                 - Tạo khóa học (instructor)
PUT    /api/courses/:id             - Cập nhật khóa học
DELETE /api/courses/:id             - Xóa khóa học
GET    /api/courses/:id/curriculum  - Lấy curriculum
POST   /api/courses/:id/publish     - Publish khóa học
```

### Section & Lesson APIs
```
POST   /api/courses/:id/sections                - Tạo section
PUT    /api/sections/:id                        - Cập nhật section
DELETE /api/sections/:id                        - Xóa section
POST   /api/sections/:id/lessons                - Tạo lesson
PUT    /api/lessons/:id                         - Cập nhật lesson
DELETE /api/lessons/:id                         - Xóa lesson
POST   /api/lessons/:id/upload-video           - Upload video
```

### Enrollment APIs
```
POST   /api/enrollments                         - Enroll khóa học
GET    /api/enrollments/my-courses              - Khóa học đã đăng ký
GET    /api/enrollments/:id                     - Chi tiết enrollment
PUT    /api/enrollments/:id/progress            - Cập nhật progress
POST   /api/enrollments/:id/complete            - Hoàn thành khóa học
```

### Review APIs
```
POST   /api/courses/:id/reviews                 - Tạo review
GET    /api/courses/:id/reviews                 - Lấy reviews
PUT    /api/reviews/:id                         - Cập nhật review
DELETE /api/reviews/:id                         - Xóa review
```

### Payment APIs
```
POST   /api/payments/create-intent              - Tạo payment intent
POST   /api/payments/confirm                    - Xác nhận thanh toán
GET    /api/payments/history                    - Lịch sử thanh toán
```

### Category APIs
```
GET    /api/categories                          - Lấy danh sách categories
GET    /api/categories/:id/courses              - Khóa học theo category
```

### Admin APIs
```
GET    /api/admin/users                         - Quản lý users
GET    /api/admin/courses                       - Quản lý courses
GET    /api/admin/analytics                     - Thống kê
PUT    /api/admin/users/:id/status              - Thay đổi trạng thái user
```

---

## 🎨 CORE FEATURES

### 1. Authentication & Authorization
- ✅ Đăng ký/Đăng nhập với email
- ✅ OAuth (Google, Facebook) - Optional
- ✅ Email verification
- ✅ Quên mật khẩu/Reset password
- ✅ JWT-based authentication
- ✅ Role-based access control (Student, Instructor, Admin)

### 2. User Management
- ✅ Profile management
- ✅ Avatar upload
- ✅ Instructor profile với bio, headline
- ✅ Social links
- ✅ Password change

### 3. Course Management (Instructor)
- ✅ Tạo/Chỉnh sửa khóa học
- ✅ Upload thumbnail, preview video
- ✅ Tổ chức theo sections & lessons
- ✅ Nhiều loại content: Video, Article, Quiz
- ✅ Drag & drop reorder
- ✅ Pricing & discounts
- ✅ Course status (Draft/Published/Archived)

### 4. Course Discovery (Student)
- ✅ Browse courses với filters
- ✅ Search functionality
- ✅ Category filtering
- ✅ Level filtering (Beginner/Intermediate/Advanced)
- ✅ Sort by: Popular, Newest, Rating, Price
- ✅ Course detail page
- ✅ Preview lessons
- ✅ Reviews & Ratings

### 5. Learning Experience
- ✅ Video player với controls
- ✅ Lesson navigation
- ✅ Progress tracking
- ✅ Mark as complete
- ✅ Course notes
- ✅ Q&A section (Future)
- ✅ Certificate generation
- ✅ Downloadable resources

### 6. Payment Integration
- ✅ Stripe integration
- ✅ VNPay integration (Optional)
- ✅ Shopping cart
- ✅ Secure checkout
- ✅ Payment history
- ✅ Invoice generation

### 7. Dashboard
**Student Dashboard:**
- My Learning
- Progress overview
- Continue learning section
- Wishlist
- Purchase history

**Instructor Dashboard:**
- Courses overview
- Student analytics
- Revenue tracking
- Course performance
- Reviews management

**Admin Dashboard:**
- User management
- Course approval
- Site analytics
- Payment management
- Content moderation

### 8. Reviews & Ratings
- ✅ 5-star rating system
- ✅ Written reviews
- ✅ Review moderation
- ✅ Helpful votes

### 9. Additional Features
- 🔔 Notifications system
- 📧 Email notifications
- 🔍 Advanced search
- 📱 Responsive design
- 🌙 Dark mode (Optional)
- 🌐 Multi-language (Future)

---

## 📋 DEVELOPMENT ROADMAP

### Phase 1: Setup & Foundation (Week 1-2)
**Goals**: Thiết lập môi trường và cấu trúc cơ bản

**Tasks:**
- [ ] Initialize project structure
  - [ ] Create Next.js frontend project
  - [ ] Create Express backend project
  - [ ] Setup TypeScript configuration
  - [ ] Configure ESLint & Prettier
- [ ] Database Setup
  - [ ] Create MongoDB Atlas cluster
  - [ ] Setup Mongoose models
  - [ ] Create database indexes
- [ ] Authentication System
  - [ ] Implement JWT authentication
  - [ ] Create auth middleware
  - [ ] Build login/register pages
  - [ ] Email verification flow
- [ ] Basic UI Setup
  - [ ] Install TailwindCSS & shadcn/ui
  - [ ] Create layout components
  - [ ] Setup theme & colors
  - [ ] Create navigation

### Phase 2: Core Features - User & Course Management (Week 3-4)
**Goals**: Xây dựng tính năng quản lý user và khóa học

**Tasks:**
- [ ] User Management
  - [ ] Profile page & edit
  - [ ] Avatar upload với Cloudinary
  - [ ] User dashboard
- [ ] Course Creation (Instructor)
  - [ ] Course form với validation
  - [ ] Thumbnail & video upload
  - [ ] Section & lesson CRUD
  - [ ] Curriculum builder với drag-drop
  - [ ] Rich text editor cho descriptions
- [ ] Course Display (Public)
  - [ ] Course listing page
  - [ ] Course detail page
  - [ ] Category pages
  - [ ] Search & filters
- [ ] Category Management
  - [ ] Category CRUD (Admin)
  - [ ] Category display

### Phase 3: Learning Experience (Week 5-6)
**Goals**: Xây dựng trải nghiệm học tập

**Tasks:**
- [ ] Enrollment System
  - [ ] Enroll API
  - [ ] Check enrollment status
  - [ ] My Learning page
- [ ] Learning Interface
  - [ ] Video player integration
  - [ ] Lesson navigation
  - [ ] Progress tracking
  - [ ] Mark complete functionality
  - [ ] Sidebar với curriculum
- [ ] Progress & Completion
  - [ ] Progress calculation
  - [ ] Course completion logic
  - [ ] Certificate generation
- [ ] Reviews & Ratings
  - [ ] Review submission
  - [ ] Rating calculation
  - [ ] Review display & moderation

### Phase 4: Payment Integration (Week 7)
**Goals**: Tích hợp thanh toán

**Tasks:**
- [ ] Stripe Setup
  - [ ] Configure Stripe
  - [ ] Create payment intent API
  - [ ] Checkout page
  - [ ] Payment confirmation
  - [ ] Webhook handling
- [ ] Shopping Flow
  - [ ] Add to cart
  - [ ] Cart page
  - [ ] Checkout process
- [ ] Payment History
  - [ ] Purchase history page
  - [ ] Invoice generation

### Phase 5: Dashboards & Analytics (Week 8)
**Goals**: Xây dựng dashboard cho các roles

**Tasks:**
- [ ] Student Dashboard
  - [ ] Learning progress overview
  - [ ] Recently accessed courses
  - [ ] Recommendations
- [ ] Instructor Dashboard
  - [ ] Course statistics
  - [ ] Student analytics
  - [ ] Revenue charts
  - [ ] Recent reviews
- [ ] Admin Dashboard
  - [ ] Site-wide analytics
  - [ ] User management
  - [ ] Course approval system
  - [ ] Payment monitoring

### Phase 6: Enhancement & Polish (Week 9-10)
**Goals**: Cải thiện UX/UI và thêm tính năng phụ

**Tasks:**
- [ ] Notifications
  - [ ] In-app notifications
  - [ ] Email notifications
  - [ ] Notification preferences
- [ ] Advanced Features
  - [ ] Wishlist
  - [ ] Course preview
  - [ ] Advanced search
  - [ ] Filters optimization
- [ ] UI/UX Polish
  - [ ] Loading states
  - [ ] Error handling
  - [ ] Empty states
  - [ ] Responsive refinement
  - [ ] Animation & transitions
- [ ] Performance Optimization
  - [ ] Image optimization
  - [ ] Code splitting
  - [ ] Lazy loading
  - [ ] Caching strategies

### Phase 7: Testing & Deployment (Week 11-12)
**Goals**: Testing và deployment lên production

**Tasks:**
- [ ] Testing
  - [ ] Unit tests cho critical functions
  - [ ] Integration tests cho APIs
  - [ ] E2E tests cho user flows
  - [ ] Performance testing
- [ ] Documentation
  - [ ] API documentation
  - [ ] User guide
  - [ ] Admin guide
  - [ ] README updates
- [ ] Deployment
  - [ ] Frontend deployment (Vercel)
  - [ ] Backend deployment (Railway/Render)
  - [ ] MongoDB Atlas configuration
  - [ ] Environment variables setup
  - [ ] Domain & SSL
- [ ] Post-launch
  - [ ] Monitor errors
  - [ ] Collect feedback
  - [ ] Bug fixes
  - [ ] Performance monitoring

---

## 🔒 SECURITY CONSIDERATIONS

### Authentication & Authorization
- ✅ Password hashing với bcrypt
- ✅ JWT với expiration
- ✅ HTTP-only cookies cho tokens
- ✅ CSRF protection
- ✅ Rate limiting cho sensitive endpoints

### Data Protection
- ✅ Input validation & sanitization
- ✅ SQL/NoSQL injection prevention
- ✅ XSS protection
- ✅ HTTPS only
- ✅ Secure file uploads

### API Security
- ✅ CORS configuration
- ✅ API rate limiting
- ✅ Request validation
- ✅ Error handling (không expose sensitive info)

---

## 🚀 DEPLOYMENT STRATEGY

### Frontend (Vercel)
```bash
# Build command
npm run build

# Environment variables
NEXT_PUBLIC_API_URL
NEXTAUTH_URL
NEXTAUTH_SECRET
```

### Backend (Railway/Render)
```bash
# Start command
npm start

# Environment variables
MONGODB_URI
JWT_SECRET
CLOUDINARY_URL
STRIPE_SECRET_KEY
PORT
NODE_ENV=production
```

### Database (MongoDB Atlas)
- Setup production cluster
- Configure IP whitelist
- Enable backup
- Monitor performance

---

## 📊 PERFORMANCE TARGETS

- ⚡ First Contentful Paint: < 1.5s
- ⚡ Time to Interactive: < 3.5s
- ⚡ Lighthouse Score: > 90
- ⚡ API Response Time: < 200ms (average)
- ⚡ Video Loading: < 3s

---

## 🧪 TESTING STRATEGY

### Unit Tests
- Models validation
- Utility functions
- API controllers
- React components

### Integration Tests
- API endpoints
- Database operations
- Authentication flow
- Payment flow

### E2E Tests
- User registration & login
- Course creation & publishing
- Course enrollment
- Payment checkout
- Learning flow

---

## 📝 CODING BEST PRACTICES

### TypeScript
- Use strict mode
- Define proper types/interfaces
- Avoid `any` type
- Use generics when appropriate

### React/Next.js
- Use functional components
- Custom hooks cho logic reuse
- Proper error boundaries
- Code splitting cho large components
- Server Components khi có thể

### Express.js
- Async/await cho asynchronous code
- Proper error handling
- Middleware organization
- Validation middleware
- Structured logging

### MongoDB
- Use indexes cho query optimization
- Proper schema design
- Aggregation pipelines cho complex queries
- Connection pooling

---

## 📚 DOCUMENTATION

### API Documentation
- Swagger/OpenAPI specs
- Request/Response examples
- Authentication instructions
- Error codes

### Code Documentation
- JSDoc comments
- README for each major module
- Architecture decisions document
- Deployment guide

---

## 🔄 FUTURE ENHANCEMENTS

### Phase 2 Features
- [ ] Live classes với WebRTC
- [ ] Discussion forums
- [ ] Assignment submissions
- [ ] Quiz system với auto-grading
- [ ] Mobile app (React Native)
- [ ] Certificates với blockchain verification
- [ ] Gamification (badges, points)
- [ ] Social learning features
- [ ] Content marketplace
- [ ] Affiliate program

### Technical Improvements
- [ ] Redis caching
- [ ] ElasticSearch cho advanced search
- [ ] CDN cho video delivery
- [ ] Microservices architecture
- [ ] GraphQL API
- [ ] Real-time notifications với WebSocket
- [ ] AI-powered recommendations
- [ ] Video transcoding pipeline

---

## 📞 SUPPORT & RESOURCES

### Documentation Links
- [Next.js Docs](https://nextjs.org/docs)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Manual](https://docs.mongodb.com/)
- [TailwindCSS Docs](https://tailwindcss.com/docs)

### Useful Libraries
- **UI Components**: shadcn/ui, Radix UI
- **Forms**: React Hook Form, Zod
- **State**: Zustand, Redux Toolkit
- **Video**: Video.js, Plyr
- **Rich Text**: TipTap, Quill
- **Charts**: Recharts, Chart.js
- **Date**: date-fns, Day.js
- **HTTP**: Axios, SWR
- **Testing**: Jest, Testing Library, Playwright

---

## ✅ CHECKLIST TRƯỚC KHI BẮT ĐẦU

- [ ] Đã có tài khoản MongoDB Atlas
- [ ] Đã có tài khoản Cloudinary (cho upload images/videos)
- [ ] Đã có tài khoản Stripe (test mode)
- [ ] Đã cài Node.js v18+
- [ ] Đã cài Git
- [ ] Đã setup code editor (VSCode recommended)
- [ ] Đọc kỹ kế hoạch này
- [ ] Hiểu rõ tech stack
- [ ] Sẵn sàng coding! 🚀

---

**Last Updated**: 20/11/2024
**Version**: 1.0
**Author**: EduLearn Team


