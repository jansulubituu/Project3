import { Response } from 'express';
import { ExamTemplate, Course } from '../models';
import { AuthRequest } from '../middleware/auth';

/**
 * @desc    Get all templates for a course
 * @route   GET /api/courses/:courseId/exam-templates
 * @access  Private/Instructor or Admin
 */
export const getTemplates = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { courseId } = req.params;

    // Verify course exists and user has permission
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view templates for this course',
      });
    }

    const templates = await ExamTemplate.find({
      course: courseId,
      isActive: true,
    })
      .populate({
        path: 'section',
        select: 'title',
      })
      .populate({
        path: 'createdBy',
        select: 'fullName email',
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      templates,
      count: templates.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching templates',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Get single template
 * @route   GET /api/exam-templates/:id
 * @access  Private/Instructor or Admin
 */
export const getTemplate = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { id } = req.params;

    const template = await ExamTemplate.findById(id)
      .populate({
        path: 'course',
        select: 'title instructor',
      })
      .populate({
        path: 'section',
        select: 'title',
      })
      .populate({
        path: 'createdBy',
        select: 'fullName email',
      });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    // Check authorization
    const course = template.course as any;
    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this template',
      });
    }

    res.json({
      success: true,
      template,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching template',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Create template
 * @route   POST /api/courses/:courseId/exam-templates
 * @access  Private/Instructor or Admin
 */
export const createTemplate = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { courseId } = req.params;
    const {
      section,
      title,
      description,
      numberOfQuestions,
      difficultyDistribution,
      topicDistribution,
      typeDistribution,
      shuffleQuestions,
      shuffleAnswers,
    } = req.body;

    // Verify course exists and user has permission
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create templates for this course',
      });
    }

    // Validate distributions sum to 100
    if (difficultyDistribution && Array.isArray(difficultyDistribution)) {
      const total = difficultyDistribution.reduce((sum: number, rule: any) => sum + (rule.ratio || 0), 0);
      if (total !== 100) {
        return res.status(400).json({
          success: false,
          message: 'Difficulty distribution ratios must sum to 100',
        });
      }
    }

    if (typeDistribution && Array.isArray(typeDistribution)) {
      const total = typeDistribution.reduce((sum: number, rule: any) => sum + (rule.ratio || 0), 0);
      if (total !== 100) {
        return res.status(400).json({
          success: false,
          message: 'Type distribution ratios must sum to 100',
        });
      }
    }

    if (topicDistribution && Array.isArray(topicDistribution)) {
      const total = topicDistribution.reduce((sum: number, rule: any) => sum + (rule.ratio || 0), 0);
      if (total > 100) {
        return res.status(400).json({
          success: false,
          message: 'Topic distribution ratios cannot exceed 100',
        });
      }
    }

    const template = await ExamTemplate.create({
      course: courseId,
      section: section || null,
      title,
      description: description || '',
      numberOfQuestions,
      difficultyDistribution: difficultyDistribution || [],
      topicDistribution: topicDistribution || [],
      typeDistribution: typeDistribution || [],
      shuffleQuestions: shuffleQuestions ?? true,
      shuffleAnswers: shuffleAnswers ?? true,
      createdBy: req.user.id,
      isActive: true,
    });

    const populated = await ExamTemplate.findById(template._id)
      .populate({
        path: 'section',
        select: 'title',
      })
      .populate({
        path: 'createdBy',
        select: 'fullName email',
      });

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      template: populated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating template',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Update template
 * @route   PUT /api/exam-templates/:id
 * @access  Private/Instructor or Admin
 */
export const updateTemplate = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { id } = req.params;
    const {
      section,
      title,
      description,
      numberOfQuestions,
      difficultyDistribution,
      topicDistribution,
      typeDistribution,
      shuffleQuestions,
      shuffleAnswers,
      isActive,
    } = req.body;

    const template = await ExamTemplate.findById(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    // Check authorization
    const course = await Course.findById(template.course);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this template',
      });
    }

    // Validate distributions
    if (difficultyDistribution && Array.isArray(difficultyDistribution)) {
      const total = difficultyDistribution.reduce((sum: number, rule: any) => sum + (rule.ratio || 0), 0);
      if (total !== 100) {
        return res.status(400).json({
          success: false,
          message: 'Difficulty distribution ratios must sum to 100',
        });
      }
    }

    if (typeDistribution && Array.isArray(typeDistribution)) {
      const total = typeDistribution.reduce((sum: number, rule: any) => sum + (rule.ratio || 0), 0);
      if (total !== 100) {
        return res.status(400).json({
          success: false,
          message: 'Type distribution ratios must sum to 100',
        });
      }
    }

    if (topicDistribution && Array.isArray(topicDistribution)) {
      const total = topicDistribution.reduce((sum: number, rule: any) => sum + (rule.ratio || 0), 0);
      if (total > 100) {
        return res.status(400).json({
          success: false,
          message: 'Topic distribution ratios cannot exceed 100',
        });
      }
    }

    // Update template
    Object.assign(template, {
      section: section !== undefined ? section : template.section,
      title: title || template.title,
      description: description !== undefined ? description : template.description,
      numberOfQuestions: numberOfQuestions || template.numberOfQuestions,
      difficultyDistribution: difficultyDistribution || template.difficultyDistribution,
      topicDistribution: topicDistribution || template.topicDistribution,
      typeDistribution: typeDistribution || template.typeDistribution,
      shuffleQuestions: shuffleQuestions !== undefined ? shuffleQuestions : template.shuffleQuestions,
      shuffleAnswers: shuffleAnswers !== undefined ? shuffleAnswers : template.shuffleAnswers,
      isActive: isActive !== undefined ? isActive : template.isActive,
    });

    await template.save();

    const populated = await ExamTemplate.findById(template._id)
      .populate({
        path: 'section',
        select: 'title',
      })
      .populate({
        path: 'createdBy',
        select: 'fullName email',
      });

    res.json({
      success: true,
      message: 'Template updated successfully',
      template: populated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating template',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Delete template (soft delete)
 * @route   DELETE /api/exam-templates/:id
 * @access  Private/Instructor or Admin
 */
export const deleteTemplate = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { id } = req.params;

    const template = await ExamTemplate.findById(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    // Check authorization
    const course = await Course.findById(template.course);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this template',
      });
    }

    // Soft delete
    template.isActive = false;
    await template.save();

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting template',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
