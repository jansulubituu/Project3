import { Request, Response } from 'express';
import { Review, Course, Enrollment } from '../models';
import mongoose from 'mongoose';
import type { ICourse } from '../models/Course';

// @desc    Create a review for a course
// @route   POST /api/courses/:courseId/reviews
// @access  Private (Student only, must be enrolled)
export const createReview = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check if user is enrolled in the course
    const enrollment = await Enrollment.findOne({
      student: userId,
      course: courseId,
      status: { $in: ['active', 'completed'] },
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to leave a review',
      });
    }

    // Check if user has already reviewed this course
    const existingReview = await Review.findOne({
      course: courseId,
      student: userId,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this course. You can update your existing review instead.',
      });
    }

    // Create review
    const review = await Review.create({
      course: courseId,
      student: userId,
      enrollment: enrollment._id,
      rating,
      comment,
    });

    // Populate student info
    await review.populate('student', 'fullName avatar');

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      review,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ValidationError') {
      const validationError = error as mongoose.Error.ValidationError;
      const errors = Object.values(validationError.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Error creating review',
      error: errorMessage,
    });
  }
};

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private (Review owner only)
export const updateReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Check if user is the owner of the review
    if (review.student.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own reviews',
      });
    }

    // Update review
    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;

    await review.save();

    // Populate student info
    await review.populate('student', 'fullName avatar');

    res.json({
      success: true,
      message: 'Review updated successfully',
      review,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ValidationError') {
      const validationError = error as mongoose.Error.ValidationError;
      const errors = Object.values(validationError.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Error updating review',
      error: errorMessage,
    });
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (Review owner or Admin)
export const deleteReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Check if user is the owner or admin
    if (review.student.toString() !== userId && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own reviews',
      });
    }

    // Store course ID and enrollment ID before deletion
    const courseId = review.course;
    const enrollmentId = review.enrollment;

    // Delete the review
    await Review.findByIdAndDelete(id);

    // Manually update course rating (hook may not always trigger with findByIdAndDelete)
    const course = await Course.findById(courseId);
    if (course) {
      // Type assertion to access method (method exists on schema but not in interface)
      const courseWithMethod = course as unknown as ICourse & { calculateAverageRating: () => Promise<void> };
      if (typeof courseWithMethod.calculateAverageRating === 'function') {
        await courseWithMethod.calculateAverageRating();
      }
    }

    // Update enrollment hasReviewed flag
    await Enrollment.findByIdAndUpdate(enrollmentId, {
      hasReviewed: false,
    });

    res.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Error deleting review',
      error: errorMessage,
    });
  }
};

// @desc    Mark review as helpful
// @route   POST /api/reviews/:id/helpful
// @access  Private
export const markHelpful = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isHelpful } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Check if user is trying to vote on their own review
    if (review.student.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot vote on your own review',
      });
    }

    // Use the model method to add helpful vote
    await review.addHelpfulVote(
      new mongoose.Types.ObjectId(userId),
      isHelpful === true
    );

    // Populate student info
    await review.populate('student', 'fullName avatar');

    res.json({
      success: true,
      message: 'Vote recorded successfully',
      review,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Error recording vote',
      error: errorMessage,
    });
  }
};

// @desc    Add instructor response to a review
// @route   POST /api/reviews/:id/response
// @access  Private (Instructor of the course or Admin)
export const addInstructorResponse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { response } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Populate course to get instructor
    await review.populate('course', 'instructor');
    const course = review.course as mongoose.Types.ObjectId | { instructor: mongoose.Types.ObjectId };
    
    // Type guard to check if course is populated
    const isPopulated = typeof course === 'object' && course !== null && 'instructor' in course;
    const instructorId = isPopulated ? course.instructor : null;

    // Check if user is the instructor of the course or admin
    if (
      (!instructorId || instructorId.toString() !== userId) &&
      userRole !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Only the course instructor or admin can respond to reviews',
      });
    }

    // Use the model method to add instructor response
    await review.addInstructorResponse(response);

    // Populate student info
    await review.populate('student', 'fullName avatar');

    res.json({
      success: true,
      message: 'Response added successfully',
      review,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ValidationError') {
      const validationError = error as mongoose.Error.ValidationError;
      const errors = Object.values(validationError.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Error adding response',
      error: errorMessage,
    });
  }
};

// @desc    Get a single review by ID
// @route   GET /api/reviews/:id
// @access  Public
export const getReviewById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id)
      .populate('student', 'fullName avatar')
      .populate('course', 'title thumbnail');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Only show published reviews to public, unless user is admin/instructor
    if (!review.isPublished && req.user?.role !== 'admin' && req.user?.role !== 'instructor') {
      return res.status(403).json({
        success: false,
        message: 'Review is not published',
      });
    }

    res.json({
      success: true,
      review,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Error fetching review',
      error: errorMessage,
    });
  }
};

// @desc    Get all reviews (Admin only)
// @route   GET /api/reviews
// @access  Private/Admin
export const getAllReviews = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      courseId,
      rating,
      isPublished,
      search,
    } = req.query;

    const query: Record<string, unknown> = {};

    // Filter by course
    if (courseId) {
      query.course = courseId;
    }

    // Filter by rating
    if (rating) {
      query.rating = Number(rating);
    }

    // Filter by published status
    if (isPublished !== undefined) {
      query.isPublished = isPublished === 'true';
    }

    // Search by comment
    if (search) {
      query.comment = { $regex: search, $options: 'i' };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const reviews = await Review.find(query)
      .populate('course', 'title thumbnail slug')
      .populate('student', 'fullName avatar email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Review.countDocuments(query);

    res.json({
      success: true,
      reviews,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        hasMore: skip + reviews.length < total,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Error fetching reviews',
      error: errorMessage,
    });
  }
};

