import { Request, Response } from 'express';
import { LandingPageConfig } from '../models';
import mongoose from 'mongoose';

// @desc    Get active landing page config (Public)
// @route   GET /api/landing-page
// @access  Public
export const getLandingPageConfig = async (_req: Request, res: Response) => {
  try {
    let config = await LandingPageConfig.findOne({ isActive: true });

    // If no config exists, create default one
    if (!config) {
      config = await LandingPageConfig.create({
        isActive: true,
        hero: {
          title: 'Học tập mọi lúc, mọi nơi',
          subtitle: 'Khám phá hàng ngàn khóa học chất lượng cao từ các giảng viên hàng đầu. Bắt đầu hành trình học tập của bạn ngay hôm nay!',
          searchPlaceholder: 'Tìm kiếm khóa học...',
          primaryButtonText: 'Bắt đầu miễn phí',
          primaryButtonLink: '/register',
          secondaryButtonText: 'Xem khóa học',
          secondaryButtonLink: '/courses',
          showSearchBar: true,
        },
        features: {
          title: 'Tại sao chọn EduLearn?',
          subtitle: 'Nền tảng học trực tuyến hiện đại với đầy đủ tính năng bạn cần',
          items: [
            {
              icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
              title: 'Khóa học đa dạng',
              description: 'Hàng ngàn khóa học từ lập trình, thiết kế, marketing đến phát triển kỹ năng mềm',
              gradientFrom: 'blue-500',
              gradientTo: 'indigo-600',
            },
            {
              icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
              title: 'Học theo tốc độ của bạn',
              description: 'Học bất cứ lúc nào, bất cứ đâu. Theo dõi tiến độ và quay lại bất kỳ bài học nào',
              gradientFrom: 'purple-500',
              gradientTo: 'pink-600',
            },
            {
              icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
              title: 'Giảng viên chuyên nghiệp',
              description: 'Học từ các chuyên gia hàng đầu với nhiều năm kinh nghiệm trong lĩnh vực',
              gradientFrom: 'green-500',
              gradientTo: 'emerald-600',
            },
            {
              icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
              title: 'Hỗ trợ 24/7',
              description: 'Đội ngũ hỗ trợ luôn sẵn sàng giúp đỡ bạn trong suốt quá trình học tập',
              gradientFrom: 'yellow-500',
              gradientTo: 'orange-600',
            },
            {
              icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
              title: 'Học trên mọi thiết bị',
              description: 'Responsive design, học trên máy tính, tablet hoặc điện thoại',
              gradientFrom: 'indigo-500',
              gradientTo: 'blue-600',
            },
            {
              icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
              title: 'Chứng chỉ hoàn thành',
              description: 'Nhận chứng chỉ sau khi hoàn thành khóa học để chứng minh kỹ năng của bạn',
              gradientFrom: 'red-500',
              gradientTo: 'rose-600',
            },
          ],
          enabled: true,
        },
        categories: {
          title: 'Khám phá theo danh mục',
          subtitle: 'Tìm khóa học phù hợp với sở thích và mục tiêu của bạn',
          limit: 6,
          enabled: true,
        },
        featuredCourses: {
          title: 'Khóa học nổi bật',
          subtitle: 'Các khóa học được yêu thích nhất',
          limit: 6,
          sortBy: 'popular',
          enabled: true,
        },
        cta: {
          title: 'Sẵn sàng bắt đầu học tập?',
          subtitle: 'Tham gia cùng hàng ngàn học viên đang học tập trên EduLearn',
          buttonText: 'Đăng ký miễn phí ngay',
          buttonLink: '/register',
          enabled: true,
        },
        stats: {
          enabled: true,
          useAutoStats: true,
        },
      });
    }

    res.json({
      success: true,
      config,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching landing page config',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Get all landing page configs (Admin)
// @route   GET /api/admin/landing-page
// @access  Private/Admin
export const getAllLandingPageConfigs = async (_req: Request, res: Response) => {
  try {
    const configs = await LandingPageConfig.find()
      .populate('updatedBy', 'fullName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      configs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching landing page configs',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Get landing page config by ID (Admin)
// @route   GET /api/admin/landing-page/:id
// @access  Private/Admin
export const getLandingPageConfigById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid config ID',
      });
    }

    const config = await LandingPageConfig.findById(id).populate('updatedBy', 'fullName email');

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Landing page config not found',
      });
    }

    res.json({
      success: true,
      config,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching landing page config',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Create landing page config (Admin)
// @route   POST /api/admin/landing-page
// @access  Private/Admin
export const createLandingPageConfig = async (req: Request, res: Response) => {
  try {
    const configData = {
      ...req.body,
      updatedBy: req.user?.id,
    };

    // If this is set as active, deactivate others
    if (configData.isActive) {
      await LandingPageConfig.updateMany(
        { isActive: true },
        { isActive: false }
      );
    }

    const config = await LandingPageConfig.create(configData);

    res.status(201).json({
      success: true,
      message: 'Landing page config created successfully',
      config,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating landing page config',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Update landing page config (Admin)
// @route   PUT /api/admin/landing-page/:id
// @access  Private/Admin
export const updateLandingPageConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid config ID',
      });
    }

    const config = await LandingPageConfig.findById(id);

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Landing page config not found',
      });
    }

    // If setting as active, deactivate others
    if (req.body.isActive && !config.isActive) {
      await LandingPageConfig.updateMany(
        { _id: { $ne: id }, isActive: true },
        { isActive: false }
      );
    }

    Object.assign(config, {
      ...req.body,
      updatedBy: req.user?.id,
    });

    await config.save();

    res.json({
      success: true,
      message: 'Landing page config updated successfully',
      config,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating landing page config',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Delete landing page config (Admin)
// @route   DELETE /api/admin/landing-page/:id
// @access  Private/Admin
export const deleteLandingPageConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid config ID',
      });
    }

    const config = await LandingPageConfig.findById(id);

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Landing page config not found',
      });
    }

    // Prevent deleting active config
    if (config.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete active config. Please activate another config first.',
      });
    }

    await LandingPageConfig.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Landing page config deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting landing page config',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Activate landing page config (Admin)
// @route   PUT /api/admin/landing-page/:id/activate
// @access  Private/Admin
export const activateLandingPageConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid config ID',
      });
    }

    const config = await LandingPageConfig.findById(id);

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Landing page config not found',
      });
    }

    // Deactivate all other configs
    await LandingPageConfig.updateMany(
      { _id: { $ne: id } },
      { isActive: false }
    );

    config.isActive = true;
    if (req.user?.id) {
      config.updatedBy = new mongoose.Types.ObjectId(req.user.id);
    }
    await config.save();

    res.json({
      success: true,
      message: 'Landing page config activated successfully',
      config,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error activating landing page config',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

