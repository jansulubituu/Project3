'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Lesson {
  _id: string;
  title: string;
  description?: string;
  type: string;
  order: number;
  duration?: number;
  isFree: boolean;
  isPublished: boolean;
  progress?: {
    status: 'not_started' | 'in_progress' | 'completed';
    completedAt?: string;
  } | null;
}

interface Exam {
  _id: string;
  title: string;
  description?: string;
  status: string;
  totalPoints: number;
  passingScore: number;
  durationMinutes: number;
  openAt?: string | null;
  closeAt?: string | null;
  maxAttempts?: number | null;
  remainingAttempts?: number | null;
  hasRemainingAttempts?: boolean;
  order?: number; // Order within section (for sorting with lessons)
  allowLateSubmission?: boolean; // Allow submission after closeAt
  latePenaltyPercent?: number; // Penalty percentage for late submission
  progress?: {
    status: 'not_started' | 'in_progress' | 'passed' | 'failed';
    bestScore?: number;
    latestScore?: number;
    passed?: boolean;
    attempts?: number;
  } | null;
}

interface Section {
  _id: string;
  title: string;
  description?: string;
  order: number;
  duration?: number;
  lessonCount?: number;
  lessons: Lesson[];
  exams?: Exam[];
}

interface CourseCurriculumProps {
  courseId: string;
  courseSlug: string;
  isEnrolled: boolean;
}

export default function CourseCurriculum({
  courseId,
  courseSlug,
  isEnrolled,
}: CourseCurriculumProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [unlockModal, setUnlockModal] = useState<{
    show: boolean;
    examTitle?: string;
    examId?: string;
    message?: string;
  }>({ show: false });
  const [lockedLessons, setLockedLessons] = useState<Set<string>>(new Set());
  const [lockedExams, setLockedExams] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCurriculum();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, isEnrolled, isAuthenticated]);

  const fetchCurriculum = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/courses/${courseId}/curriculum`);
      if (response.data.success) {
        const sectionsData = response.data.sections || [];
        console.log('Curriculum data:', sectionsData); // Debug log
        sectionsData.forEach((section: Section) => {
          if (section.exams && section.exams.length > 0) {
            console.log(`Section ${section.title} has ${section.exams.length} exams:`, section.exams);
          }
        });
        // Clear locked states before checking
        setLockedLessons(new Set());
        setLockedExams(new Set());
        
        // Expand first section by default
        if (sectionsData.length > 0) {
          setExpandedSections(new Set([sectionsData[0]._id]));
        }
        
        // Check unlock status for all lessons and exams if enrolled
        // Lessons and exams are at the same level, sorted by order
        if (isEnrolled && isAuthenticated) {
          const lockedLessonsSet = new Set<string>();
          const lockedExamsSet = new Set<string>();
          
          // Process each section
          for (const section of sectionsData) {
            const sectionOrder = section.order || 0;
            const lessons = section.lessons || [];
            const exams = section.exams || [];
            
            // Merge lessons and exams, sort by order (they're at the same level)
            const allContent: Array<{ type: 'lesson' | 'exam'; item: Lesson | Exam; order: number }> = [];
            
            lessons.forEach((lesson: Lesson) => {
              allContent.push({
                type: 'lesson',
                item: lesson,
                order: lesson.order || 0,
              });
            });
            
            exams.forEach((exam: Exam) => {
              allContent.push({
                type: 'exam',
                item: exam,
                order: (exam as Exam & { order?: number }).order || 0,
              });
            });
            
            // Sort by order
            allContent.sort((a, b) => a.order - b.order);
            
            // Check each content item
            for (const content of allContent) {
              if (content.type === 'lesson') {
                const lesson = content.item as Lesson;
                
                // Free lessons are always unlocked
                if (lesson.isFree) {
                  continue;
                }
                
                // First lesson (order = 1 in first section) is always unlocked
                if (sectionOrder === 1 && lesson.order === 1) {
                  continue;
                }
                
                // Completed lessons are unlocked
                if (lesson.progress?.status === 'completed') {
                  continue;
                }
                
                // Check if all previous content (lessons and exams) are completed
                let allPreviousCompleted = true;
                
                for (const prevSection of sectionsData) {
                  const prevSectionOrder = prevSection.order || 0;
                  
                  // Only check sections before or same as current section
                  if (prevSectionOrder > sectionOrder) {
                    break;
                  }
                  
                  // Get all content in previous section
                  const prevLessons = prevSection.lessons || [];
                  const prevExams = prevSection.exams || [];
                  const prevAllContent: Array<{ type: 'lesson' | 'exam'; item: Lesson | Exam; order: number }> = [];
                  
                  prevLessons.forEach((l: Lesson) => {
                    prevAllContent.push({ type: 'lesson', item: l, order: l.order || 0 });
                  });
                  
                  prevExams.forEach((e: Exam) => {
                    prevAllContent.push({ type: 'exam', item: e, order: (e as Exam & { order?: number }).order || 0 });
                  });
                  
                  prevAllContent.sort((a, b) => a.order - b.order);
                  
                  // Check all content before current lesson
                  for (const prevContent of prevAllContent) {
                    if (prevSectionOrder < sectionOrder) {
                      // Previous section: check all content
                      if (prevContent.type === 'lesson') {
                        const prevLesson = prevContent.item as Lesson;
                        if (!prevLesson.isFree && prevLesson.progress?.status !== 'completed') {
                          allPreviousCompleted = false;
                          break;
                        }
                      } else {
                        const prevExam = prevContent.item as Exam;
                        const prevExamProgress = prevExam.progress as any;
                        if (!prevExamProgress || !prevExamProgress.passed) {
                          allPreviousCompleted = false;
                          break;
                        }
                      }
                    } else if (prevSectionOrder === sectionOrder) {
                      // Same section: only check content before current lesson
                      if (prevContent.order < lesson.order) {
                        if (prevContent.type === 'lesson') {
                          const prevLesson = prevContent.item as Lesson;
                          if (!prevLesson.isFree && prevLesson.progress?.status !== 'completed') {
                            allPreviousCompleted = false;
                            break;
                          }
                        } else {
                          const prevExam = prevContent.item as Exam;
                          const prevExamProgress = prevExam.progress as any;
                          if (!prevExamProgress || !prevExamProgress.passed) {
                            allPreviousCompleted = false;
                            break;
                          }
                        }
                      } else {
                        break; // Reached current lesson
                      }
                    }
                  }
                  
                  if (!allPreviousCompleted) {
                    break;
                  }
                }
                
                if (!allPreviousCompleted) {
                  lockedLessonsSet.add(lesson._id);
                }
              } else {
                // Exam
                const exam = content.item as Exam;
                const now = new Date();
                const examOpenAt = exam.openAt ? new Date(exam.openAt) : null;
                const examCloseAt = exam.closeAt ? new Date(exam.closeAt) : null;
                const allowLateSubmission = (exam as Exam & { allowLateSubmission?: boolean }).allowLateSubmission || false;
                
                // Lock if not open yet
                if (examOpenAt && now < examOpenAt) {
                  lockedExamsSet.add(exam._id);
                  continue;
                }
                
                // Lock if expired AND late submission not allowed
                if (examCloseAt && now > examCloseAt && !allowLateSubmission) {
                  lockedExamsSet.add(exam._id);
                  continue;
                }
                
                // Get exam order (default to 0 if not set)
                const examOrder = (exam as Exam & { order?: number }).order ?? 0;
                
                // First exam in first section (if no lessons before it) is always unlocked (if time allows)
                // For exam with order 0 in first section: unlock only if no lessons in first section
                if (sectionOrder === 1) {
                  if (examOrder === 1) {
                    // Exam with order 1: check if there are lessons with order < 1 (should be none)
                    const lessonsBeforeExam = section.lessons?.filter((l: Lesson) => (l.order || 0) < 1) || [];
                    if (lessonsBeforeExam.length === 0) {
                      // No lessons before exam, so it's the first content - unlock it
                      continue;
                    }
                  } else if (examOrder === 0) {
                    // Exam with order 0: check if there are any lessons in first section
                    // If no lessons, unlock it (it's the first content)
                    const lessonsInSection = section.lessons || [];
                    if (lessonsInSection.length === 0) {
                      // No lessons in first section, exam is first content - unlock it
                      continue;
                    }
                    // If there are lessons, check if all are completed (exam comes after all lessons)
                    const allLessonsCompleted = lessonsInSection.every((l: Lesson) => l.isFree || l.progress?.status === 'completed');
                    if (allLessonsCompleted) {
                      // All lessons completed, unlock exam
                      continue;
                    }
                  }
                }
                
                // Completed exams are unlocked
                const examProgress = exam.progress as any;
                if (examProgress && examProgress.passed) {
                  continue;
                }
                
                // Check if all previous content (lessons and exams) are completed
                let allPreviousCompleted = true;
                
                for (const prevSection of sectionsData) {
                  const prevSectionOrder = prevSection.order || 0;
                  
                  if (prevSectionOrder > sectionOrder) {
                    break;
                  }
                  
                  const prevLessons = prevSection.lessons || [];
                  const prevExams = prevSection.exams || [];
                  const prevAllContent: Array<{ type: 'lesson' | 'exam'; item: Lesson | Exam; order: number }> = [];
                  
                  prevLessons.forEach((l: Lesson) => {
                    prevAllContent.push({ type: 'lesson', item: l, order: l.order || 0 });
                  });
                  
                  prevExams.forEach((e: Exam) => {
                    prevAllContent.push({ type: 'exam', item: e, order: (e as Exam & { order?: number }).order ?? 0 });
                  });
                  
                  // Sort by order (0 comes before 1, etc.)
                  prevAllContent.sort((a, b) => a.order - b.order);
                  
                  for (const prevContent of prevAllContent) {
                    if (prevSectionOrder < sectionOrder) {
                      // Previous section: check all content
                      if (prevContent.type === 'lesson') {
                        const prevLesson = prevContent.item as Lesson;
                        if (!prevLesson.isFree && prevLesson.progress?.status !== 'completed') {
                          allPreviousCompleted = false;
                          break;
                        }
                      } else {
                        const prevExam = prevContent.item as Exam;
                        const prevExamProgress = prevExam.progress as any;
                        if (!prevExamProgress || !prevExamProgress.passed) {
                          allPreviousCompleted = false;
                          break;
                        }
                      }
                    } else if (prevSectionOrder === sectionOrder) {
                      // Same section: only check content before current exam
                      // Use strict comparison: order 0 < order 1, etc.
                      // If exam has order 0, check all lessons in the same section (since 0 < any lesson order)
                      if (examOrder === 0) {
                        // Exam with order 0: check all lessons in same section
                        if (prevContent.type === 'lesson') {
                          const prevLesson = prevContent.item as Lesson;
                          if (!prevLesson.isFree && prevLesson.progress?.status !== 'completed') {
                            allPreviousCompleted = false;
                            break;
                          }
                        } else {
                          // Another exam with order 0 or less - skip (can't have order < 0)
                          break;
                        }
                      } else if (prevContent.order < examOrder) {
                        if (prevContent.type === 'lesson') {
                          const prevLesson = prevContent.item as Lesson;
                          if (!prevLesson.isFree && prevLesson.progress?.status !== 'completed') {
                            allPreviousCompleted = false;
                            break;
                          }
                        } else {
                          const prevExam = prevContent.item as Exam;
                          const prevExamProgress = prevExam.progress as any;
                          if (!prevExamProgress || !prevExamProgress.passed) {
                            allPreviousCompleted = false;
                            break;
                          }
                        }
                      } else {
                        break; // Reached current exam or content after it
                      }
                    }
                  }
                  
                  if (!allPreviousCompleted) {
                    break;
                  }
                }
                
                if (!allPreviousCompleted) {
                  lockedExamsSet.add(exam._id);
                }
              }
            }
          }
          
          setLockedLessons(lockedLessonsSet);
          setLockedExams(lockedExamsSet);
        }
        
        // Set sections after all checks are complete to avoid render issues
        setSections(sectionsData);
      }
    } catch (error) {
      console.error('Failed to fetch curriculum:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes || minutes === 0) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    // Don't show "0 phút" - return empty string instead
    if (hours === 0 && mins === 0) return '';
    if (hours === 0) return `${mins} phút`;
    return mins > 0 ? `${hours} giờ ${mins} phút` : `${hours} giờ`;
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video':
        return '▶️';
      case 'article':
        return '📄';
      case 'quiz':
        return '❓';
      case 'assignment':
        return '📝';
      case 'resource':
        return '📎';
      default:
        return '📚';
    }
  };

  const handleLessonClick = async (lesson: Lesson) => {
    // Free lessons can be accessed by anyone (authenticated or not)
    if (lesson.isFree) {
      // Free lessons don't require enrollment, but check unlock status if authenticated
      if (isAuthenticated && isEnrolled) {
        try {
          const unlockResponse = await api.get('/progress/unlock-check', {
            params: {
              courseId,
              lessonId: lesson._id,
            },
          });

          if (unlockResponse.data.success && !unlockResponse.data.unlocked) {
            if (unlockResponse.data.reason === 'exam_required') {
              setUnlockModal({
                show: true,
                examTitle: unlockResponse.data.examTitle,
                examId: unlockResponse.data.blockingExam,
                message: unlockResponse.data.message,
              });
              return;
            }
          }
        } catch (error) {
          console.error('Failed to check unlock status:', error);
          // Continue anyway if check fails
        }
      }
      // Navigate to free lesson (no enrollment required)
      router.push(`/courses/${courseSlug}/learn/${lesson._id}`);
      return;
    }

    // Paid lessons: require enrollment
    if (!isEnrolled) {
      if (!isAuthenticated) {
        router.push(`/login?redirect=/courses/${courseSlug}/learn/${lesson._id}`);
      } else {
        // Show enrollment prompt
        alert('Vui lòng đăng ký khóa học để xem bài học này');
      }
      return;
    }

    // Check unlock status for enrolled users
    if (isEnrolled) {
      try {
        const unlockResponse = await api.get('/progress/unlock-check', {
          params: {
            courseId,
            lessonId: lesson._id,
          },
        });

        if (unlockResponse.data.success && !unlockResponse.data.unlocked) {
          if (unlockResponse.data.reason === 'exam_required') {
            setUnlockModal({
              show: true,
              examTitle: unlockResponse.data.examTitle,
              examId: unlockResponse.data.blockingExam,
              message: unlockResponse.data.message,
            });
            return;
          }
        }
      } catch (error) {
        console.error('Failed to check unlock status:', error);
        // Continue anyway if check fails
      }
    }

    router.push(`/courses/${courseSlug}/learn/${lesson._id}`);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải nội dung...</p>
        </div>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 text-center py-8">Chưa có nội dung khóa học</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Nội dung khóa học</h2>
            <p className="text-sm text-gray-600 mt-1">
              {(() => {
                const totalLessons = sections.reduce((total, section) => total + (section.lessons?.length || 0), 0);
                // Only count published exams for students
                const totalExams = sections.reduce((total, section) => {
                  const publishedExams = section.exams?.filter((exam) => exam.status === 'published') || [];
                  return total + publishedExams.length;
                }, 0);
                const parts = [];
                if (totalLessons > 0) parts.push(`${totalLessons} bài học`);
                if (totalExams > 0) parts.push(`${totalExams} bài kiểm tra`);
                return parts.length > 0 ? parts.join(' • ') : 'Chưa có nội dung';
              })()}
              {isEnrolled && (
                <span className="ml-2 text-blue-600 font-medium">
                  (Tiến độ của bạn được hiển thị bên dưới)
                </span>
              )}
            </p>
          </div>
          {!isEnrolled && (
            <div className="text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-lg">
              💡 Đăng ký để xem tất cả bài học
            </div>
          )}
        </div>
      </div>

      {/* Sections */}
      <div className="divide-y">
        {sections.map((section, sectionIdx) => {
          const isExpanded = expandedSections.has(section._id);
          // Show ALL lessons, but mark locked ones
          const allLessons = section.lessons || [];
          const sectionOrder = section.order && section.order > 0 ? section.order : sectionIdx + 1;
          
          // Filter exams: students and non-enrolled users only see published exams
          // Backend should already filter, but we add an extra safety check here
          const visibleExams = section.exams?.filter((exam) => exam.status === 'published') || [];
          
          // Determine if lessons/exams are locked
          const isLessonLocked = (lesson: Lesson) => {
            // Free lessons are never locked (can be viewed by anyone)
            if (lesson.isFree) return false;
            // Not enrolled and not free = locked
            if (!isEnrolled && !lesson.isFree) return true;
            // Enrolled but unlock check failed = locked
            if (isEnrolled && lockedLessons.has(lesson._id)) return true;
            return false;
          };
          
          const isExamLocked = (exam: Exam) => {
            // Not enrolled = locked
            if (!isEnrolled) return true;
            
            // Check time window
            const now = new Date();
            const examOpenAt = exam.openAt ? new Date(exam.openAt) : null;
            const examCloseAt = exam.closeAt ? new Date(exam.closeAt) : null;
            const allowLateSubmission = (exam as Exam & { allowLateSubmission?: boolean }).allowLateSubmission || false;
            
            // Lock if not open yet
            if (examOpenAt && now < examOpenAt) return true;
            
            // Lock if expired AND late submission not allowed
            if (examCloseAt && now > examCloseAt && !allowLateSubmission) return true;
            
            // Check if locked by unlock check
            if (lockedExams.has(exam._id)) return true;
            
            return false;
          };
          
          const getExamLockReason = (exam: Exam, section: Section): string | null => {
            if (!isEnrolled) return 'Đăng ký khóa học để làm bài kiểm tra này';
            
            const now = new Date();
            const examOpenAt = exam.openAt ? new Date(exam.openAt) : null;
            const examCloseAt = exam.closeAt ? new Date(exam.closeAt) : null;
            const allowLateSubmission = (exam as Exam & { allowLateSubmission?: boolean }).allowLateSubmission || false;
            const latePenaltyPercent = (exam as Exam & { latePenaltyPercent?: number }).latePenaltyPercent || 0;
            
            if (examOpenAt && now < examOpenAt && exam.openAt) {
              return `Bài kiểm tra sẽ mở vào ${examOpenAt.toLocaleString('vi-VN')}`;
            }
            
            if (examCloseAt && now > examCloseAt && exam.closeAt) {
              if (allowLateSubmission) {
                return `Bài kiểm tra đã đóng nhưng vẫn có thể nộp muộn${latePenaltyPercent > 0 ? ` (trừ ${latePenaltyPercent}% điểm)` : ''}`;
              }
              return `Bài kiểm tra đã đóng vào ${examCloseAt.toLocaleString('vi-VN')}`;
            }
            
            if (lockedExams.has(exam._id)) {
              // Check which prerequisites are missing
              const examOrder = (exam as Exam & { order?: number }).order ?? 0;
              const examSectionOrder = section.order || 0;
              
              const incompleteLessons: string[] = [];
              const incompleteExams: string[] = [];
              
              // Find incomplete prerequisite lessons and exams
              for (const checkSection of sections) {
                const checkSectionOrder = checkSection.order || 0;
                
                if (checkSectionOrder > examSectionOrder) break;
                
                // Check lessons
                const lessonsToCheck = checkSection.lessons?.filter((l: Lesson) => {
                  if (checkSectionOrder < examSectionOrder) return true;
                  if (checkSectionOrder === examSectionOrder) {
                    // If exam has order 0, check all lessons in same section
                    if (examOrder === 0) return true;
                    return (l.order || 0) < examOrder;
                  }
                  return false;
                }) || [];
                
                for (const lesson of lessonsToCheck) {
                  if (!lesson.isFree && lesson.progress?.status !== 'completed') {
                    incompleteLessons.push(lesson.title);
                  }
                }
                
                // Check exams before this exam
                if (checkSectionOrder < examSectionOrder) {
                  // Previous sections: check all exams
                  const examsToCheck = checkSection.exams || [];
                  for (const prevExam of examsToCheck) {
                    const prevExamProgress = prevExam.progress as any;
                    if (!prevExamProgress || !prevExamProgress.passed) {
                      incompleteExams.push(prevExam.title);
                    }
                  }
                } else if (checkSectionOrder === examSectionOrder && examOrder > 0) {
                  // Same section: only check exams before current exam (if exam order > 0)
                  const examsToCheck = checkSection.exams?.filter((e: Exam) => {
                    const eOrder = (e as Exam & { order?: number }).order ?? 0;
                    return eOrder < examOrder;
                  }) || [];
                  
                  for (const prevExam of examsToCheck) {
                    const prevExamProgress = prevExam.progress as any;
                    if (!prevExamProgress || !prevExamProgress.passed) {
                      incompleteExams.push(prevExam.title);
                    }
                  }
                }
              }
              
              if (incompleteLessons.length > 0) {
                return `Hoàn thành các bài học trước: ${incompleteLessons.slice(0, 3).join(', ')}${incompleteLessons.length > 3 ? '...' : ''}`;
              }
              
              if (incompleteExams.length > 0) {
                return `Hoàn thành các bài kiểm tra trước: ${incompleteExams.slice(0, 2).join(', ')}${incompleteExams.length > 2 ? '...' : ''}`;
              }
              
              return 'Hoàn thành các bài học trước để mở khóa';
            }
            
            return null;
          };
          
          const lessonCount = allLessons.length;
          const examCount = visibleExams.length;
          const durationText = section.duration && section.duration > 0 ? formatDuration(section.duration) : '';
          const headerParts: string[] = [];
          if (lessonCount > 0) headerParts.push(`${lessonCount} bài học`);
          if (examCount > 0) headerParts.push(`${examCount} bài kiểm tra`);
          if (durationText) headerParts.push(durationText);
          const headerSummary = headerParts.length > 0 ? headerParts.join(' • ') : 'Chưa có nội dung';

          return (
            <div key={section._id} className="border-b last:border-b-0">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section._id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg font-semibold text-gray-900">
                      {sectionOrder}. {section.title}
                    </span>
                    {section.description && (
                      <span className="text-sm text-gray-500">- {section.description}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                    <span className={headerParts.length === 0 ? 'text-gray-400' : ''}>{headerSummary}</span>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    isExpanded ? 'transform rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Section Lessons */}
              {isExpanded && (
                <div className="px-6 pb-4 bg-gray-50">
                  {allLessons.length === 0 && (!visibleExams || visibleExams.length === 0) ? (
                    <p className="text-sm text-gray-500 py-4 text-center">Chưa có nội dung trong phần này</p>
                  ) : (
                    <div className="space-y-1">
                      {allLessons.map((lesson, lessonIdx) => {
                        const lessonOrder = lesson.order && lesson.order > 0 ? lesson.order : lessonIdx + 1;
                        const locked = isLessonLocked(lesson);
                        return (
                          <button
                            key={lesson._id}
                            onClick={() => !locked && handleLessonClick(lesson)}
                            disabled={locked}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-left group border ${
                              locked
                                ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                                : 'border-transparent hover:bg-white hover:border-gray-200 cursor-pointer'
                            }`}
                            title={locked ? (!isEnrolled ? 'Đăng ký khóa học để xem bài học này' : 'Hoàn thành các bài học trước để mở khóa') : ''}
                          >
                            <span className={`text-lg ${locked ? 'opacity-50' : ''}`}>{getLessonIcon(lesson.type)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 flex-wrap">
                                <span className={`font-medium ${locked ? 'text-gray-500' : 'text-gray-900 group-hover:text-blue-600'}`}>
                                  {lessonOrder}. {lesson.title}
                                </span>
                                {locked && (
                                  <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded flex items-center gap-1">
                                    <span>🔒</span>
                                    <span>{!isEnrolled ? 'Khóa' : 'Chưa mở khóa'}</span>
                                  </span>
                                )}
                                {!locked && lesson.isFree && (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                    Miễn phí
                                  </span>
                                )}
                                {!locked && isEnrolled && lesson.progress && (
                                  <>
                                    {lesson.progress.status === 'completed' && (
                                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded flex items-center">
                                        ✓ Hoàn thành
                                      </span>
                                    )}
                                    {lesson.progress.status === 'in_progress' && (
                                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                        Đang học
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                              {lesson.description && (
                                <p className={`text-sm mt-1 line-clamp-1 ${locked ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {lesson.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              {!locked && lesson.duration && lesson.duration > 0 && (
                                <span>{formatDuration(lesson.duration)}</span>
                              )}
                              {!locked && (
                                <svg
                                  className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                              )}
                            </div>
                          </button>
                        );
                      })}

                    {/* Exams */}
                    {visibleExams && visibleExams.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Bài kiểm tra</h4>
                        <div className="space-y-2">
                          {visibleExams.map((exam) => {
                            const locked = isExamLocked(exam);
                            const lockReason = getExamLockReason(exam, section);
                            const canTake = !locked && exam.hasRemainingAttempts !== false;
                            const examProgress = exam.progress;
                            const isPassed = examProgress?.passed === true;
                            const isFailed = examProgress && !examProgress.passed;
                            const hasAttempts = examProgress && (examProgress.attempts || 0) > 0;
                            
                            // Check time window for display
                            const now = new Date();
                            const examOpenAt = exam.openAt ? new Date(exam.openAt) : null;
                            const examCloseAt = exam.closeAt ? new Date(exam.closeAt) : null;
                            const allowLateSubmission = (exam as Exam & { allowLateSubmission?: boolean }).allowLateSubmission || false;
                            const latePenaltyPercent = (exam as Exam & { latePenaltyPercent?: number }).latePenaltyPercent || 0;
                            const isNotOpenYet = examOpenAt !== null && now < examOpenAt;
                            const isExpired = examCloseAt !== null && now > examCloseAt;
                            const isLateButAllowed = isExpired && allowLateSubmission;
                            
                            return (
                              <div
                                key={exam._id}
                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-left group border ${
                                  locked
                                    ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                                    : canTake
                                      ? isPassed
                                        ? 'border-green-200 bg-green-50 hover:bg-white cursor-pointer'
                                        : isFailed
                                          ? 'border-red-200 bg-red-50 hover:bg-white cursor-pointer'
                                          : 'border-orange-200 bg-orange-50 hover:bg-white cursor-pointer'
                                      : 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                                }`}
                                title={locked ? (lockReason || 'Bài kiểm tra này đang bị khóa') : (lockReason || '')}
                              >
                                <span className={`text-lg ${locked ? 'opacity-50' : ''}`}>📝</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 flex-wrap">
                                    <span className={`font-medium ${locked ? 'text-gray-500' : canTake ? 'text-gray-900 group-hover:text-blue-600' : 'text-gray-500'}`}>
                                      {exam.title}
                                    </span>
                                    {locked && (
                                      <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded flex items-center gap-1">
                                        <span>🔒</span>
                                        <span>
                                          {isNotOpenYet 
                                            ? 'Chưa mở' 
                                            : isExpired && !allowLateSubmission
                                              ? 'Đã đóng' 
                                              : !isEnrolled 
                                                ? 'Khóa' 
                                                : 'Chưa mở khóa'}
                                        </span>
                                      </span>
                                    )}
                                    {isLateButAllowed && !locked && (
                                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded flex items-center gap-1">
                                        <span>⚠️</span>
                                        <span>Nộp muộn{latePenaltyPercent > 0 ? ` (-${latePenaltyPercent}%)` : ''}</span>
                                      </span>
                                    )}
                                    {!locked && exam.totalPoints > 0 && (
                                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                                        {exam.totalPoints} điểm
                                      </span>
                                    )}
                                    {/* Exam Progress Status */}
                                    {!locked && isEnrolled && examProgress && (
                                      <>
                                        {isPassed && (
                                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded flex items-center">
                                            ✓ Đã đạt ({examProgress.bestScore}/{exam.totalPoints})
                                          </span>
                                        )}
                                        {isFailed && hasAttempts && (
                                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                                            ✗ Chưa đạt ({examProgress.bestScore}/{exam.totalPoints})
                                          </span>
                                        )}
                                        {!hasAttempts && examProgress.status === 'not_started' && (
                                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                            Chưa làm
                                          </span>
                                        )}
                                        {hasAttempts && !isPassed && !isFailed && (
                                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                                            Đang làm ({examProgress.attempts} lần)
                                          </span>
                                        )}
                                      </>
                                    )}
                                    {!locked && exam.status === 'published' && !examProgress && (
                                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                        Đã xuất bản
                                      </span>
                                    )}
                                    {!locked && !canTake && exam.maxAttempts && (
                                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                                        Đã hết lần làm bài
                                      </span>
                                    )}
                                  </div>
                                  {exam.description && (
                                    <p className={`text-sm mt-1 line-clamp-1 ${locked ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {exam.description}
                                    </p>
                                  )}
                                  {!locked && (
                                    <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                                      {exam.durationMinutes && exam.durationMinutes > 0 && (
                                        <span>⏱️ {formatDuration(exam.durationMinutes)}</span>
                                      )}
                                      {exam.maxAttempts && (
                                        <span>
                                          {exam.remainingAttempts !== null && exam.remainingAttempts !== undefined
                                            ? exam.remainingAttempts > 0
                                              ? `Còn ${exam.remainingAttempts}/${exam.maxAttempts} lần`
                                              : `Đã hết lần (${exam.maxAttempts} lần)`
                                            : `Tối đa ${exam.maxAttempts} lần`}
                                        </span>
                                      )}
                                      {examProgress && examProgress.attempts && examProgress.attempts > 0 && (
                                        <span>Đã làm: {examProgress.attempts} lần</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {canTake && !locked ? (
                                  <Link
                                    href={`/courses/${courseSlug}/exams/${exam._id}`}
                                    className="flex items-center"
                                  >
                                    <svg
                                      className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 5l7 7-7 7"
                                      />
                                    </svg>
                                  </Link>
                                ) : locked ? (
                                  <span className="text-gray-400 text-lg">🔒</span>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Enrollment CTA */}
      {!isEnrolled && (
        <div className="p-6 bg-blue-50 border-t">
          <div className="text-center">
            <p className="text-gray-700 mb-3">
              {(() => {
                const totalLessons = sections.reduce((total, section) => total + (section.lessons?.length || 0), 0);
                if (totalLessons > 0) {
                  return `Đăng ký ngay để xem tất cả ${totalLessons} bài học`;
                }
                return 'Đăng ký ngay để truy cập khóa học';
              })()}
            </p>
            <Link
              href={`/courses/${courseSlug}`}
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Đăng ký khóa học
            </Link>
          </div>
        </div>
      )}

      {/* Unlock Modal */}
      {unlockModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Bài kiểm tra bắt buộc</h3>
              <button
                onClick={() => setUnlockModal({ show: false })}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">
                    {unlockModal.message || `Bạn cần vượt qua bài kiểm tra "${unlockModal.examTitle}" để tiếp tục học.`}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setUnlockModal({ show: false })}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Đóng
              </button>
              {unlockModal.examId && (
                <button
                  onClick={() => {
                    setUnlockModal({ show: false });
                    router.push(`/courses/${courseSlug}/exams/${unlockModal.examId}`);
                  }}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Làm bài kiểm tra
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

