import { Request, Response } from 'express';
import { Enrollment, Lesson, Progress } from '../models';

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
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: course?._id,
      status: 'active',
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

    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: course?._id,
      status: 'active',
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


