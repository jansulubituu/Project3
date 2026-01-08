import { Response } from 'express';
import mongoose from 'mongoose';
import { Exam, Course, Section, Question } from '../models';
import { AuthRequest } from '../middleware/auth';

/**
 * @desc    Create exam
 * @route   POST /api/exams
 * @access  Private/Instructor or Admin
 */
export const createExam = async (req: AuthRequest, res: Response) => {
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
      title,
      description,
      questions,
      totalPoints,
      passingScore,
      shuffleQuestions,
      shuffleAnswers,
      openAt,
      closeAt,
      durationMinutes,
      maxAttempts,
      scoringMethod,
      showCorrectAnswers,
      showScoreToStudent,
      allowLateSubmission,
      latePenaltyPercent,
      timeLimitType,
      status,
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
        message: 'Not authorized to create exams for this course',
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

    // Validate dates
    if (openAt && closeAt) {
      const openDate = new Date(openAt);
      const closeDate = new Date(closeAt);
      if (openDate >= closeDate) {
        return res.status(400).json({
          success: false,
          message: 'openAt must be before closeAt',
        });
      }
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/-+/g, '-');

    // Calculate totalPoints from questions if not provided
    let calculatedTotalPoints = totalPoints || 0;
    if (questions && questions.length > 0) {
      const questionIds = questions.map((q: any) => q.question || q);
      const questionDocs = await Question.find({ _id: { $in: questionIds } });
      calculatedTotalPoints = questionDocs.reduce((sum, q) => {
        const questionRef = questions.find((qr: any) => 
          (qr.question || qr).toString() === q._id.toString()
        );
        const weight = questionRef?.weight || 1;
        return sum + q.points * weight;
      }, 0);
    }

    // Validate passingScore <= totalPoints
    const finalPassingScore = passingScore || 0;
    if (finalPassingScore > calculatedTotalPoints) {
      return res.status(400).json({
        success: false,
        message: 'passingScore cannot exceed totalPoints',
      });
    }

    const exam = await Exam.create({
      course,
      section: section || null,
      title,
      description,
      slug: `${slug}-${Date.now()}`, // Add timestamp to ensure uniqueness
      questions: questions || [],
      totalPoints: calculatedTotalPoints,
      passingScore: passingScore || 0,
      shuffleQuestions: shuffleQuestions ?? false,
      shuffleAnswers: shuffleAnswers ?? false,
      openAt: openAt || null,
      closeAt: closeAt || null,
      durationMinutes: durationMinutes || 60,
      maxAttempts: maxAttempts || null,
      scoringMethod: scoringMethod || 'highest',
      showCorrectAnswers: showCorrectAnswers || 'after_submit',
      showScoreToStudent: showScoreToStudent ?? true,
      allowLateSubmission: allowLateSubmission ?? false,
      latePenaltyPercent: latePenaltyPercent || 0,
      timeLimitType: timeLimitType || 'per_attempt',
      status: status || 'draft',
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      exam,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating exam',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Get exam by ID
 * @route   GET /api/exams/:id
 * @access  Private
 */
export const getExamById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const exam = await Exam.findById(id)
      .populate({
        path: 'course',
        select: 'title slug instructor status',
      })
      .populate({
        path: 'section',
        select: 'title order',
      })
      .populate({
        path: 'questions.question',
        select: 'type difficulty text images options expectedAnswers points tags topic cognitiveLevel',
      })
      .populate({
        path: 'createdBy',
        select: 'fullName email',
      });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    const course = exam.course as any;

    // Check authorization
    if (req.user) {
      const isInstructor = course?.instructor?.toString() === req.user.id;
      const isAdmin = req.user.role === 'admin';
      const isStudent = req.user.role === 'student';

      // Students can only see published exams
      if (isStudent && exam.status !== 'published') {
        return res.status(403).json({
          success: false,
          message: 'Exam is not available',
        });
      }

      // Instructors and admins can see all exams
      if (!isInstructor && !isAdmin && !isStudent) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this exam',
        });
      }
    }

    res.json({
      success: true,
      exam,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching exam',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Update exam
 * @route   PUT /api/exams/:id
 * @access  Private/Instructor (own course) or Admin
 */
export const updateExam = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    const exam = await Exam.findById(id).populate('course');

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    const course = exam.course as any;

    // Check authorization
    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this exam',
      });
    }

    // Verify section if being updated
    if (updateData.section !== undefined) {
      if (updateData.section) {
        const sectionDoc = await Section.findById(updateData.section);
        if (!sectionDoc || sectionDoc.course.toString() !== course._id.toString()) {
          return res.status(400).json({
            success: false,
            message: 'Invalid section for this course',
          });
        }
      }
    }

    // Validate dates
    const openAtDate = updateData.openAt ? new Date(updateData.openAt) : exam.openAt;
    const closeAtDate = updateData.closeAt ? new Date(updateData.closeAt) : exam.closeAt;
    if (openAtDate && closeAtDate && openAtDate >= closeAtDate) {
      return res.status(400).json({
        success: false,
        message: 'openAt must be before closeAt',
      });
    }

    // Recalculate totalPoints if questions are updated
    let finalTotalPoints = exam.totalPoints;
    if (updateData.questions) {
      const questionIds = updateData.questions.map((q: any) => q.question || q);
      const questionDocs = await Question.find({ _id: { $in: questionIds } });
      finalTotalPoints = questionDocs.reduce((sum, q) => {
        const questionRef = updateData.questions.find((qr: any) => 
          (qr.question || qr).toString() === q._id.toString()
        );
        const weight = questionRef?.weight || 1;
        return sum + q.points * weight;
      }, 0);
      updateData.totalPoints = finalTotalPoints;
    } else if (updateData.totalPoints !== undefined) {
      finalTotalPoints = updateData.totalPoints;
    }

    // Validate passingScore <= totalPoints
    const finalPassingScore = updateData.passingScore !== undefined 
      ? updateData.passingScore 
      : exam.passingScore;
    if (finalPassingScore > finalTotalPoints) {
      return res.status(400).json({
        success: false,
        message: 'passingScore cannot exceed totalPoints',
      });
    }

    // Update slug if title is changed
    if (updateData.title && updateData.title !== exam.title) {
      const slug = updateData.title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/-+/g, '-');
      updateData.slug = `${slug}-${Date.now()}`;
    }

    Object.assign(exam, updateData);
    await exam.save();

    res.json({
      success: true,
      message: 'Exam updated successfully',
      exam,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating exam',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Delete exam
 * @route   DELETE /api/exams/:id
 * @access  Private/Instructor (own course) or Admin
 */
export const deleteExam = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { id } = req.params;

    const exam = await Exam.findById(id).populate('course');

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    const course = exam.course as any;

    // Check authorization
    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this exam',
      });
    }

    // Archive instead of delete to preserve data
    exam.status = 'archived';
    await exam.save();

    res.json({
      success: true,
      message: 'Exam archived successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting exam',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    List exams by course
 * @route   GET /api/exams/course/:courseId
 * @access  Private
 */
export const listExamsByCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const { status, section } = req.query;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Build query
    const query: any = { course: courseId };
    if (status) {
      query.status = status;
    }
    if (section) {
      query.section = section;
    }

    // Students can only see published exams
    if (req.user && req.user.role === 'student') {
      query.status = 'published';
    }

    const exams = await Exam.find(query)
      .populate({
        path: 'section',
        select: 'title order',
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      exams,
      count: exams.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error listing exams',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Get exam analytics
 * @route   GET /api/exams/:id/analytics
 * @access  Private/Instructor (own course) or Admin
 */
export const getExamAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { id } = req.params;
    const ExamAttempt = mongoose.model('ExamAttempt');

    const exam = await Exam.findById(id).populate('course');
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    const course = exam.course as any;

    // Check authorization
    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view analytics for this exam',
      });
    }

    // Get all attempts for this exam
    const attempts = await ExamAttempt.find({ exam: id, status: 'submitted' });

    const totalAttempts = attempts.length;
    const passedAttempts = attempts.filter((a: any) => a.passed).length;
    const passRate = totalAttempts > 0 ? (passedAttempts / totalAttempts) * 100 : 0;

    // Calculate score distribution
    const scores = attempts.map((a: any) => a.score);
    const avgScore = scores.length > 0 
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length 
      : 0;
    const maxScore = exam.totalPoints;

    // Calculate time spent
    const timeSpent = attempts.map((a: any) => {
      if (a.submittedAt && a.startedAt) {
        return (new Date(a.submittedAt).getTime() - new Date(a.startedAt).getTime()) / 1000 / 60; // minutes
      }
      return 0;
    });
    const avgTimeSpent = timeSpent.length > 0
      ? timeSpent.reduce((sum, t) => sum + t, 0) / timeSpent.length
      : 0;

    // Question-level analytics
    const questionStats: any[] = [];
    for (const questionRef of exam.questions) {
      const questionId = questionRef.question;
      const questionAnswers = attempts
        .map((a: any) => a.answers.find((ans: any) => ans.question.toString() === questionId.toString()))
        .filter(Boolean);

      const correctCount = questionAnswers.filter((ans: any) => ans.isCorrect).length;
      const difficultyIndex = questionAnswers.length > 0 
        ? (correctCount / questionAnswers.length) * 100 
        : 0;

      questionStats.push({
        questionId,
        totalAnswers: questionAnswers.length,
        correctCount,
        difficultyIndex: Math.round(difficultyIndex * 100) / 100,
      });
    }

    res.json({
      success: true,
      analytics: {
        exam: {
          id: exam._id,
          title: exam.title,
          totalPoints: exam.totalPoints,
          passingScore: exam.passingScore,
        },
        attempts: {
          total: totalAttempts,
          passed: passedAttempts,
          failed: totalAttempts - passedAttempts,
          passRate: Math.round(passRate * 100) / 100,
        },
        scores: {
          average: Math.round(avgScore * 100) / 100,
          max: maxScore,
          distribution: {
            '0-25%': scores.filter(s => s <= maxScore * 0.25).length,
            '25-50%': scores.filter(s => s > maxScore * 0.25 && s <= maxScore * 0.5).length,
            '50-75%': scores.filter(s => s > maxScore * 0.5 && s <= maxScore * 0.75).length,
            '75-100%': scores.filter(s => s > maxScore * 0.75).length,
          },
        },
        time: {
          averageMinutes: Math.round(avgTimeSpent * 100) / 100,
        },
        questions: questionStats,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching exam analytics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
