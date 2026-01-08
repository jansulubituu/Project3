import { Response } from 'express';
import { Exam, ExamAttempt, Question, Enrollment } from '../models';
import { AuthRequest } from '../middleware/auth';

/**
 * @desc    Get exam overview (for students)
 * @route   GET /api/exams/:examId/overview
 * @access  Private
 */
export const getExamOverview = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { examId } = req.params;

    const exam = await Exam.findById(examId)
      .populate({
        path: 'course',
        select: 'title slug instructor status',
      })
      .populate({
        path: 'section',
        select: 'title order',
      });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    // Check if exam is published
    if (exam.status !== 'published') {
      return res.status(403).json({
        success: false,
        message: 'Exam is not available',
      });
    }

    // Check enrollment for non-free courses
    const course = exam.course as any;
    if (course.status === 'published') {
      const enrollment = await Enrollment.findOne({
        student: req.user.id,
        course: course._id,
        status: 'active',
      });

      if (!enrollment && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You must be enrolled in this course to take the exam',
        });
      }
    }

    // Get user's attempts
    const attempts = await ExamAttempt.find({
      exam: examId,
      student: req.user.id,
    }).sort({ createdAt: -1 });

    const now = new Date();
    const isOpen = !exam.openAt || now >= exam.openAt;
    const isClosed = exam.closeAt && now > exam.closeAt;
    const canStart = isOpen && !isClosed;

    // Check remaining attempts
    const submittedAttempts = attempts.filter((a: any) => a.status === 'submitted');
    const remainingAttempts = exam.maxAttempts 
      ? Math.max(0, exam.maxAttempts - submittedAttempts.length)
      : null;

    res.json({
      success: true,
      exam: {
        id: exam._id,
        title: exam.title,
        description: exam.description,
        durationMinutes: exam.durationMinutes,
        totalPoints: exam.totalPoints,
        passingScore: exam.passingScore,
        openAt: exam.openAt,
        closeAt: exam.closeAt,
        maxAttempts: exam.maxAttempts,
        isOpen,
        isClosed,
        canStart: canStart && (remainingAttempts === null || remainingAttempts > 0),
      },
      attempts: {
        total: attempts.length,
        submitted: submittedAttempts.length,
        remaining: remainingAttempts,
        latest: attempts[0] || null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching exam overview',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Start exam attempt
 * @route   POST /api/exams/:examId/start
 * @access  Private
 */
export const startExamAttempt = async (req: AuthRequest, res: Response) => {
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

    // Check if exam is published
    if (exam.status !== 'published') {
      return res.status(403).json({
        success: false,
        message: 'Exam is not available',
      });
    }

    // Check enrollment
    const course = exam.course as any;
    if (course.status === 'published') {
      const enrollment = await Enrollment.findOne({
        student: req.user.id,
        course: course._id,
        status: 'active',
      });

      if (!enrollment && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You must be enrolled in this course to take the exam',
        });
      }
    }

    // Check time window
    const now = new Date();
    if (exam.openAt && now < exam.openAt) {
      return res.status(403).json({
        success: false,
        message: 'Exam has not opened yet',
      });
    }

    if (exam.closeAt && now > exam.closeAt && !exam.allowLateSubmission) {
      return res.status(403).json({
        success: false,
        message: 'Exam has closed',
      });
    }

    // Check max attempts
    if (exam.maxAttempts) {
      const submittedAttempts = await ExamAttempt.countDocuments({
        exam: examId,
        student: req.user.id,
        status: 'submitted',
      });

      if (submittedAttempts >= exam.maxAttempts) {
        return res.status(403).json({
          success: false,
          message: `Maximum attempts (${exam.maxAttempts}) reached`,
        });
      }
    }

    // Check for in-progress attempt
    const inProgressAttempt = await ExamAttempt.findOne({
      exam: examId,
      student: req.user.id,
      status: 'in_progress',
    });

    if (inProgressAttempt) {
      // Return existing attempt
      return res.json({
        success: true,
        message: 'Resuming existing attempt',
        attempt: inProgressAttempt,
      });
    }

    // Get questions for this attempt
    let questionIds = exam.questions.map((q: any) => q.question);
    
    // Shuffle questions if enabled
    if (exam.shuffleQuestions) {
      questionIds = questionIds.sort(() => Math.random() - 0.5);
    }

    // Populate questions
    const questions = await Question.find({ _id: { $in: questionIds } });
    
    // Shuffle answers if enabled
    const questionsWithShuffledAnswers = questions.map((q: any) => {
      if ((q.type === 'single_choice' || q.type === 'multiple_choice') && exam.shuffleAnswers && q.options) {
        const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
        return {
          ...q.toObject(),
          options: shuffledOptions,
        };
      }
      return q.toObject();
    });

    // Create attempt
    const expiresAt = exam.durationMinutes 
      ? new Date(now.getTime() + exam.durationMinutes * 60 * 1000)
      : null;

    const attempt = await ExamAttempt.create({
      exam: examId,
      student: req.user.id,
      course: exam.course,
      section: exam.section,
      startedAt: now,
      expiresAt,
      status: 'in_progress',
      answers: [],
      score: 0,
      maxScore: exam.totalPoints,
      passed: false,
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string || undefined,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      message: 'Exam attempt started',
      attempt,
      questions: questionsWithShuffledAnswers,
      expiresAt,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error starting exam attempt',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Get exam attempt by ID
 * @route   GET /api/exams/:examId/attempts/:attemptId
 * @access  Private
 */
export const getExamAttemptById = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { attemptId } = req.params;

    const attempt = await ExamAttempt.findById(attemptId)
      .populate({
        path: 'exam',
        populate: {
          path: 'course',
          select: 'title slug instructor',
        },
      })
      .populate({
        path: 'answers.question',
      });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Exam attempt not found',
      });
    }

    // Check authorization
    if (attempt.student.toString() !== req.user.id && req.user.role !== 'admin') {
      const exam = attempt.exam as any;
      const course = exam.course as any;
      if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this attempt',
        });
      }
    }

    const exam = attempt.exam as any;
    const now = new Date();

    // Determine if correct answers should be shown
    let showCorrectAnswers = false;
    if (attempt.status === 'submitted') {
      if (exam.showCorrectAnswers === 'after_submit') {
        showCorrectAnswers = true;
      } else if (exam.showCorrectAnswers === 'after_close') {
        showCorrectAnswers = exam.closeAt ? now > exam.closeAt : true;
      }
    }

    // Get questions with correct answers if allowed
    const questionIds = exam.questions.map((q: any) => q.question);
    const questions = await Question.find({ _id: { $in: questionIds } });

    const questionsWithAnswers = questions.map((q: any) => {
      const answer = attempt.answers.find((a: any) => 
        a.question.toString() === q._id.toString()
      );

      const questionData: any = {
        id: q._id,
        type: q.type,
        difficulty: q.difficulty,
        text: q.text,
        images: q.images,
        points: q.points,
      };

      if (showCorrectAnswers) {
        if (q.type === 'single_choice' || q.type === 'multiple_choice') {
          questionData.options = q.options;
          questionData.correctAnswer = q.options
            .filter((opt: any) => opt.isCorrect)
            .map((opt: any) => opt.id);
        } else if (q.type === 'short_answer') {
          questionData.expectedAnswers = q.expectedAnswers;
        }
      } else {
        // Hide correct answers
        if (q.type === 'single_choice' || q.type === 'multiple_choice') {
          questionData.options = q.options.map((opt: any) => ({
            id: opt.id,
            text: opt.text,
            image: opt.image,
            // Don't include isCorrect
          }));
        }
      }

      if (answer) {
        questionData.userAnswer = {
          answerSingle: answer.answerSingle,
          answerMultiple: answer.answerMultiple,
          answerText: answer.answerText,
          isCorrect: answer.isCorrect,
          score: answer.score,
          maxScore: answer.maxScore,
        };
      }

      return questionData;
    });

    res.json({
      success: true,
      attempt: {
        id: attempt._id,
        exam: exam._id,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        expiresAt: attempt.expiresAt,
        status: attempt.status,
        score: exam.showScoreToStudent ? attempt.score : undefined,
        maxScore: exam.showScoreToStudent ? attempt.maxScore : undefined,
        passed: exam.showScoreToStudent ? attempt.passed : undefined,
      },
      questions: questionsWithAnswers,
      showCorrectAnswers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching exam attempt',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Submit exam attempt
 * @route   POST /api/exams/:examId/attempts/:attemptId/submit
 * @access  Private
 */
export const submitExamAttempt = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { attemptId } = req.params;
    const { answers } = req.body;

    const attempt = await ExamAttempt.findById(attemptId).populate('exam');
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Exam attempt not found',
      });
    }

    // Check authorization
    if (attempt.student.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to submit this attempt',
      });
    }

    // Check if already submitted
    if (attempt.status === 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Attempt already submitted',
      });
    }

    const exam = attempt.exam as any;

    // Check time limit
    const now = new Date();
    if (attempt.expiresAt && now > attempt.expiresAt) {
      attempt.status = 'expired';
      await attempt.save();
      return res.status(400).json({
        success: false,
        message: 'Time limit exceeded',
        attempt,
      });
    }

    // Check closeAt
    if (exam.closeAt && now > exam.closeAt && !exam.allowLateSubmission) {
      return res.status(403).json({
        success: false,
        message: 'Exam has closed',
      });
    }

    // Grade answers
    const gradedAnswers: any[] = [];
    let totalScore = 0;
    let totalMaxScore = 0;

    for (const answerData of answers) {
      const question = await Question.findById(answerData.question);
      if (!question) continue;

      const questionRef = exam.questions.find((q: any) => 
        q.question.toString() === question._id.toString()
      );
      const weight = questionRef?.weight || 1;
      // Use questionPoints if provided, otherwise use question.points
      const questionPoints = questionRef?.questionPoints !== undefined 
        ? questionRef.questionPoints 
        : question.points;
      const maxScore = questionPoints * weight;
      totalMaxScore += maxScore;

      let isCorrect = false;
      let score = 0;

      // Grade based on question type
      if (question.type === 'single_choice') {
        const correctOption = question.options?.find((opt: any) => opt.isCorrect);
        isCorrect = Boolean(correctOption && answerData.answerSingle === correctOption.id);
        if (isCorrect) {
          score = maxScore;
        } else if (question.negativeMarking) {
          score = -(question.negativePoints || 0) * weight;
        }
      } else if (question.type === 'multiple_choice') {
        const correctOptionIds = question.options
          ?.filter((opt: any) => opt.isCorrect)
          .map((opt: any) => opt.id)
          .sort() || [];
        const userAnswerIds = (answerData.answerMultiple || []).sort();
        
        // Check if all correct and no extra
        isCorrect = 
          correctOptionIds.length === userAnswerIds.length &&
          correctOptionIds.every((id, idx) => id === userAnswerIds[idx]);

        if (isCorrect) {
          score = maxScore;
        } else if (question.negativeMarking) {
          score = -(question.negativePoints || 0) * weight;
        }
      } else if (question.type === 'short_answer') {
        const userAnswer = (answerData.answerText || '').trim();
        const normalizedUserAnswer = question.caseSensitive 
          ? userAnswer 
          : userAnswer.toLowerCase();
        
        isCorrect = question.expectedAnswers?.some((expected: string) => {
          const normalizedExpected = question.caseSensitive 
            ? expected.trim() 
            : expected.trim().toLowerCase();
          return normalizedUserAnswer === normalizedExpected;
        }) || false;

        if (isCorrect) {
          score = maxScore;
        } else if (question.negativeMarking) {
          score = -(question.negativePoints || 0) * weight;
        }
      }

      totalScore += score;

      gradedAnswers.push({
        question: question._id,
        answerSingle: answerData.answerSingle,
        answerMultiple: answerData.answerMultiple,
        answerText: answerData.answerText,
        isCorrect,
        score,
        maxScore,
      });
    }

    // Apply late penalty if applicable
    let finalScore = totalScore;
    if (exam.closeAt && now > exam.closeAt && exam.allowLateSubmission && exam.latePenaltyPercent > 0) {
      const penalty = (totalScore * exam.latePenaltyPercent) / 100;
      finalScore = Math.max(0, totalScore - penalty);
    }

    // Check if passed
    const passed = finalScore >= exam.passingScore;

    // Update attempt
    attempt.answers = gradedAnswers;
    attempt.score = Math.max(0, finalScore);
    attempt.maxScore = totalMaxScore;
    attempt.passed = passed;
    attempt.submittedAt = now;
    attempt.status = 'submitted';
    await attempt.save();

    res.json({
      success: true,
      message: 'Exam submitted successfully',
      attempt: {
        id: attempt._id,
        score: exam.showScoreToStudent ? attempt.score : undefined,
        maxScore: exam.showScoreToStudent ? attempt.maxScore : undefined,
        passed: exam.showScoreToStudent ? Boolean(attempt.passed) : undefined,
        submittedAt: attempt.submittedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error submitting exam attempt',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    List my attempts for an exam
 * @route   GET /api/exams/:examId/attempts/my
 * @access  Private
 */
export const listMyAttemptsForExam = async (req: AuthRequest, res: Response) => {
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

    const attempts = await ExamAttempt.find({
      exam: examId,
      student: req.user.id,
    })
      .sort({ createdAt: -1 })
      .populate({
        path: 'exam',
        select: 'title totalPoints passingScore showScoreToStudent',
      });

    const attemptsWithScores = attempts.map((a: any) => {
      const examData = a.exam as any;
      return {
        id: a._id,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
        status: a.status,
        score: examData.showScoreToStudent ? a.score : undefined,
        maxScore: examData.showScoreToStudent ? a.maxScore : undefined,
        passed: examData.showScoreToStudent ? a.passed : undefined,
      };
    });

    res.json({
      success: true,
      attempts: attemptsWithScores,
      count: attempts.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error listing exam attempts',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
