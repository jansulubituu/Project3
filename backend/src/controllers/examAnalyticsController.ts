import { Response } from 'express';
import { Exam, ExamAttempt } from '../models';
import { AuthRequest } from '../middleware/auth';

/**
 * @desc    Get student performance data for an exam
 * @route   GET /api/exams/:id/analytics/students
 * @access  Private/Instructor (own course) or Admin
 */
export const getStudentPerformance = async (req: AuthRequest, res: Response) => {
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
        message: 'Not authorized to view analytics for this exam',
      });
    }

    // Get all attempts with student info
    const attempts = await ExamAttempt.find({ exam: id, status: 'submitted' })
      .populate({
        path: 'student',
        select: 'fullName email',
      })
      .sort({ submittedAt: -1 });

    const studentPerformance = attempts.map((attempt: any) => {
      const student = attempt.student as any;
      const timeSpent = attempt.submittedAt && attempt.startedAt
        ? (new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000 / 60
        : 0;

      return {
        studentId: student._id,
        studentName: student.fullName || 'Unknown',
        studentEmail: student.email || '',
        attemptId: attempt._id,
        score: attempt.score,
        maxScore: attempt.maxScore,
        percentage: attempt.maxScore > 0 ? Math.round((attempt.score / attempt.maxScore) * 100 * 100) / 100 : 0,
        passed: attempt.passed,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        timeSpentMinutes: Math.round(timeSpent * 100) / 100,
      };
    });

    // Group by student to get best scores
    const studentMap = new Map();
    studentPerformance.forEach((perf: any) => {
      const key = perf.studentId.toString();
      if (!studentMap.has(key)) {
        studentMap.set(key, {
          studentId: perf.studentId,
          studentName: perf.studentName,
          studentEmail: perf.studentEmail,
          attempts: [],
          bestScore: perf.score,
          bestPercentage: perf.percentage,
          latestAttempt: perf.submittedAt,
        });
      }
      const student = studentMap.get(key);
      student.attempts.push(perf);
      if (perf.score > student.bestScore) {
        student.bestScore = perf.score;
        student.bestPercentage = perf.percentage;
      }
      if (new Date(perf.submittedAt) > new Date(student.latestAttempt)) {
        student.latestAttempt = perf.submittedAt;
      }
    });

    const studentsSummary = Array.from(studentMap.values()).map((student: any) => ({
      ...student,
      totalAttempts: student.attempts.length,
    }));

    res.json({
      success: true,
      students: studentsSummary,
      attempts: studentPerformance,
      count: studentsSummary.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching student performance',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Export analytics data as CSV
 * @route   GET /api/exams/:id/analytics/export
 * @access  Private/Instructor (own course) or Admin
 */
export const exportAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { id } = req.params;
    const { format = 'csv' } = req.query;

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
        message: 'Not authorized to export analytics for this exam',
      });
    }

    // Get all attempts with student info
    const attempts = await ExamAttempt.find({ exam: id, status: 'submitted' })
      .populate({
        path: 'student',
        select: 'fullName email',
      })
      .sort({ submittedAt: -1 });

    if (format === 'json') {
      const data = attempts.map((attempt: any) => {
        const student = attempt.student as any;
        const timeSpent = attempt.submittedAt && attempt.startedAt
          ? (new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000 / 60
          : 0;

        return {
          studentName: student.fullName || 'Unknown',
          studentEmail: student.email || '',
          score: attempt.score,
          maxScore: attempt.maxScore,
          percentage: attempt.maxScore > 0 ? Math.round((attempt.score / attempt.maxScore) * 100 * 100) / 100 : 0,
          passed: attempt.passed ? 'Yes' : 'No',
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
          timeSpentMinutes: Math.round(timeSpent * 100) / 100,
        };
      });

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="exam-${id}-analytics.json"`);
      res.json({ success: true, data });
      return;
    }

    // CSV format
    const csvRows = [
      ['Student Name', 'Email', 'Score', 'Max Score', 'Percentage', 'Passed', 'Started At', 'Submitted At', 'Time Spent (minutes)'].join(','),
    ];

    attempts.forEach((attempt: any) => {
      const student = attempt.student as any;
      const timeSpent = attempt.submittedAt && attempt.startedAt
        ? (new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000 / 60
        : 0;
      const percentage = attempt.maxScore > 0 ? Math.round((attempt.score / attempt.maxScore) * 100 * 100) / 100 : 0;

      csvRows.push([
        `"${(student.fullName || 'Unknown').replace(/"/g, '""')}"`,
        `"${(student.email || '').replace(/"/g, '""')}"`,
        attempt.score,
        attempt.maxScore,
        percentage,
        attempt.passed ? 'Yes' : 'No',
        attempt.startedAt ? new Date(attempt.startedAt).toISOString() : '',
        attempt.submittedAt ? new Date(attempt.submittedAt).toISOString() : '',
        Math.round(timeSpent * 100) / 100,
      ].join(','));
    });

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="exam-${id}-analytics.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error exporting analytics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
