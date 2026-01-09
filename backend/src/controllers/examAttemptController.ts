import { Response } from 'express';
import { Exam, ExamAttempt, Question, Enrollment, Progress } from '../models';
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

    // Format latest attempt with score info
    const latestAttempt = attempts[0] ? {
      _id: attempts[0]._id,
      startedAt: attempts[0].startedAt,
      submittedAt: attempts[0].submittedAt,
      expiresAt: attempts[0].expiresAt,
      status: attempts[0].status,
      score: attempts[0].status === 'submitted' ? attempts[0].score : undefined,
      maxScore: attempts[0].status === 'submitted' ? attempts[0].maxScore : undefined,
      passed: attempts[0].status === 'submitted' ? attempts[0].passed : undefined,
    } : null;

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
        latest: latestAttempt,
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

    // Calculate totalMaxScore from ALL questions in exam
    // This ensures maxScore is always the sum of all question points
    let totalMaxScore = 0;
    for (const questionRef of exam.questions) {
      const question = await Question.findById(questionRef.question);
      if (!question) continue;
      
      const weight = questionRef?.weight || 1;
      // Use questionPoints if provided, otherwise use question.points
      const questionPoints = questionRef?.questionPoints !== undefined 
        ? questionRef.questionPoints 
        : question.points;
      const maxScore = questionPoints * weight;
      totalMaxScore += maxScore;
    }

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
      maxScore: totalMaxScore, // Use calculated totalMaxScore instead of exam.totalPoints
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

    // Get question refs from exam to calculate maxScore for each question
    const questionRefsMap = new Map();
    exam.questions.forEach((qRef: any) => {
      questionRefsMap.set(qRef.question.toString(), qRef);
    });

    const questionsWithAnswers = questions.map((q: any) => {
      const answer = attempt.answers.find((a: any) => 
        a.question.toString() === q._id.toString()
      );

      // Calculate maxScore for this question (from exam questionRef)
      const questionRef = questionRefsMap.get(q._id.toString());
      const weight = questionRef?.weight || 1;
      const questionPoints = questionRef?.questionPoints !== undefined 
        ? questionRef.questionPoints 
        : q.points;
      const maxScore = questionPoints * weight;

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
        // Question was answered - use graded answer data
        // Get the actual answer text for single/multiple choice questions
        let answerSingleText: string | undefined = undefined;
        let answerMultipleTexts: string[] | undefined = undefined;
        
        if (answer.answerSingle && q.type === 'single_choice' && q.options) {
          const selectedOption = q.options.find((opt: any) => opt.id === answer.answerSingle);
          answerSingleText = selectedOption?.text;
        }
        
        if (answer.answerMultiple && q.type === 'multiple_choice' && q.options) {
          answerMultipleTexts = answer.answerMultiple
            .map((id: string) => {
              const option = q.options?.find((opt: any) => opt.id === id);
              return option?.text;
            })
            .filter((text: string | undefined): text is string => text !== undefined);
        }
        
        questionData.userAnswer = {
          // Original answer IDs/text
          answerSingle: answer.answerSingle,
          answerMultiple: answer.answerMultiple,
          answerText: answer.answerText,
          // Answer text for better display
          answerSingleText: answerSingleText,
          answerMultipleTexts: answerMultipleTexts,
          // Only show score, not isCorrect
          score: answer.score,
          maxScore: answer.maxScore,
        };
      } else {
        // Question was NOT answered - mark as unanswered
        questionData.userAnswer = {
          answerSingle: undefined,
          answerMultiple: undefined,
          answerText: undefined,
          answerSingleText: undefined,
          answerMultipleTexts: undefined,
          // Only show score, not isCorrect
          score: 0,
          maxScore: maxScore,
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

    // Calculate totalMaxScore from ALL questions in exam (not just answered ones)
    // This ensures maxScore is always the sum of all question points
    let totalMaxScore = 0;
    for (const questionRef of exam.questions) {
      const question = await Question.findById(questionRef.question);
      if (!question) continue;
      
      const weight = questionRef?.weight || 1;
      // Use questionPoints if provided, otherwise use question.points
      const questionPoints = questionRef?.questionPoints !== undefined 
        ? questionRef.questionPoints 
        : question.points;
      const maxScore = questionPoints * weight;
      totalMaxScore += maxScore;
    }

    // Grade answers
    const gradedAnswers: any[] = [];
    let totalScore = 0;

    // Create a map of answered questions for quick lookup
    const answeredQuestionsMap = new Map();
    answers.forEach((ans: any) => {
      if (ans.question) {
        answeredQuestionsMap.set(ans.question.toString(), ans);
      }
    });

    // Grade all questions in the exam (including unanswered ones)
    for (const questionRef of exam.questions) {
      const question = await Question.findById(questionRef.question);
      if (!question) continue;

      const answerData = answeredQuestionsMap.get(question._id.toString());

      const weight = questionRef?.weight || 1;
      // Use questionPoints if provided, otherwise use question.points
      const questionPoints = questionRef?.questionPoints !== undefined 
        ? questionRef.questionPoints 
        : question.points;
      const maxScore = questionPoints * weight;

      let isCorrect = false;
      let score = 0;
      let answerSingle: string | undefined = undefined;
      let answerMultiple: string[] | undefined = undefined;
      let answerText: string | undefined = undefined;

      // Grade based on question type
      if (question.type === 'single_choice') {
        // For single choice, check if answer is provided and matches correct option
        answerSingle = answerData?.answerSingle;
        const correctOption = question.options?.find((opt: any) => opt.isCorrect);
        if (correctOption && answerSingle) {
          isCorrect = answerSingle === correctOption.id;
        } else {
          // No answer provided or no correct option found
          isCorrect = false;
        }
        
        if (isCorrect) {
          score = maxScore;
        } else if (question.negativeMarking && answerSingle) {
          // Only apply negative marking if an answer was provided
          score = -(question.negativePoints || 0) * weight;
        } else {
          // No answer provided, score is 0 (not negative)
          score = 0;
        }
      } else if (question.type === 'multiple_choice') {
        answerMultiple = answerData?.answerMultiple;
        const correctOptionIds = question.options
          ?.filter((opt: any) => opt.isCorrect)
          .map((opt: any) => opt.id)
          .sort() || [];
        const userAnswerIds = (answerMultiple || []).filter((id: any) => id != null).sort();
        
        // Check if all correct and no extra (exact match)
        // Both arrays must have the same length and same elements
        isCorrect = 
          correctOptionIds.length > 0 &&
          correctOptionIds.length === userAnswerIds.length &&
          correctOptionIds.every((id, idx) => id === userAnswerIds[idx]);

        if (isCorrect) {
          score = maxScore;
        } else if (question.negativeMarking && userAnswerIds.length > 0) {
          // Only apply negative marking if at least one answer was provided
          score = -(question.negativePoints || 0) * weight;
        } else {
          // No answer provided or incorrect answer without negative marking
          score = 0;
        }
      } else if (question.type === 'short_answer') {
        answerText = answerData?.answerText;
        const userAnswer = (answerText || '').trim();
        
        // Check if answer is provided
        if (userAnswer && question.expectedAnswers && question.expectedAnswers.length > 0) {
          const normalizedUserAnswer = question.caseSensitive 
            ? userAnswer 
            : userAnswer.toLowerCase();
          
          isCorrect = question.expectedAnswers.some((expected: string) => {
            const normalizedExpected = question.caseSensitive 
              ? expected.trim() 
              : expected.trim().toLowerCase();
            return normalizedUserAnswer === normalizedExpected;
          });
        } else {
          // No answer provided or no expected answers
          isCorrect = false;
        }

        if (isCorrect) {
          score = maxScore;
        } else if (question.negativeMarking && userAnswer) {
          // Only apply negative marking if an answer was provided
          score = -(question.negativePoints || 0) * weight;
        } else {
          // No answer provided, score is 0 (not negative)
          score = 0;
        }
      }

      totalScore += score;

      // Always include answer fields, even if undefined (for unanswered questions)
      // Use null instead of undefined so MongoDB will store them
      gradedAnswers.push({
        question: question._id,
        answerSingle: answerSingle ?? null,
        answerMultiple: answerMultiple ?? null,
        answerText: answerText ?? null,
        isCorrect,
        score, // Can be negative for negative marking
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

    // Update or create Progress for exam
    try {
      const enrollment = await Enrollment.findOne({
        student: req.user.id,
        course: exam.course,
        status: 'active',
      });

      if (enrollment) {
        let examProgress = await Progress.findOne({
          student: req.user.id,
          exam: exam._id,
          type: 'exam',
        });

        if (!examProgress) {
          examProgress = new Progress({
            enrollment: enrollment._id,
            student: req.user.id,
            exam: exam._id,
            course: exam.course,
            type: 'exam',
            status: passed ? 'passed' : 'failed',
            examAttempts: 1,
            examBestScore: finalScore,
            examLatestScore: finalScore,
            examPassed: passed,
            examLastAttemptAt: now,
            timeSpent: 0,
            lastPosition: 0,
            watchedDuration: 0,
          });
        } else {
          examProgress.examAttempts = (examProgress.examAttempts || 0) + 1;
          examProgress.examLatestScore = finalScore;
          examProgress.examLastAttemptAt = now;

          // Update best score based on exam.scoringMethod
          if (exam.scoringMethod === 'highest') {
            examProgress.examBestScore = Math.max(
              examProgress.examBestScore || 0,
              finalScore
            );
          } else if (exam.scoringMethod === 'latest') {
            examProgress.examBestScore = finalScore;
          } else if (exam.scoringMethod === 'average') {
            // Calculate average from all submitted attempts
            const allAttempts = await ExamAttempt.find({
              exam: exam._id,
              student: req.user.id,
              status: 'submitted',
            });
            const avgScore = allAttempts.length > 0
              ? allAttempts.reduce((sum, a) => sum + a.score, 0) / allAttempts.length
              : finalScore;
            examProgress.examBestScore = Math.round(avgScore * 100) / 100;
          }

          // Update passed status based on best score
          examProgress.examPassed = (examProgress.examBestScore || 0) >= exam.passingScore;
          examProgress.status = examProgress.examPassed ? 'passed' : 'failed';
        }

        await examProgress.save();

        // Update enrollment if exam passed
        if (examProgress.examPassed && typeof enrollment.markExamComplete === 'function') {
          await enrollment.markExamComplete(exam._id);
        }
      }
    } catch (progressError) {
      // Log error but don't fail the submission
      console.error('Error updating exam progress:', progressError);
    }

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
