import { Request, Response } from 'express';
import { Enrollment, Lesson, Progress, Exam, Section } from '../models';
import { AuthRequest } from '../middleware/auth';

interface QuizAnswerInput {
  questionId: string; // index as string: "0", "1", ...
  answer: string;
}

const mapQuizAnswers = (lesson: any, answers: QuizAnswerInput[]) => {
  if (!lesson.quizQuestions || !Array.isArray(lesson.quizQuestions)) {
    return [];
  }

  return answers
    .map((input) => {
      const index = Number.parseInt(input.questionId, 10);
      if (Number.isNaN(index) || index < 0 || index >= lesson.quizQuestions.length) {
        return null;
      }

      const question = lesson.quizQuestions[index];
      if (!question) return null;

      const correctAnswer = (question.correctAnswer ?? '').trim();
      const submitted = (input.answer ?? '').trim();

      let isCorrect = false;
      if (question.type === 'short_answer') {
        isCorrect = correctAnswer.localeCompare(submitted, undefined, {
          sensitivity: 'accent',
          usage: 'search',
        }) === 0;
      } else {
        isCorrect = correctAnswer === submitted;
      }

      return {
        questionId: String(index),
        answer: input.answer,
        isCorrect,
      };
    })
    .filter((item) => item !== null) as { questionId: string; answer: string; isCorrect: boolean }[];
};

// @desc    Update lesson progress (video/quiz)
// @route   PUT /api/progress/lesson/:lessonId
// @access  Private (student must be enrolled)
export const updateLessonProgress = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { lessonId } = req.params;
    const { status, lastPosition, timeSpent, answers } = req.body as {
      status?: 'not_started' | 'in_progress' | 'completed';
      lastPosition?: number;
      timeSpent?: number;
      answers?: QuizAnswerInput[];
    };

    const lesson = await Lesson.findById(lessonId).populate('course');

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    const course: any = lesson.course;

    // Ensure student is enrolled in the course
    // Include both active and completed enrollments to allow access to lessons
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: course?._id,
      status: { $in: ['active', 'completed'] },
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to update progress',
      });
    }

    // Find or create progress document
    let progress = await Progress.findOne({
      student: req.user.id,
      lesson: lesson._id,
    });

    if (!progress) {
      progress = new Progress({
        enrollment: enrollment._id,
        student: req.user.id,
        lesson: lesson._id,
        course: course?._id,
        type: 'lesson',
        status: status || 'in_progress',
        lastPosition: lastPosition || 0,
        timeSpent: timeSpent || 0,
      });
    } else {
      if (typeof lastPosition === 'number') {
        progress.lastPosition = lastPosition;
      }
      if (typeof timeSpent === 'number') {
        progress.timeSpent = (progress.timeSpent || 0) + Math.max(timeSpent, 0);
      }
      if (status) {
        progress.status = status;
      }
    }

    // Handle quiz submission
    if (lesson.type === 'quiz' && Array.isArray(answers) && answers.length > 0) {
      const mappedAnswers = mapQuizAnswers(lesson, answers);

      if (mappedAnswers.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid quiz answers',
        });
      }

      await (progress as any).submitQuiz(mappedAnswers);
    } else {
      // If status is being set to completed, ensure it's marked as modified
      if (status === 'completed') {
        (progress as any).status = 'completed';
        (progress as any).markModified('status');
      }
      await progress.save();
    }

    // Reload enrollment to get updated data (timeSpent, lastAccessed, completedLessons, etc.)
    const updatedEnrollment = await Enrollment.findById(enrollment._id)
      .select('progress status completedLessons totalLessons totalTimeSpent lastAccessed');

    res.json({
      success: true,
      message: 'Progress updated successfully',
      progress,
      enrollment: updatedEnrollment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating lesson progress',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Mark lesson as complete
// @route   POST /api/progress/lesson/:lessonId/complete
// @access  Private (student must be enrolled)
export const completeLesson = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId).populate('course');

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    const course: any = lesson.course;

    // Include both active and completed enrollments to allow access to lessons
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: course?._id,
      status: { $in: ['active', 'completed'] },
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to complete a lesson',
      });
    }

    let progress = await Progress.findOne({
      student: req.user.id,
      lesson: lesson._id,
    });

    if (!progress) {
      progress = new Progress({
        enrollment: enrollment._id,
        student: req.user.id,
        lesson: lesson._id,
        course: course?._id,
        type: 'lesson',
        status: 'completed',
        lastPosition: 0,
        timeSpent: 0,
      });
    }

    await (progress as any).markCompleted();

    // Reload enrollment to get updated progress (including completedLessons)
    const updatedEnrollment = await Enrollment.findById(enrollment._id)
      .select('progress status completedLessons totalLessons totalTimeSpent lastAccessed');

    res.json({
      success: true,
      message: 'Lesson marked as completed',
      progress,
      enrollment: updatedEnrollment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking lesson as completed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Get exam progress for current student
 * @route   GET /api/progress/exam/:examId
 * @access  Private
 */
export const getExamProgress = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { examId } = req.params;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    const progress = await Progress.findOne({
      student: req.user.id,
      exam: examId,
      type: 'exam',
    }).populate('exam');

    res.json({
      success: true,
      progress: progress || null,
      exam: {
        id: exam._id,
        title: exam.title,
        totalPoints: exam.totalPoints,
        passingScore: exam.passingScore,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching exam progress',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Get all progress (lessons + exams) for course
 * @route   GET /api/progress/course/:courseId
 * @access  Private
 */
export const getCourseProgress = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { courseId } = req.params;

    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: courseId,
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
    }

    const lessonProgress = await Progress.find({
      enrollment: enrollment._id,
      type: 'lesson',
    }).populate('lesson');

    const examProgress = await Progress.find({
      enrollment: enrollment._id,
      type: 'exam',
    }).populate('exam');

    res.json({
      success: true,
      lessonProgress,
      examProgress,
      enrollment: {
        id: enrollment._id,
        progress: enrollment.progress,
        completedLessons: enrollment.completedLessons,
        completedExams: enrollment.completedExams || [],
        totalLessons: enrollment.totalLessons,
        status: enrollment.status,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching course progress',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Mark exam as complete (manual)
 * @route   POST /api/progress/exam/:examId/complete
 * @access  Private
 */
export const markExamComplete = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { examId } = req.params;

    const exam = await Exam.findById(examId).populate('course');
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    const course: any = exam.course;

    // Include both active and completed enrollments to allow access to exams
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: course?._id,
      status: { $in: ['active', 'completed'] },
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to complete an exam',
      });
    }

    let progress = await Progress.findOne({
      student: req.user.id,
      exam: examId,
      type: 'exam',
    });

    if (!progress) {
      progress = new Progress({
        enrollment: enrollment._id,
        student: req.user.id,
        exam: examId,
        course: course?._id,
        type: 'exam',
        status: 'passed',
        examAttempts: 0,
        examBestScore: exam.passingScore,
        examLatestScore: exam.passingScore,
        examPassed: true,
        timeSpent: 0,
        lastPosition: 0,
        watchedDuration: 0,
      });
    } else {
      progress.examPassed = true;
      progress.status = 'passed';
    }

    await progress.save();

    // Update enrollment
    if (typeof enrollment.markExamComplete === 'function') {
      await enrollment.markExamComplete(exam._id);
    }

    // Reload enrollment to get updated progress
    const updatedEnrollment = await Enrollment.findById(enrollment._id)
      .select('progress status completedLessons completedExams totalLessons totalTimeSpent lastAccessed');

    res.json({
      success: true,
      message: 'Exam marked as completed',
      progress,
      enrollment: updatedEnrollment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking exam as completed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Check if lesson/section is unlocked (exam prerequisites check)
 * @route   GET /api/progress/unlock-check
 * @access  Private
 */
export const checkUnlockStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { courseId, lessonId, sectionId } = req.query as {
      courseId?: string;
      lessonId?: string;
      sectionId?: string;
    };

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'courseId is required',
      });
    }

    // Check enrollment - include both active and completed enrollments
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: courseId,
      status: { $in: ['active', 'completed'] },
    });

    if (!enrollment) {
      return res.json({
        success: true,
        unlocked: false,
        reason: 'not_enrolled',
        message: 'You must be enrolled in this course',
      });
    }

    // Get course sections sorted by order
    const sections = await Section.find({ course: courseId }).sort({ order: 1 });

    // Determine target section order
    let targetSectionOrder: number | null = null;
    let targetLessonOrder: number | null = null;

    if (sectionId) {
      const targetSection = sections.find(
        (s) => s._id.toString() === sectionId.toString()
      );
      if (targetSection) {
        targetSectionOrder = targetSection.order;
      }
    } else if (lessonId) {
      const lesson = await Lesson.findById(lessonId).populate('section');
      if (lesson) {
        const lessonSection = lesson.section as any;
        if (lessonSection) {
          const section = sections.find(
            (s) => s._id.toString() === lessonSection._id.toString()
          );
          if (section) {
            targetSectionOrder = section.order;
          }
        }
        targetLessonOrder = lesson.order;
      }
    }

    // If no target specified, check all exams
    if (targetSectionOrder === null && !lessonId) {
      // Just check if there are any blocking exams
      const allExams = await Exam.find({
        course: courseId,
        status: 'published',
      });

      for (const exam of allExams) {
        const examProgress = await Progress.findOne({
          student: req.user.id,
          exam: exam._id,
          type: 'exam',
        });

        if (!examProgress || !examProgress.examPassed) {
          const examSection = sections.find(
            (s) => s._id.toString() === exam.section?.toString()
          );
          if (examSection) {
            return res.json({
              success: true,
              unlocked: false,
              reason: 'exam_required',
              blockingExam: exam._id,
              examTitle: exam.title,
              examSection: examSection.title,
              message: `You must pass "${exam.title}" in "${examSection.title}" to continue`,
            });
          }
        }
      }

      return res.json({
        success: true,
        unlocked: true,
      });
    }

    // Check exam prerequisites
    // Logic: Exam only blocks content AFTER it (based on section order and exam order)
    // Exam does NOT block content BEFORE it
    for (const section of sections) {
      // Find exams in this section
      const exams = await Exam.find({
        course: courseId,
        section: section._id,
        status: 'published',
      }).sort({ order: 1, createdAt: 1 }); // Sort by order first, then createdAt as fallback

      // Check if any exam blocks the target content
      for (const exam of exams) {
        const examProgress = await Progress.findOne({
          student: req.user.id,
          exam: exam._id,
          type: 'exam',
        });

        // Only check exams that haven't been passed
        if (!examProgress || !examProgress.examPassed) {
          // Use exam.order if available, otherwise use 999 as fallback
          const examOrder = (exam as any).order !== undefined && (exam as any).order !== null 
            ? (exam as any).order 
            : 999; // Default to high number if no order (exam won't block earlier content)
          
          // Check if this exam blocks the target content
          // Exam only blocks content AFTER it (based on section order and item order)
          let blocksTarget = false;
          
          if (lessonId && targetSectionOrder !== null && targetLessonOrder !== null) {
            // Target is a specific lesson
            if (section.order < targetSectionOrder) {
              // Exam is in a section before target section → blocks target
              blocksTarget = true;
            } else if (section.order === targetSectionOrder) {
              // Exam is in same section as target lesson
              // Only block if exam order < lesson order (exam comes before lesson)
              // Lessons and exams are at the same level, sorted by order
              if (examOrder < targetLessonOrder) {
                blocksTarget = true;
              }
            }
            // If exam is in section after target, it doesn't block
          } else if (sectionId && targetSectionOrder !== null) {
            // Target is a section
            // Exam blocks target section if exam's section order < target section order
            if (section.order < targetSectionOrder) {
              blocksTarget = true;
            }
            // If exam is in same or later section, it doesn't block
          } else if (!lessonId && !sectionId) {
            // No specific target, check if exam blocks general progress
            // For now, don't block if no specific target
            blocksTarget = false;
          }
          
          if (blocksTarget) {
            return res.json({
              success: true,
              unlocked: false,
              reason: 'exam_required',
              blockingExam: exam._id,
              examTitle: exam.title,
              examSection: section.title,
              message: `You must pass "${exam.title}" in "${section.title}" to continue`,
            });
          }
        }
      }
    }

    // All prerequisites met
    res.json({
      success: true,
      unlocked: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking unlock status',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};


