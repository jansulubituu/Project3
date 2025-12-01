import { Request, Response } from 'express';
import { Section, Course } from '../models';

// @desc    Create section
// @route   POST /api/courses/:courseId/sections
// @access  Private/Instructor (own course) or Admin
export const createSection = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { title, description, order } = req.body;

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check authorization
    if (req.user!.role !== 'admin' && course.instructor.toString() !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create sections for this course',
      });
    }

    // If order not provided, get next order
    let sectionOrder = order;
    if (!sectionOrder) {
      const lastSection = await Section.findOne({ course: courseId })
        .sort({ order: -1 })
        .limit(1);
      sectionOrder = lastSection ? lastSection.order + 1 : 1;
    }

    // Check if order already exists
    const existingSection = await Section.findOne({ course: courseId, order: sectionOrder });
    if (existingSection) {
      return res.status(400).json({
        success: false,
        message: 'Section with this order already exists',
      });
    }

    const section = await Section.create({
      course: courseId,
      title,
      description,
      order: sectionOrder,
    });

    res.status(201).json({
      success: true,
      message: 'Section created successfully',
      section,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating section',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Update section
// @route   PUT /api/sections/:id
// @access  Private/Instructor (own course) or Admin
export const updateSection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, order } = req.body;

    const section = await Section.findById(id).populate('course');

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found',
      });
    }

    const course = section.course as any;

    // Check authorization
    if (req.user!.role !== 'admin' && course.instructor.toString() !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this section',
      });
    }

    // If order is being changed, check for conflicts
    if (order !== undefined && order !== section.order) {
      const existingSection = await Section.findOne({
        course: course._id,
        order,
        _id: { $ne: id },
      });
      if (existingSection) {
        return res.status(400).json({
          success: false,
          message: 'Section with this order already exists',
        });
      }
    }

    // Update section
    if (title) section.title = title;
    if (description !== undefined) section.description = description;
    if (order !== undefined) section.order = order;

    await section.save();

    res.json({
      success: true,
      message: 'Section updated successfully',
      section,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating section',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Delete section
// @route   DELETE /api/sections/:id
// @access  Private/Instructor (own course) or Admin
export const deleteSection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const section = await Section.findById(id).populate('course');

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found',
      });
    }

    const course = section.course as any;

    // Check authorization
    if (req.user!.role !== 'admin' && course.instructor.toString() !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this section',
      });
    }

    // Delete section (lessons will be deleted via post-deleteOne hook)
    await Section.deleteOne({ _id: id });

    res.json({
      success: true,
      message: 'Section deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting section',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Reorder sections
// @route   PUT /api/courses/:courseId/sections/reorder
// @access  Private/Instructor (own course) or Admin
export const reorderSections = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { sectionIds } = req.body; // Array of section IDs in new order

    if (!Array.isArray(sectionIds) || sectionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'sectionIds must be a non-empty array',
      });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check authorization
    if (req.user!.role !== 'admin' && course.instructor.toString() !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reorder sections for this course',
      });
    }

    // Update order for each section
    const updatePromises = sectionIds.map((sectionId: string, index: number) => {
      return Section.findByIdAndUpdate(sectionId, { order: index + 1 }, { new: true });
    });

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Sections reordered successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reordering sections',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

