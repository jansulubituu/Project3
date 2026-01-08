'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, FileText, Video, BookOpen, ClipboardList, FolderOpen, GraduationCap, Move, Lock } from 'lucide-react';

// ==================== TYPES ====================

type ItemType = 'section' | 'lesson' | 'exam';

interface BaseItem {
  _id: string;
  title: string;
  order: number;
  type: ItemType;
}

interface SectionItem extends BaseItem {
  type: 'section';
  description?: string;
  lessonIds: string[];
  examIds: string[];
}

interface LessonItem extends BaseItem {
  type: 'lesson';
  sectionId: string;
  description?: string;
  lessonType: 'video' | 'article' | 'quiz' | 'assignment' | 'resource';
  duration?: number;
  isFree: boolean;
  isPublished: boolean;
}

interface ExamItem extends BaseItem {
  type: 'exam';
  sectionId: string; // Exam must be in a section
  description?: string;
  status: 'draft' | 'published' | 'archived';
  totalPoints: number;
  durationMinutes: number;
}

type CurriculumItem = SectionItem | LessonItem | ExamItem;

// Normalized state structure
interface NormalizedState {
  sections: Record<string, SectionItem>;
  lessons: Record<string, LessonItem>;
  exams: Record<string, ExamItem>;
  sectionOrder: string[]; // IDs of sections in order
}

interface SelectedItem {
  type: ItemType;
  id: string;
}

// ==================== DRAG & DROP COMPONENTS ====================

interface SortableItemProps {
  item: CurriculumItem;
  onSelect: (item: CurriculumItem) => void;
  onDelete: (item: CurriculumItem) => void;
  onNavigate?: (item: CurriculumItem) => void;
  isSelected: boolean;
  dragEnabled?: boolean;
}

function SortableItem({ item, onSelect, onDelete, onNavigate, isSelected, dragEnabled = true }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item._id,
    data: { type: item.type },
    disabled: !dragEnabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getIcon = () => {
    switch (item.type) {
      case 'section':
        return <FolderOpen className="w-5 h-5 text-indigo-600" />;
      case 'lesson':
        const lesson = item as LessonItem;
        switch (lesson.lessonType) {
          case 'video':
            return <Video className="w-4 h-4 text-blue-600" />;
          case 'article':
            return <BookOpen className="w-4 h-4 text-green-600" />;
          case 'quiz':
            return <ClipboardList className="w-4 h-4 text-purple-600" />;
          default:
            return <FileText className="w-4 h-4 text-gray-600" />;
        }
      case 'exam':
        return <GraduationCap className="w-4 h-4 text-orange-600" />;
    }
  };

  const getTypeBadge = () => {
    switch (item.type) {
      case 'section':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-700">
            SECTION
          </span>
        );
      case 'lesson':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">
            LESSON
          </span>
        );
      case 'exam':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700">
            EXAM
          </span>
        );
    }
  };

  const getItemStyles = () => {
    const baseStyles = 'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all';
    
    if (isSelected) {
      switch (item.type) {
        case 'section':
          return `${baseStyles} bg-indigo-50 border-indigo-300 shadow-sm`;
        case 'lesson':
          return `${baseStyles} bg-blue-50 border-blue-300 shadow-sm`;
        case 'exam':
          return `${baseStyles} bg-orange-50 border-orange-300 shadow-sm`;
      }
    }

    switch (item.type) {
      case 'section':
        return `${baseStyles} bg-gray-50 border-2 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50 font-semibold`;
      case 'lesson':
        return `${baseStyles} bg-white border-l-4 border-l-blue-500 border-r border-t border-b border-gray-200 hover:border-l-blue-600 hover:bg-blue-50/30`;
      case 'exam':
        return `${baseStyles} bg-white border-l-4 border-l-orange-500 border-r border-t border-b border-gray-200 hover:border-l-orange-600 hover:bg-orange-50/30`;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // If clicking on delete button, don't navigate
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    // For lesson and exam, navigate to edit page
    if (item.type === 'lesson') {
      if (onNavigate) {
        onNavigate(item);
      }
    } else if (item.type === 'exam') {
      if (onNavigate) {
        onNavigate(item);
      }
    } else {
      // For section, use edit panel
      onSelect(item);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={dragEnabled ? style : undefined}
      className={getItemStyles()}
      onClick={handleClick}
    >
      {dragEnabled ? (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      ) : (
        <div className="flex-shrink-0 text-gray-300">
          <Lock className="w-4 h-4" />
        </div>
      )}
      <div className="flex-shrink-0">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className={`truncate ${item.type === 'section' ? 'font-bold text-base text-gray-900' : 'font-medium text-sm text-gray-900'}`}>
            {item.title}
          </div>
          {getTypeBadge()}
        </div>
        {item.type === 'section' && (
          <div className="text-xs text-gray-600">
            {(item as SectionItem).lessonIds.length} bài học • {(item as SectionItem).examIds.length} bài kiểm tra
          </div>
        )}
        {item.type === 'lesson' && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="capitalize">{(item as LessonItem).lessonType}</span>
            <span>•</span>
            <span className={((item as LessonItem).isPublished ? 'text-green-600' : 'text-yellow-600') + ' font-medium'}>
              {(item as LessonItem).isPublished ? 'Published' : 'Draft'}
            </span>
            {(item as LessonItem).isFree && (
              <>
                <span>•</span>
                <span className="text-green-600 font-medium">Free</span>
              </>
            )}
          </div>
        )}
        {item.type === 'exam' && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className={`capitalize font-medium ${
              (item as ExamItem).status === 'published' ? 'text-green-600' :
              (item as ExamItem).status === 'draft' ? 'text-yellow-600' :
              'text-gray-600'
            }`}>
              {(item as ExamItem).status}
            </span>
            <span>•</span>
            <span>{(item as ExamItem).totalPoints} điểm</span>
            <span>•</span>
            <span>{(item as ExamItem).durationMinutes} phút</span>
          </div>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item);
        }}
        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors flex-shrink-0"
        title="Xóa"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

function CurriculumManagementContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const courseId = params?.id;

  // ==================== STATE ====================
  const [course, setCourse] = useState<{ _id: string; title: string; slug: string } | null>(null);
  const [normalizedState, setNormalizedState] = useState<NormalizedState>({
    sections: {},
    lessons: {},
    exams: {},
    sectionOrder: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dragMode, setDragMode] = useState(false); // Chế độ kéo thả

  // Drag & Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ==================== DATA LOADING ====================

  const loadCurriculum = useCallback(async () => {
    if (!courseId) return;

    try {
      setLoading(true);
      setError(null);

      // Load course info
      const courseRes = await api.get(`/courses/${courseId}`);
      if (courseRes.data?.success) {
        const c = courseRes.data.course;
        setCourse({ _id: c._id, title: c.title, slug: c.slug });
      }

      // Load curriculum (sections + lessons)
      const curriculumRes = await api.get(`/courses/${courseId}/curriculum`);
      if (!curriculumRes.data?.success) {
        throw new Error('Failed to load curriculum');
      }

      // Load exams
      const examsRes = await api.get(`/exams/course/${courseId}`);
      const exams = examsRes.data?.success ? examsRes.data.exams || [] : [];

      // Normalize data
      const sections: Record<string, SectionItem> = {};
      const lessons: Record<string, LessonItem> = {};
      const examsMap: Record<string, ExamItem> = {};
      const sectionOrder: string[] = [];

      // Process sections
      const sectionsData = curriculumRes.data.sections || [];
      sectionsData.forEach((sec: any) => {
        const sectionId = sec._id;
        sectionOrder.push(sectionId);

        const lessonIds: string[] = [];
        const examIds: string[] = [];

        // Process lessons in section
        if (sec.lessons && Array.isArray(sec.lessons)) {
          sec.lessons.forEach((les: any) => {
            const lessonId = les._id;
            lessonIds.push(lessonId);
            lessons[lessonId] = {
              _id: lessonId,
              type: 'lesson',
              title: les.title,
              description: les.description,
              order: les.order || 0,
              sectionId,
              lessonType: les.type || 'video',
              duration: les.duration,
              isFree: les.isFree || false,
              isPublished: les.isPublished || false,
            };
          });
        }

        sections[sectionId] = {
          _id: sectionId,
          type: 'section',
          title: sec.title,
          description: sec.description,
          order: sec.order || 0,
          lessonIds,
          examIds,
        };
      });

      // Process exams (only exams with sections)
      exams.forEach((exam: any) => {
        const examId = exam._id;
        const sectionId = exam.section?._id || exam.section;
        
        // Skip exams without section
        if (!sectionId) {
          console.warn(`Exam ${examId} has no section, skipping`);
          return;
        }

        examsMap[examId] = {
          _id: examId,
          type: 'exam',
          title: exam.title,
          description: exam.description,
          order: 0, // Exams don't have order in the same way
          sectionId: sectionId,
          status: exam.status || 'draft',
          totalPoints: exam.totalPoints || 0,
          durationMinutes: exam.durationMinutes || 60,
        };

        // Add to section's examIds
        if (sections[sectionId]) {
          sections[sectionId].examIds.push(examId);
        }
      });

      setNormalizedState({
        sections,
        lessons,
        exams: examsMap,
        sectionOrder,
      });
    } catch (err: any) {
      console.error('Failed to load curriculum:', err);
      setError(err.response?.data?.message || 'Không thể tải nội dung khóa học.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCurriculum();
  }, [loadCurriculum]);

  // ==================== DRAG & DROP HANDLERS ====================

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeData = active.data.current as { type: ItemType };
    const overData = over.data.current as { type: ItemType };

    if (!activeData || !overData) {
      return;
    }

    // Save original state for rollback
    const originalState = JSON.parse(JSON.stringify(normalizedState));

    // Deep clone state for optimistic update
    const newState = {
      sections: { ...normalizedState.sections },
      lessons: { ...normalizedState.lessons },
      exams: { ...normalizedState.exams },
      sectionOrder: [...normalizedState.sectionOrder],
    };

    // Deep clone sections with their arrays
    Object.keys(newState.sections).forEach((sectionId) => {
      const section = normalizedState.sections[sectionId];
      newState.sections[sectionId] = {
        ...section,
        lessonIds: [...section.lessonIds],
        examIds: [...section.examIds],
      };
    });

    try {
      // ==================== SECTION REORDERING ====================
      if (activeData.type === 'section' && overData.type === 'section') {
        const oldIndex = newState.sectionOrder.indexOf(activeId);
        const newIndex = newState.sectionOrder.indexOf(overId);
        
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
          return;
        }

        newState.sectionOrder = arrayMove(newState.sectionOrder, oldIndex, newIndex);
        setNormalizedState(newState);

        await api.put(`/courses/${courseId}/sections/reorder`, {
          sectionIds: newState.sectionOrder,
        });
        return;
      }

      // ==================== LESSON HANDLING ====================
      if (activeData.type === 'lesson') {
        const activeLesson = newState.lessons[activeId];
        if (!activeLesson) {
          return;
        }

        const oldSectionId = activeLesson.sectionId;
        let newSectionId: string | null = null;
        let insertIndex: number | null = null;

        // Determine target section and position
        if (overData.type === 'section') {
          // Dropping on section header - add to end
          newSectionId = overId;
          const targetSection = newState.sections[newSectionId];
          insertIndex = targetSection ? targetSection.lessonIds.length : null;
        } else if (overData.type === 'lesson') {
          // Dropping on another lesson
          const overLesson = newState.lessons[overId];
          if (!overLesson) {
            return;
          }
          newSectionId = overLesson.sectionId;
          
          // Find insert position
          const targetSection = newState.sections[newSectionId];
          if (targetSection) {
            const overIndex = targetSection.lessonIds.indexOf(overId);
            if (overIndex === -1) {
              insertIndex = targetSection.lessonIds.length;
            } else {
              const activeIndex = oldSectionId === newSectionId 
                ? targetSection.lessonIds.indexOf(activeId)
                : -1;
              
              // Calculate correct insert position
              if (activeIndex === -1) {
                // Moving from different section
                insertIndex = overIndex + 1;
              } else if (activeIndex < overIndex) {
                // Moving down in same section
                insertIndex = overIndex;
              } else {
                // Moving up in same section
                insertIndex = overIndex + 1;
              }
            }
          }
        }

        if (!newSectionId) {
          return;
        }

        // Remove from old section
        if (oldSectionId) {
          const oldSection = newState.sections[oldSectionId];
          if (oldSection) {
            oldSection.lessonIds = oldSection.lessonIds.filter((id) => id !== activeId);
            newState.sections[oldSectionId] = {
              ...oldSection,
              lessonIds: [...oldSection.lessonIds],
            };
          }
        }

        // Add to new section at correct position
        const newSection = newState.sections[newSectionId];
        if (newSection) {
          const newLessonIds = [...newSection.lessonIds];
          
          // Remove activeId if it exists (in case of same-section reorder)
          const existingIndex = newLessonIds.indexOf(activeId);
          if (existingIndex !== -1) {
            newLessonIds.splice(existingIndex, 1);
          }
          
          // Insert at correct position
          if (insertIndex !== null && insertIndex <= newLessonIds.length) {
            newLessonIds.splice(insertIndex, 0, activeId);
          } else {
            newLessonIds.push(activeId);
          }
          
          newState.sections[newSectionId] = {
            ...newSection,
            lessonIds: newLessonIds,
          };
          newState.lessons[activeId] = {
            ...activeLesson,
            sectionId: newSectionId,
          };
        }

        setNormalizedState(newState);

        // API calls
        try {
          if (oldSectionId !== newSectionId) {
            // Moved between sections - update lesson's section
            await api.put(`/lessons/${activeId}`, {
              section: newSectionId,
            });
          }
          
          // Reorder lessons in new section
          await api.put(`/sections/${newSectionId}/lessons/reorder`, {
            lessonIds: newState.sections[newSectionId].lessonIds,
          });
        } catch (apiError) {
          // Revert on API error
          setNormalizedState(originalState);
          throw apiError;
        }
        return;
      }

      // ==================== EXAM HANDLING ====================
      if (activeData.type === 'exam') {
        const activeExam = newState.exams[activeId];
        if (!activeExam) {
          return;
        }

        const oldSectionId = activeExam.sectionId;
        let newSectionId: string | null = null;
        let insertIndex: number | null = null;

        // Determine target location (must be a section)
        if (overData.type === 'section') {
          // Dropping on section header - add to end
          newSectionId = overId;
          const targetSection = newState.sections[newSectionId];
          insertIndex = targetSection ? targetSection.examIds.length : null;
        } else if (overData.type === 'exam') {
          // Dropping on another exam - use that exam's section
          const overExam = newState.exams[overId];
          if (!overExam) {
            return;
          }
          newSectionId = overExam.sectionId;
          
          if (!newSectionId) {
            // Exam must have a section
            alert('Bài kiểm tra phải nằm trong một section. Vui lòng kéo vào một section.');
            return;
          }

          // Find insert position in section
          const targetSection = newState.sections[newSectionId];
          if (targetSection) {
            const overIndex = targetSection.examIds.indexOf(overId);
            if (overIndex === -1) {
              insertIndex = targetSection.examIds.length;
            } else {
              const activeIndex = oldSectionId === newSectionId 
                ? targetSection.examIds.indexOf(activeId)
                : -1;
              
              if (activeIndex === -1) {
                // Moving from different section
                insertIndex = overIndex + 1;
              } else if (activeIndex < overIndex) {
                // Moving down in same section
                insertIndex = overIndex;
              } else {
                // Moving up in same section
                insertIndex = overIndex + 1;
              }
            }
          }
        } else {
          // Cannot drop exam outside of section
          alert('Bài kiểm tra phải nằm trong một section.');
          return;
        }

        if (!newSectionId) {
          return;
        }

        // Remove from old section
        if (oldSectionId) {
          const oldSection = newState.sections[oldSectionId];
          if (oldSection) {
            oldSection.examIds = oldSection.examIds.filter((id) => id !== activeId);
            newState.sections[oldSectionId] = {
              ...oldSection,
              examIds: [...oldSection.examIds],
            };
          }
        }

        // Add to new section
        const newSection = newState.sections[newSectionId];
        if (newSection) {
          const newExamIds = [...newSection.examIds];
          
          // Remove activeId if it exists (in case of same-section reorder)
          const existingIndex = newExamIds.indexOf(activeId);
          if (existingIndex !== -1) {
            newExamIds.splice(existingIndex, 1);
          }
          
          // Insert at correct position
          if (insertIndex !== null && insertIndex <= newExamIds.length) {
            newExamIds.splice(insertIndex, 0, activeId);
          } else {
            newExamIds.push(activeId);
          }
          
          newState.sections[newSectionId] = {
            ...newSection,
            examIds: newExamIds,
          };
          newState.exams[activeId] = {
            ...activeExam,
            sectionId: newSectionId,
          };
        }

        setNormalizedState(newState);

        // API call
        try {
          await api.put(`/exams/${activeId}`, {
            section: newSectionId,
          });
        } catch (apiError) {
          // Revert on API error
          setNormalizedState(originalState);
          throw apiError;
        }
        return;
      }
    } catch (err: any) {
      console.error('Failed to reorder:', err);
      // Revert to original state on error
      setNormalizedState(originalState);
      alert(err.response?.data?.message || 'Không thể sắp xếp lại. Vui lòng thử lại.');
    }
  };

  // ==================== CRUD OPERATIONS ====================

  const handleCreateSection = async () => {
    if (!courseId) return;

    const title = prompt('Nhập tiêu đề section:');
    if (!title) return;

    try {
      setIsSaving(true);
      const res = await api.post(`/courses/${courseId}/sections`, { title });
      if (res.data?.success) {
        await loadCurriculum();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể tạo section.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateLesson = async (sectionId: string) => {
    if (!courseId) return;

    const title = prompt('Nhập tiêu đề bài học:');
    if (!title) return;

    try {
      setIsSaving(true);
      const res = await api.post(`/sections/${sectionId}/lessons`, {
        title,
        type: 'video',
        isFree: false,
      });
      if (res.data?.success) {
        await loadCurriculum();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể tạo bài học.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateExam = async (sectionId: string) => {
    if (!courseId || !sectionId) {
      alert('Vui lòng chọn section để tạo bài kiểm tra.');
      return;
    }

    const title = prompt('Nhập tiêu đề bài kiểm tra:');
    if (!title) return;

    try {
      setIsSaving(true);
      const res = await api.post(`/exams`, {
        course: courseId,
        section: sectionId,
        title,
        status: 'draft',
        durationMinutes: 60,
      });
      if (res.data?.success) {
        await loadCurriculum();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể tạo bài kiểm tra.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: CurriculumItem) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa "${item.title}"?`)) return;

    try {
      setIsSaving(true);
      let endpoint = '';
      if (item.type === 'section') {
        endpoint = `/sections/${item._id}`;
      } else if (item.type === 'lesson') {
        endpoint = `/lessons/${item._id}`;
      } else if (item.type === 'exam') {
        endpoint = `/exams/${item._id}`;
      }

      if (endpoint) {
        await api.delete(endpoint);
        await loadCurriculum();
        if (selectedItem?.id === item._id) {
          setSelectedItem(null);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xóa.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNavigate = (item: CurriculumItem) => {
    if (item.type === 'lesson') {
      router.push(`/instructor/lessons/${item._id}/edit`);
    } else if (item.type === 'exam') {
      // Navigate to exams page - user can edit from there
      router.push(`/instructor/courses/${courseId}/exams`);
    }
  };

  // ==================== RENDER TREE ====================

  // Get all sortable item IDs (no duplicates)
  const getAllSortableIds = useCallback(() => {
    const ids = new Set<string>();
    // Add sections
    normalizedState.sectionOrder.forEach((id) => ids.add(id));
    // Add lessons (only once, from their sections)
    normalizedState.sectionOrder.forEach((sectionId) => {
      const section = normalizedState.sections[sectionId];
      if (section) {
        section.lessonIds.forEach((id) => ids.add(id));
        section.examIds.forEach((id) => ids.add(id));
      }
    });
    // Exams are already included in their sections' examIds
    return Array.from(ids);
  }, [normalizedState]);

  const renderTree = () => {
    const elements: JSX.Element[] = [];

    // Add sections with their children
    normalizedState.sectionOrder.forEach((sectionId) => {
      const section = normalizedState.sections[sectionId];
      if (!section) return;

      elements.push(
        <div key={section._id} className="space-y-2 mb-4">
          <SortableItem
            item={section}
            onSelect={(item) => setSelectedItem({ type: item.type, id: item._id })}
            onDelete={handleDelete}
            onNavigate={handleNavigate}
            isSelected={selectedItem?.id === section._id}
            dragEnabled={dragMode}
          />
          {/* Section children */}
          <div className="ml-8 mt-2 space-y-2 border-l-2 border-gray-200 pl-4">
            {/* Lessons in section */}
            {section.lessonIds.length > 0 && (
              <div className="space-y-1.5">
                {section.lessonIds.map((lessonId) => {
                  const lesson = normalizedState.lessons[lessonId];
                  if (!lesson) return null;
                  return (
                    <SortableItem
                      key={lesson._id}
                      item={lesson}
                      onSelect={(item) => setSelectedItem({ type: item.type, id: item._id })}
                      onDelete={handleDelete}
                      onNavigate={handleNavigate}
                      isSelected={selectedItem?.id === lesson._id}
                      dragEnabled={dragMode}
                    />
                  );
                })}
              </div>
            )}
            {/* Exams in section */}
            {section.examIds.length > 0 && (
              <div className="space-y-1.5">
                {section.examIds.map((examId) => {
                  const exam = normalizedState.exams[examId];
                  if (!exam) return null;
                  return (
                    <SortableItem
                      key={exam._id}
                      item={exam}
                      onSelect={(item) => setSelectedItem({ type: item.type, id: item._id })}
                      onDelete={handleDelete}
                      onNavigate={handleNavigate}
                      isSelected={selectedItem?.id === exam._id}
                      dragEnabled={dragMode}
                    />
                  );
                })}
              </div>
            )}
            {/* Add buttons for section */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleCreateLesson(sectionId)}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1.5 rounded transition-colors font-medium"
              >
                <Plus className="w-3 h-3" />
                Thêm Lesson
              </button>
              <button
                onClick={() => handleCreateExam(sectionId)}
                className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-2 py-1.5 rounded transition-colors font-medium"
              >
                <Plus className="w-3 h-3" />
                Thêm Exam
              </button>
            </div>
          </div>
        </div>
      );
    });

    return elements;
  };

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Đang tải nội dung khóa học...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Không thể tải nội dung</h2>
            <p className="text-gray-600 mb-4">{error || 'Khóa học không tồn tại.'}</p>
            <button
              type="button"
              onClick={() => router.push(`/instructor/courses/${courseId}`)}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Quay lại
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const selectedItemData: CurriculumItem | null = selectedItem
    ? (selectedItem.type === 'section'
        ? normalizedState.sections[selectedItem.id]
        : selectedItem.type === 'lesson'
        ? normalizedState.lessons[selectedItem.id]
        : normalizedState.exams[selectedItem.id]) || null
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quản lý nội dung: {course.title}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {dragMode ? 'Chế độ kéo thả - Kéo thả để sắp xếp' : 'Click để chỉnh sửa, bật chế độ kéo thả để sắp xếp'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDragMode(!dragMode)}
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dragMode
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {dragMode ? (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Tắt kéo thả
                  </>
                ) : (
                  <>
                    <Move className="w-4 h-4 mr-2" />
                    Bật kéo thả
                  </>
                )}
              </button>
              <button
                onClick={handleCreateSection}
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Thêm Section
              </button>
              <button
                onClick={() => router.push(`/instructor/courses/${courseId}`)}
                className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ← Quay lại
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Tree View */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-4">
                {dragMode ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={getAllSortableIds()}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">{renderTree()}</div>
                    </SortableContext>
                    <DragOverlay>
                      {activeId ? (
                        <div className="p-3 bg-blue-50 border border-blue-300 rounded-lg opacity-90 shadow-lg">
                          {normalizedState.lessons[activeId]?.title ||
                            normalizedState.sections[activeId]?.title ||
                            normalizedState.exams[activeId]?.title}
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                ) : (
                  <div className="space-y-2">{renderTree()}</div>
                )}
              </div>
            </div>

            {/* Right: Edit Panel (only for sections) */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-4 sticky top-4">
                {selectedItemData && selectedItemData.type === 'section' ? (
                  <EditPanel
                    item={selectedItemData}
                    onUpdate={loadCurriculum}
                    courseId={courseId as string}
                  />
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <p className="mb-2">Chọn một section để chỉnh sửa</p>
                    <p className="text-xs text-gray-400">
                      Click vào lesson/exam để mở trang chỉnh sửa chi tiết
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ==================== EDIT PANEL ====================

interface EditPanelProps {
  item: CurriculumItem;
  onUpdate: () => void;
  courseId: string;
}

function EditPanel({ item, onUpdate }: EditPanelProps) {
  const [formData, setFormData] = useState<any>(item);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(item);
  }, [item]);

  const handleSave = async () => {
    try {
      setSaving(true);
      let endpoint = '';
      let payload: any = {};

      if (item.type === 'section') {
        endpoint = `/sections/${item._id}`;
        payload = { title: formData.title, description: formData.description };
      } else if (item.type === 'lesson') {
        endpoint = `/lessons/${item._id}`;
        payload = { title: formData.title, description: formData.description };
      } else if (item.type === 'exam') {
        endpoint = `/exams/${item._id}`;
        payload = {
          title: formData.title,
          description: formData.description,
          status: formData.status,
          durationMinutes: formData.durationMinutes,
        };
      }

      if (endpoint) {
        await api.put(endpoint, payload);
        onUpdate();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể cập nhật.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Chỉnh sửa {item.type}</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
        <input
          type="text"
          value={formData.title || ''}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {item.type === 'exam' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
            <select
              value={formData.status || 'draft'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thời lượng (phút)</label>
            <input
              type="number"
              value={formData.durationMinutes || 60}
              onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
      </button>
    </div>
  );
}

export default function CurriculumManagementPage() {
  return (
    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
      <CurriculumManagementContent />
    </ProtectedRoute>
  );
}

