import mongoose, { Schema, Document } from 'mongoose';

export interface IFeature {
  icon: string; // SVG path hoặc icon name
  title: string;
  description: string;
  gradientFrom: string; // Tailwind color class
  gradientTo: string;
}

export interface ILandingPageConfig extends Document {
  _id: mongoose.Types.ObjectId;
  isActive: boolean;
  
  // Hero Section
  hero: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    primaryButtonText: string;
    primaryButtonLink: string;
    secondaryButtonText: string;
    secondaryButtonLink: string;
    showSearchBar: boolean;
  };
  
  // Features Section
  features: {
    title: string;
    subtitle: string;
    items: IFeature[];
    enabled: boolean;
  };
  
  // Categories Section
  categories: {
    title: string;
    subtitle: string;
    limit: number;
    enabled: boolean;
  };
  
  // Featured Courses Section
  featuredCourses: {
    title: string;
    subtitle: string;
    limit: number;
    sortBy: 'popular' | 'newest' | 'rating' | 'enrollment';
    enabled: boolean;
  };
  
  // CTA Section
  cta: {
    title: string;
    subtitle: string;
    buttonText: string;
    buttonLink: string;
    enabled: boolean;
  };
  
  // Stats Section
  stats: {
    enabled: boolean;
    useAutoStats: boolean; // Nếu true, dùng API stats, nếu false dùng custom
    customStats?: {
      totalCourses: number;
      totalInstructors: number;
      totalStudents: number;
      averageRating: number;
    };
  };
  
  createdAt: Date;
  updatedAt: Date;
  updatedBy: mongoose.Types.ObjectId;
}

const featureSchema = new Schema<IFeature>({
  icon: { type: String, required: true },
  title: { type: String, required: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 300 },
  gradientFrom: { type: String, default: 'blue-500' },
  gradientTo: { type: String, default: 'indigo-600' },
}, { _id: false });

const landingPageConfigSchema = new Schema<ILandingPageConfig>(
  {
    isActive: {
      type: Boolean,
      default: true,
    },
    
    hero: {
      title: {
        type: String,
        required: true,
        maxlength: 200,
        default: 'Học tập mọi lúc, mọi nơi',
      },
      subtitle: {
        type: String,
        required: true,
        maxlength: 500,
        default: 'Khám phá hàng ngàn khóa học chất lượng cao từ các giảng viên hàng đầu. Bắt đầu hành trình học tập của bạn ngay hôm nay!',
      },
      searchPlaceholder: {
        type: String,
        default: 'Tìm kiếm khóa học...',
        maxlength: 100,
      },
      primaryButtonText: {
        type: String,
        default: 'Bắt đầu miễn phí',
        maxlength: 50,
      },
      primaryButtonLink: {
        type: String,
        default: '/register',
        maxlength: 200,
      },
      secondaryButtonText: {
        type: String,
        default: 'Xem khóa học',
        maxlength: 50,
      },
      secondaryButtonLink: {
        type: String,
        default: '/courses',
        maxlength: 200,
      },
      showSearchBar: {
        type: Boolean,
        default: true,
      },
    },
    
    features: {
      title: {
        type: String,
        default: 'Tại sao chọn EduLearn?',
        maxlength: 200,
      },
      subtitle: {
        type: String,
        default: 'Nền tảng học trực tuyến hiện đại với đầy đủ tính năng bạn cần',
        maxlength: 500,
      },
      items: {
        type: [featureSchema],
        default: [],
        validate: {
          validator: function (value: IFeature[]) {
            return value.length <= 12; // Max 12 features
          },
          message: 'Cannot have more than 12 features',
        },
      },
      enabled: {
        type: Boolean,
        default: true,
      },
    },
    
    categories: {
      title: {
        type: String,
        default: 'Khám phá theo danh mục',
        maxlength: 200,
      },
      subtitle: {
        type: String,
        default: 'Tìm khóa học phù hợp với sở thích và mục tiêu của bạn',
        maxlength: 500,
      },
      limit: {
        type: Number,
        default: 6,
        min: 0,
        max: 20,
      },
      enabled: {
        type: Boolean,
        default: true,
      },
    },
    
    featuredCourses: {
      title: {
        type: String,
        default: 'Khóa học nổi bật',
        maxlength: 200,
      },
      subtitle: {
        type: String,
        default: 'Các khóa học được yêu thích nhất',
        maxlength: 500,
      },
      limit: {
        type: Number,
        default: 6,
        min: 1,
        max: 20,
      },
      sortBy: {
        type: String,
        enum: ['popular', 'newest', 'rating', 'enrollment'],
        default: 'popular',
      },
      enabled: {
        type: Boolean,
        default: true,
      },
    },
    
    cta: {
      title: {
        type: String,
        default: 'Sẵn sàng bắt đầu học tập?',
        maxlength: 200,
      },
      subtitle: {
        type: String,
        default: 'Tham gia cùng hàng ngàn học viên đang học tập trên EduLearn',
        maxlength: 500,
      },
      buttonText: {
        type: String,
        default: 'Đăng ký miễn phí ngay',
        maxlength: 50,
      },
      buttonLink: {
        type: String,
        default: '/register',
        maxlength: 200,
      },
      enabled: {
        type: Boolean,
        default: true,
      },
    },
    
    stats: {
      enabled: {
        type: Boolean,
        default: true,
      },
      useAutoStats: {
        type: Boolean,
        default: true,
      },
      customStats: {
        totalCourses: { type: Number, min: 0 },
        totalInstructors: { type: Number, min: 0 },
        totalStudents: { type: Number, min: 0 },
        averageRating: { type: Number, min: 0, max: 5 },
      },
    },
    
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Ensure only one active config exists
landingPageConfigSchema.pre('save', async function (next) {
  if (this.isActive && this.isNew) {
    // Deactivate all other configs
    await mongoose.model('LandingPageConfig').updateMany(
      { _id: { $ne: this._id } },
      { isActive: false }
    );
  }
  next();
});

const LandingPageConfig = mongoose.model<ILandingPageConfig>(
  'LandingPageConfig',
  landingPageConfigSchema
);

export default LandingPageConfig;

