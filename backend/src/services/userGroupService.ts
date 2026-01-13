import mongoose from 'mongoose';
import { User, Course, Enrollment } from '../models';

export interface UserGroup {
  id: string;
  name: string;
  description?: string;
  type: 'role' | 'course' | 'instructor_courses';
  userCount: number;
  courseId?: string;
  courseName?: string;
  instructorId?: string;
}

/**
 * Get users from a group
 */
export async function getGroupUsers(groupId: string, userId?: string, userRole?: string): Promise<mongoose.Types.ObjectId[]> {
  // Parse group ID format: role_{role}, course_{courseId}, instructor_{instructorId}_courses
  if (groupId.startsWith('role_')) {
    const role = groupId.replace('role_', '');
    if (!['admin', 'instructor', 'student'].includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }
    
    const users = await User.find({ role, isActive: true }).select('_id');
    return users.map((u: { _id: mongoose.Types.ObjectId }) => u._id);
  }

  if (groupId.startsWith('course_')) {
    const courseId = groupId.replace('course_', '');
    
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new Error(`Invalid course ID: ${courseId}`);
    }

    // For instructors, validate they own the course
    if (userRole === 'instructor' && userId) {
      const course = await Course.findById(courseId);
      if (!course || course.instructor.toString() !== userId) {
        throw new Error('You do not have access to this course');
      }
    }

    const enrollments = await Enrollment.find({ course: courseId }).select('student');
    const studentIds = enrollments.map((e: { student: mongoose.Types.ObjectId }) => e.student);
    const uniqueIds = [...new Set(studentIds.map((id: mongoose.Types.ObjectId) => id.toString()))];
    return uniqueIds.map((id: string) => new mongoose.Types.ObjectId(id));
  }

  if (groupId.startsWith('instructor_')) {
    const instructorId = groupId.replace('instructor_', '').replace('_courses', '');
    
    if (!mongoose.Types.ObjectId.isValid(instructorId)) {
      throw new Error(`Invalid instructor ID: ${instructorId}`);
    }

    // For instructors, validate they are accessing their own courses
    if (userRole === 'instructor' && userId && userId !== instructorId) {
      throw new Error('You can only access your own courses');
    }

    const courses = await Course.find({ instructor: instructorId }).select('_id');
    const courseIds = courses.map((c: { _id: mongoose.Types.ObjectId }) => c._id);

    if (courseIds.length === 0) {
      return [];
    }

    const enrollments = await Enrollment.find({ course: { $in: courseIds } }).select('student');
    const studentIds = enrollments.map((e: { student: mongoose.Types.ObjectId }) => e.student);
    const uniqueIds = [...new Set(studentIds.map((id: mongoose.Types.ObjectId) => id.toString()))];
    return uniqueIds.map((id: string) => new mongoose.Types.ObjectId(id));
  }

  throw new Error(`Invalid group ID format: ${groupId}`);
}

/**
 * Get available groups for a user
 */
export async function getAvailableGroups(userRole: string, userId?: string): Promise<UserGroup[]> {
  const groups: UserGroup[] = [];

  if (userRole === 'admin') {
    // Role-based groups
    const [adminCount, instructorCount, studentCount] = await Promise.all([
      User.countDocuments({ role: 'admin', isActive: true }),
      User.countDocuments({ role: 'instructor', isActive: true }),
      User.countDocuments({ role: 'student', isActive: true }),
    ]);

    groups.push({
      id: 'role_admin',
      name: 'Tất cả Admin',
      description: 'Tất cả quản trị viên trong hệ thống',
      type: 'role',
      userCount: adminCount,
    });

    groups.push({
      id: 'role_instructor',
      name: 'Tất cả Giảng viên',
      description: 'Tất cả giảng viên trong hệ thống',
      type: 'role',
      userCount: instructorCount,
    });

    groups.push({
      id: 'role_student',
      name: 'Tất cả Học viên',
      description: 'Tất cả học viên trong hệ thống',
      type: 'role',
      userCount: studentCount,
    });

    // Course-based groups
    const courses = await Course.find().select('_id title instructor').populate('instructor', 'fullName');
    for (const course of courses) {
      const enrollmentCount = await Enrollment.countDocuments({ course: course._id });
      groups.push({
        id: `course_${course._id}`,
        name: `Khóa học: ${course.title}`,
        description: `Tất cả học viên trong khóa học "${course.title}"`,
        type: 'course',
        userCount: enrollmentCount,
        courseId: course._id.toString(),
        courseName: course.title,
      });
    }
  } else if (userRole === 'instructor' && userId) {
    // Instructor can only see their own courses
    const courses = await Course.find({ instructor: userId }).select('_id title');
    
    for (const course of courses) {
      const enrollmentCount = await Enrollment.countDocuments({ course: course._id });
      groups.push({
        id: `course_${course._id}`,
        name: course.title,
        description: `Tất cả học viên trong khóa học này`,
        type: 'course',
        userCount: enrollmentCount,
        courseId: course._id.toString(),
        courseName: course.title,
      });
    }

    // All students in instructor's courses
    const allCourses = await Course.find({ instructor: userId }).select('_id');
    const courseIds = allCourses.map((c: { _id: mongoose.Types.ObjectId }) => c._id);
    
    if (courseIds.length > 0) {
      const uniqueStudents = await Enrollment.distinct('student', { course: { $in: courseIds } });
      groups.push({
        id: `instructor_${userId}_courses`,
        name: 'Tất cả học viên trong các khóa học của tôi',
        description: `Tất cả học viên trong ${courseIds.length} khóa học`,
        type: 'instructor_courses',
        userCount: uniqueStudents.length,
        instructorId: userId,
      });
    }
  }

  return groups;
}

/**
 * Validate group access for a user
 */
export function validateGroupAccess(userRole: string, userId: string, groupId: string): boolean {
  if (userRole === 'admin') {
    return true; // Admin can access all groups
  }

  if (groupId.startsWith('course_')) {
    // Instructors can only access their own courses
    // This will be validated in getGroupUsers
    return true;
  }

  if (groupId.startsWith('instructor_')) {
    const instructorId = groupId.replace('instructor_', '').replace('_courses', '');
    return userRole === 'instructor' && userId === instructorId;
  }

  return false;
}
