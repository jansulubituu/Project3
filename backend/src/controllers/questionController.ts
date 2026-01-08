import { Response } from 'express';
import mongoose from 'mongoose';
import { Question, Course, Section } from '../models';
import { AuthRequest } from '../middleware/auth';

/**
 * @desc    Create question
 * @route   POST /api/questions
 * @access  Private/Instructor or Admin
 */
export const createQuestion = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const {
      course,
      section,
      type,
      difficulty,
      text,
      images,
      options,
      expectedAnswers,
      caseSensitive,
      maxSelectable,
      points,
      negativeMarking,
      negativePoints,
      tags,
      topic,
      cognitiveLevel,
    } = req.body;

    // Verify course exists and user has permission
    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && courseDoc.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create questions for this course',
      });
    }

    // Verify section if provided
    if (section) {
      const sectionDoc = await Section.findById(section);
      if (!sectionDoc || sectionDoc.course.toString() !== course) {
        return res.status(400).json({
          success: false,
          message: 'Invalid section for this course',
        });
      }
    }

    // Validate question type and required fields
    if (type === 'single_choice' || type === 'multiple_choice') {
      if (!options || options.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Choice questions must have at least 2 options',
        });
      }
      const correctCount = options.filter((opt: any) => opt.isCorrect).length;
      if (correctCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one option must be marked as correct',
        });
      }
      if (type === 'single_choice' && correctCount > 1) {
        return res.status(400).json({
          success: false,
          message: 'Single choice questions must have exactly one correct answer',
        });
      }
    }

    if (type === 'short_answer') {
      if (!expectedAnswers || expectedAnswers.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Short answer questions must have at least one expected answer',
        });
      }
    }

    const question = await Question.create({
      course,
      section: section || null,
      owner: req.user.id,
      type,
      difficulty: difficulty || 'medium',
      text,
      images: images || [],
      options: options || [],
      expectedAnswers: expectedAnswers || [],
      caseSensitive: caseSensitive ?? false,
      maxSelectable: maxSelectable || null,
      points: points || 1,
      negativeMarking: negativeMarking ?? false,
      negativePoints: negativePoints || 0,
      tags: tags || [],
      topic,
      cognitiveLevel,
      isActive: true,
      version: 1,
      parentQuestion: null,
      isArchived: false,
    });

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      question,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating question',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Get question by ID
 * @route   GET /api/questions/:id
 * @access  Private
 */
export const getQuestionById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const question = await Question.findById(id)
      .populate({
        path: 'course',
        select: 'title slug instructor',
      })
      .populate({
        path: 'section',
        select: 'title order',
      })
      .populate({
        path: 'owner',
        select: 'fullName email',
      });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    const course = question.course as any;

    // Check authorization
    if (req.user) {
      const isInstructor = course?.instructor?.toString() === req.user.id;
      const isAdmin = req.user.role === 'admin';
      const isOwner = question.owner.toString() === req.user.id;

      if (!isInstructor && !isAdmin && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this question',
        });
      }
    }

    res.json({
      success: true,
      question,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching question',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Update question (creates new version)
 * @route   PUT /api/questions/:id
 * @access  Private/Instructor (own course) or Admin
 */
export const updateQuestion = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    const oldQuestion = await Question.findById(id).populate('course');
    if (!oldQuestion) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    const course = oldQuestion.course as any;

    // Check authorization
    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this question',
      });
    }

    // Validate question type and required fields if type is being changed
    if (updateData.type) {
      if ((updateData.type === 'single_choice' || updateData.type === 'multiple_choice') && updateData.options) {
        const correctCount = updateData.options.filter((opt: any) => opt.isCorrect).length;
        if (correctCount === 0) {
          return res.status(400).json({
            success: false,
            message: 'At least one option must be marked as correct',
          });
        }
        if (updateData.type === 'single_choice' && correctCount > 1) {
          return res.status(400).json({
            success: false,
            message: 'Single choice questions must have exactly one correct answer',
          });
        }
      }

      if (updateData.type === 'short_answer' && updateData.expectedAnswers) {
        if (updateData.expectedAnswers.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Short answer questions must have at least one expected answer',
          });
        }
      }
    }

    // Create new version instead of updating directly (versioning)
    const newVersion = oldQuestion.version + 1;
    
    // Archive old version
    oldQuestion.isArchived = true;
    await oldQuestion.save();

    // Create new version
    const question = await Question.create({
      ...oldQuestion.toObject(),
      ...updateData,
      _id: new mongoose.Types.ObjectId(),
      version: newVersion,
      parentQuestion: oldQuestion._id,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.json({
      success: true,
      message: 'Question updated successfully (new version created)',
      question,
      previousVersion: oldQuestion._id,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating question',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Delete question (soft delete - archive)
 * @route   DELETE /api/questions/:id
 * @access  Private/Instructor (own course) or Admin
 */
export const deleteQuestion = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { id } = req.params;

    const question = await Question.findById(id).populate('course');
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    const course = question.course as any;

    // Check authorization
    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this question',
      });
    }

    // Soft delete - archive and deactivate
    question.isArchived = true;
    question.isActive = false;
    await question.save();

    res.json({
      success: true,
      message: 'Question deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting question',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    List questions by course (Question Bank)
 * @route   GET /api/questions/course/:courseId
 * @access  Private/Instructor or Admin
 */
export const listQuestionsByCourse = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { courseId } = req.params;
    const { 
      type, 
      difficulty, 
      tags, 
      topic, 
      section,
      isActive,
      page = 1,
      limit = 50,
    } = req.query;

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
        message: 'Not authorized to view questions for this course',
      });
    }

    // Build query
    const query: any = { 
      course: courseId,
      isArchived: false,
    };

    if (type) {
      query.type = type;
    }
    if (difficulty) {
      query.difficulty = difficulty;
    }
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }
    if (topic) {
      query.topic = topic;
    }
    if (section) {
      query.section = section;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [questions, total] = await Promise.all([
      Question.find(query)
        .populate({
          path: 'section',
          select: 'title order',
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Question.countDocuments(query),
    ]);

    res.json({
      success: true,
      questions,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error listing questions',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
