import { Request, Response } from 'express';
import { Category, Course } from '../models';
import mongoose from 'mongoose';

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const { parent, isActive } = req.query;

    const query: any = {};

    // Filter by parent (null for root categories)
    if (parent !== undefined) {
      if (parent === 'null' || parent === '') {
        query.parent = null;
      } else {
        query.parent = parent;
      }
    }

    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    } else {
      // Default: only show active categories
      query.isActive = true;
    }

    const categories = await Category.find(query)
      .populate('parent', 'name slug')
      .sort({ order: 1, createdAt: 1 });

    res.json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Get category by ID or slug
// @route   GET /api/categories/:id
// @access  Public
export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if id is ObjectId or slug
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { _id: id } : { slug: id };

    const category = await Category.findOne(query)
      .populate('parent', 'name slug description')
      .populate({
        path: 'subcategories',
        select: 'name slug description icon courseCount',
        match: { isActive: true },
        options: { sort: { order: 1 } },
      });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching category',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Get courses by category
// @route   GET /api/categories/:id/courses
// @access  Public
export const getCategoryCourses = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 12,
      level,
      minPrice,
      maxPrice,
      minRating,
      sort = 'newest',
    } = req.query;

    // Check if id is ObjectId or slug
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const categoryQuery = isObjectId ? { _id: id } : { slug: id };

    const category = await Category.findOne(categoryQuery);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Build query for courses
    const courseQuery: any = {
      category: category._id,
      status: 'published',
      isPublished: true,
    };

    // Filter by level
    if (level) {
      courseQuery.level = level;
    }

    // Filter by price
    if (minPrice) {
      courseQuery.$or = [
        { discountPrice: { $gte: Number(minPrice) } },
        { price: { $gte: Number(minPrice) } },
      ];
    }
    if (maxPrice) {
      if (courseQuery.$or) {
        courseQuery.$and = [
          { $or: [{ discountPrice: { $lte: Number(maxPrice) } }, { price: { $lte: Number(maxPrice) } }] },
        ];
      } else {
        courseQuery.$or = [
          { discountPrice: { $lte: Number(maxPrice) } },
          { price: { $lte: Number(maxPrice) } },
        ];
      }
    }

    // Filter by rating
    if (minRating) {
      courseQuery.averageRating = { $gte: Number(minRating) };
    }

    // Sort options
    let sortOption: any = { createdAt: -1 }; // default: newest
    switch (sort) {
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'popular':
        sortOption = { enrollmentCount: -1 };
        break;
      case 'rating':
        sortOption = { averageRating: -1 };
        break;
      case 'price_asc':
        sortOption = { price: 1 };
        break;
      case 'price_desc':
        sortOption = { price: -1 };
        break;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const courses = await Course.find(courseQuery)
      .populate('instructor', 'fullName avatar headline')
      .populate('category', 'name slug')
      .select('-description -requirements -learningOutcomes -metaTitle -metaDescription -metaKeywords')
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    const total = await Course.countDocuments(courseQuery);

    res.json({
      success: true,
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug,
      },
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
      courses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching category courses',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Create category (Admin only)
// @route   POST /api/categories
// @access  Private/Admin
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description, icon, image, parent, order, isActive } = req.body;

    // Check if category with same name exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists',
      });
    }

    // Validate parent if provided
    if (parent) {
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found',
        });
      }
    }

    const category = await Category.create({
      name,
      description,
      icon,
      image,
      parent: parent || null,
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating category',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Update category (Admin only)
// @route   PUT /api/categories/:id
// @access  Private/Admin
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, icon, image, parent, order, isActive } = req.body;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Check if name is being changed and if it conflicts
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ name });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists',
        });
      }
    }

    // Validate parent if provided
    if (parent && parent !== category.parent?.toString()) {
      if (parent === id) {
        return res.status(400).json({
          success: false,
          message: 'Category cannot be its own parent',
        });
      }
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found',
        });
      }
    }

    // Update fields
    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (icon !== undefined) category.icon = icon;
    if (image !== undefined) category.image = image;
    if (parent !== undefined) category.parent = parent || null;
    if (order !== undefined) category.order = order;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating category',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Delete category (Admin only)
// @route   DELETE /api/categories/:id
// @access  Private/Admin
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Check if category has subcategories
    const subcategories = await Category.find({ parent: id });
    if (subcategories.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with subcategories. Please delete or move subcategories first.',
      });
    }

    // Check if category has courses
    const coursesCount = await Course.countDocuments({ category: id });
    if (coursesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category with ${coursesCount} course(s). Please move or delete courses first.`,
      });
    }

    await Category.deleteOne({ _id: id });

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting category',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

