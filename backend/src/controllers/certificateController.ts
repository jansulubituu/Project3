import { Request, Response } from 'express';
import { Enrollment, Course } from '../models';
import mongoose from 'mongoose';
import { createNotification } from '../services/notificationService';

/**
 * @desc    Get certificate for enrollment
 * @route   GET /api/certificates/enrollment/:enrollmentId
 * @access  Private (student who owns enrollment or admin)
 */
export const getCertificate = async (req: Request, res: Response) => {
  try {
    const { enrollmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid enrollment ID',
      });
    }

    const enrollment = await Enrollment.findById(enrollmentId)
      .populate('student', 'fullName email')
      .populate('course', 'title');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
    }

    // Check ownership
    const studentId = enrollment.student instanceof mongoose.Types.ObjectId
      ? enrollment.student.toString()
      : typeof enrollment.student === 'object' && enrollment.student !== null && '_id' in enrollment.student
      ? String((enrollment.student as { _id: mongoose.Types.ObjectId })._id)
      : String(enrollment.student);

    if (req.user?.role !== 'admin' && studentId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this certificate',
      });
    }

    if (!enrollment.certificateIssued) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not yet issued',
        hint: 'Complete the course to earn your certificate',
      });
    }

    // Check if there's new content since completion
    const hasNewContent = await enrollment.hasNewContentSinceCompletion();

    return res.json({
      success: true,
      certificate: {
        url: enrollment.certificateUrl,
        certificateId: enrollment.certificateId,
        issuedAt: enrollment.certificateIssuedAt,
        completionSnapshot: enrollment.completionSnapshot,
        hasNewContent,
        currentProgress: {
          totalLessons: enrollment.totalLessons,
          completedLessons: enrollment.completedLessons.length,
          progress: enrollment.progress,
        },
      },
    });
  } catch (error) {
    console.error('[Certificate API] Get certificate error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching certificate',
      error: (error as Error).message,
    });
  }
};

/**
 * @desc    Manually generate certificate (if auto-generation failed)
 * @route   POST /api/certificates/enrollment/:enrollmentId/generate
 * @access  Private (student who owns enrollment or admin)
 */
export const generateCertificateManually = async (req: Request, res: Response) => {
  try {
    const { enrollmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid enrollment ID',
      });
    }

    const enrollment = await Enrollment.findById(enrollmentId);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
    }

    // Check ownership
    if (
      req.user?.role !== 'admin' &&
      enrollment.student.toString() !== req.user?.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Check if already issued
    if (enrollment.certificateIssued) {
      return res.json({
        success: true,
        message: 'Certificate already issued',
        certificateUrl: enrollment.certificateUrl,
        certificateId: enrollment.certificateId,
      });
    }

    // Check completion status
    if (enrollment.status !== 'completed' || enrollment.progress < 100) {
      return res.status(400).json({
        success: false,
        message: 'Course not completed yet',
        currentProgress: enrollment.progress,
        status: enrollment.status,
      });
    }

    // Generate certificate
    console.info('[Certificate API] Manually generating certificate', {
      enrollmentId,
      userId: req.user?.id,
    });

    await enrollment.generateCertificate();

    // Populate course for notification
    await enrollment.populate('course', 'title slug');

    // Create notification for student (async, don't wait)
    const course = enrollment.course as any;
    if (course && enrollment.certificateId) {
      createNotification({
        userId: enrollment.student as any,
        type: 'certificate',
        title: 'Chứng chỉ đã được cấp',
        message: `Chúc mừng! Bạn đã nhận chứng chỉ cho khóa học '${course.title}'`,
        link: `/certificates/verify/${enrollment.certificateId}`,
        data: {
          certificateId: enrollment.certificateId,
          courseId: course._id.toString(),
          courseSlug: course.slug,
          enrollmentId: enrollment._id.toString(),
        },
      }).catch((err) => {
        console.error('Error creating certificate notification:', err);
      });
    }

    return res.json({
      success: true,
      message: 'Certificate generated successfully',
      certificateUrl: enrollment.certificateUrl,
      certificateId: enrollment.certificateId,
    });
  } catch (error) {
    console.error('[Certificate API] Generate certificate error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating certificate',
      error: (error as Error).message,
    });
  }
};

/**
 * @desc    Verify certificate by ID
 * @route   GET /api/certificates/verify/:certificateId
 * @access  Public
 */
export const verifyCertificate = async (req: Request, res: Response) => {
  try {
    const { certificateId } = req.params;

    const enrollment = await Enrollment.findOne({
      certificateId,
      certificateIssued: true,
    })
      .populate('student', 'fullName email')
      .populate('course', 'title')
      .populate({
        path: 'course',
        populate: { path: 'instructor', select: 'fullName' },
      });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: 'Certificate not found or invalid',
      });
    }

    interface PopulatedStudent {
      _id: mongoose.Types.ObjectId;
      fullName: string;
      email: string;
    }

    interface PopulatedCourse {
      _id: mongoose.Types.ObjectId;
      title: string;
      instructor?: {
        _id: mongoose.Types.ObjectId;
        fullName: string;
      };
    }

    const student = enrollment.student as unknown as PopulatedStudent;
    const course = enrollment.course as unknown as PopulatedCourse;

    return res.json({
      success: true,
      valid: true,
      certificate: {
        certificateId: enrollment.certificateId,
        studentName: student.fullName,
        courseTitle: course.title,
        instructorName: course.instructor?.fullName || 'EduLearn Instructor',
        issuedAt: enrollment.certificateIssuedAt,
        completedAt: enrollment.completedAt,
        completionSnapshot: enrollment.completionSnapshot,
      },
    });
  } catch (error) {
    console.error('[Certificate API] Verify certificate error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying certificate',
      error: (error as Error).message,
    });
  }
};

/**
 * @desc    Get enrollment info with certificate status
 * @route   GET /api/certificates/enrollment/:enrollmentId/status
 * @access  Private
 */
export const getCertificateStatus = async (req: Request, res: Response) => {
  try {
    const { enrollmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid enrollment ID',
      });
    }

    const enrollment = await Enrollment.findById(enrollmentId)
      .populate('course', 'title totalLessons');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
    }

    // Check ownership
    if (
      req.user?.role !== 'admin' &&
      enrollment.student.toString() !== req.user?.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const hasNewContent = await enrollment.hasNewContentSinceCompletion();

    return res.json({
      success: true,
      status: {
        isCompleted: enrollment.status === 'completed',
        progress: enrollment.progress,
        certificateIssued: enrollment.certificateIssued,
        certificateUrl: enrollment.certificateUrl,
        certificateId: enrollment.certificateId,
        hasNewContent,
        completionSnapshot: enrollment.completionSnapshot,
        current: {
          totalLessons: enrollment.totalLessons,
          completedLessons: enrollment.completedLessons.length,
        },
      },
    });
  } catch (error) {
    console.error('[Certificate API] Get status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching certificate status',
      error: (error as Error).message,
    });
  }
};

