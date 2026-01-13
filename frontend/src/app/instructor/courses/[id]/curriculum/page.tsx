'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';
import LessonCreateModal from '@/components/instructor/LessonCreateModal';
import ExamCreateModal from '@/components/instructor/ExamCreateModal';
import SearchFilterBar from '@/components/instructor/SearchFilterBar';
import ItemActionsMenu from '@/components/instructor/ItemActionsMenu';
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
import {
  GripVertical,
  Plus,
  Trash2,
  FileText,
  Video,
  BookOpen,
  ClipboardList,
  FolderOpen,
  GraduationCap,
  Move,
  Lock,
  Sparkles,
  PenTool,
  MoreVertical,
} from 'lucide-react';

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

// Export types for use in other components
export type { CurriculumItem, SectionItem, LessonItem, ExamItem, ItemType };

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
  onDuplicate?: (item: CurriculumItem) => void;
  onPublish?: (item: CurriculumItem) => void;
  onUnpublish?: (item: CurriculumItem) => void;
  onArchive?: (item: CurriculumItem) => void;
  onViewAnalytics?: (item: CurriculumItem) => void;
  isSelected: boolean;
  dragEnabled?: boolean;
  showActionsMenu?: string | null;
  onToggleActionsMenu?: (itemId: string | null) => void;
}

function SortableItem({ 
  item, 
  onSelect, 
  onDelete, 
  onNavigate,
  onDuplicate,
  onPublish,
  onUnpublish,
  onArchive,
  onViewAnalytics,
  isSelected, 
  dragEnabled = true,
  showActionsMenu,
  onToggleActionsMenu,
}: SortableItemProps) {
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
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Actions Menu Button */}
        {onToggleActionsMenu && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleActionsMenu(showActionsMenu === item._id ? null : item._id);
              }}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
              title="Thao tác"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showActionsMenu === item._id && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => onToggleActionsMenu(null)}
                />
                <ItemActionsMenu
                  item={item}
                  onEdit={() => {
                    onNavigate?.(item);
                    onToggleActionsMenu(null);
                  }}
                  onDuplicate={() => {
                    onDuplicate?.(item);
                    onToggleActionsMenu(null);
                  }}
                  onDelete={() => {
                    onDelete(item);
                    onToggleActionsMenu(null);
                  }}
                  onPublish={item.type === 'lesson' ? () => {
                    onPublish?.(item);
                    onToggleActionsMenu(null);
                  } : undefined}
                  onUnpublish={item.type === 'lesson' ? () => {
                    onUnpublish?.(item);
                    onToggleActionsMenu(null);
                  } : undefined}
                  onArchive={item.type === 'exam' ? () => {
                    onArchive?.(item);
                    onToggleActionsMenu(null);
                  } : undefined}
                  onViewAnalytics={item.type === 'exam' ? () => {
                    onViewAnalytics?.(item);
                    onToggleActionsMenu(null);
                  } : undefined}
                />
              </>
            )}
          </div>
        )}
        {/* Delete Button (fallback if no actions menu) */}
        {!onToggleActionsMenu && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item);
            }}
            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
            title="Xóa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
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
  const [showExamCreateMenu, setShowExamCreateMenu] = useState<string | null>(null); // sectionId đang mở menu
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [selectedSectionForModal, setSelectedSectionForModal] = useState<string | null>(null);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'section' | 'lesson' | 'exam'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null); // itemId đang mở menu
  const [hasPendingChanges, setHasPendingChanges] = useState(false); // Có thay đổi chưa lưu
  const [isSavingChanges, setIsSavingChanges] = useState(false); // Đang lưu thay đổi

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

        // Process lessons in section (already sorted by backend with order: 1)
        if (sec.lessons && Array.isArray(sec.lessons)) {
          sec.lessons.forEach((les: any) => {
            const lessonId = les._id;
            lessonIds.push(lessonId);
            lessons[lessonId] = {
              _id: lessonId,
              type: 'lesson',
              title: les.title,
              description: les.description,
              order: les.order ?? 0, // Use nullish coalescing to preserve 0 values
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
          order: exam.order || 0, // Use order from backend
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

  const handleDragEnd = (event: DragEndEvent) => {
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

    // Only update local state, don't call API yet
    // Deep clone state for update

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

    // ==================== SECTION REORDERING ====================
    if (activeData.type === 'section' && overData.type === 'section') {
        const oldIndex = newState.sectionOrder.indexOf(activeId);
        const newIndex = newState.sectionOrder.indexOf(overId);
        
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
          return;
        }

        newState.sectionOrder = arrayMove(newState.sectionOrder, oldIndex, newIndex);
        setNormalizedState(newState);
        setHasPendingChanges(true);
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

        // Determine target section and position (can drop on section, lesson, or exam)
        if (overData.type === 'section') {
          // Dropping on section header - add to end
          newSectionId = overId;
          const targetSection = newState.sections[newSectionId];
          if (targetSection) {
            // Merge lessons and exams to get total count
            const allItems = [...targetSection.lessonIds, ...targetSection.examIds];
            insertIndex = allItems.length;
          }
        } else if (overData.type === 'lesson') {
          // Dropping on another lesson
          const overLesson = newState.lessons[overId];
          if (!overLesson) {
            return;
          }
          newSectionId = overLesson.sectionId;
          
          // Find insert position in merged list
          const targetSection = newState.sections[newSectionId];
          if (targetSection) {
            // First, get list WITH activeId to determine drag direction
            const allItemsWithActive: Array<{ id: string; type: 'lesson' | 'exam'; order: number }> = [];
            targetSection.lessonIds.forEach((id) => {
              const lesson = newState.lessons[id];
              if (lesson) allItemsWithActive.push({ id, type: 'lesson', order: lesson.order });
            });
            targetSection.examIds.forEach((id) => {
              const exam = newState.exams[id];
              if (exam) allItemsWithActive.push({ id, type: 'exam', order: exam.order });
            });
            allItemsWithActive.sort((a, b) => a.order - b.order);
            
            // Determine if dragging up or down (only if same section)
            const isSameSection = oldSectionId === newSectionId;
            const activeIndexInFull = isSameSection 
              ? allItemsWithActive.findIndex(item => item.id === activeId && item.type === 'lesson')
              : -1;
            const overIndexInFull = allItemsWithActive.findIndex(item => item.id === overId && item.type === 'lesson');
            const isDraggingUp = isSameSection && activeIndexInFull !== -1 && activeIndexInFull > overIndexInFull;
            
            // Now get list WITHOUT activeId for correct insert position
            const allItems: Array<{ id: string; type: 'lesson' | 'exam'; order: number }> = [];
            targetSection.lessonIds.forEach((id) => {
              if (id !== activeId) { // Exclude activeId to get correct index
                const lesson = newState.lessons[id];
                if (lesson) allItems.push({ id, type: 'lesson', order: lesson.order });
              }
            });
            targetSection.examIds.forEach((id) => {
              const exam = newState.exams[id];
              if (exam) allItems.push({ id, type: 'exam', order: exam.order });
            });
            allItems.sort((a, b) => a.order - b.order);
            
            // Find overIndex in the list WITHOUT activeId
            const overIndex = allItems.findIndex(item => item.id === overId && item.type === 'lesson');
            if (overIndex === -1) {
              insertIndex = allItems.length;
            } else {
              // If dragging up, insert BEFORE overItem. If dragging down or from different section, insert AFTER overItem
              insertIndex = isDraggingUp ? overIndex : overIndex + 1;
            }
          }
        } else if (overData.type === 'exam') {
          // Dropping on an exam - insert before/after that exam
          const overExam = newState.exams[overId];
          if (!overExam) {
            return;
          }
          newSectionId = overExam.sectionId;
          
          // Find insert position in merged list
          const targetSection = newState.sections[newSectionId];
          if (targetSection) {
            // First, get list WITH activeId to determine drag direction
            const allItemsWithActive: Array<{ id: string; type: 'lesson' | 'exam'; order: number }> = [];
            targetSection.lessonIds.forEach((id) => {
              const lesson = newState.lessons[id];
              if (lesson) allItemsWithActive.push({ id, type: 'lesson', order: lesson.order });
            });
            targetSection.examIds.forEach((id) => {
              const exam = newState.exams[id];
              if (exam) allItemsWithActive.push({ id, type: 'exam', order: exam.order });
            });
            allItemsWithActive.sort((a, b) => a.order - b.order);
            
            // Determine if dragging up or down (only if same section)
            const isSameSection = oldSectionId === newSectionId;
            const activeIndexInFull = isSameSection 
              ? allItemsWithActive.findIndex(item => item.id === activeId && item.type === 'lesson')
              : -1;
            const overIndexInFull = allItemsWithActive.findIndex(item => item.id === overId && item.type === 'exam');
            const isDraggingUp = isSameSection && activeIndexInFull !== -1 && activeIndexInFull > overIndexInFull;
            
            // Now get list WITHOUT activeId for correct insert position
            const allItems: Array<{ id: string; type: 'lesson' | 'exam'; order: number }> = [];
            targetSection.lessonIds.forEach((id) => {
              const lesson = newState.lessons[id];
              if (lesson) allItems.push({ id, type: 'lesson', order: lesson.order });
            });
            targetSection.examIds.forEach((id) => {
              if (id !== activeId) { // Exclude activeId to get correct index
                const exam = newState.exams[id];
                if (exam) allItems.push({ id, type: 'exam', order: exam.order });
              }
            });
            allItems.sort((a, b) => a.order - b.order);
            
            // Find overIndex in the list WITHOUT activeId
            const overIndex = allItems.findIndex(item => item.id === overId && item.type === 'exam');
            if (overIndex === -1) {
              insertIndex = allItems.length;
            } else {
              // If dragging up, insert BEFORE overItem. If dragging down or from different section, insert AFTER overItem
              insertIndex = isDraggingUp ? overIndex : overIndex + 1;
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
          // Get merged list of lessons and exams (excluding activeId)
          const allItems: Array<{ id: string; type: 'lesson' | 'exam' }> = [];
          newSection.lessonIds.forEach((id) => {
            if (id !== activeId) {
              const lesson = newState.lessons[id];
              if (lesson) allItems.push({ id, type: 'lesson' });
            }
          });
          newSection.examIds.forEach((id) => {
            const exam = newState.exams[id];
            if (exam) allItems.push({ id, type: 'exam' });
          });
          
          // Sort by current order
          allItems.sort((a, b) => {
            const aItem = a.type === 'lesson' ? newState.lessons[a.id] : newState.exams[a.id];
            const bItem = b.type === 'lesson' ? newState.lessons[b.id] : newState.exams[b.id];
            return (aItem?.order || 0) - (bItem?.order || 0);
          });
          
          // Insert at correct position
          if (insertIndex !== null && insertIndex >= 0 && insertIndex <= allItems.length) {
            allItems.splice(insertIndex, 0, { id: activeId, type: 'lesson' });
          } else {
            allItems.push({ id: activeId, type: 'lesson' });
          }
          
          // Split back into lessonIds and examIds and update order
          const newLessonIds: string[] = [];
          const newExamIds: string[] = [];
          allItems.forEach((item, index) => {
            // Update order field for each item
            if (item.type === 'lesson') {
              newLessonIds.push(item.id);
              newState.lessons[item.id] = {
                ...newState.lessons[item.id],
                order: index + 1,
              };
            } else {
              newExamIds.push(item.id);
              newState.exams[item.id] = {
                ...newState.exams[item.id],
                order: index + 1,
              };
            }
          });
          
          newState.sections[newSectionId] = {
            ...newSection,
            lessonIds: newLessonIds,
            examIds: newExamIds,
          };
          // Update order for the moved lesson
          const activeItemIndex = allItems.findIndex(item => item.id === activeId && item.type === 'lesson');
          if (activeItemIndex !== -1) {
            newState.lessons[activeId] = {
              ...activeLesson,
              sectionId: newSectionId,
              order: activeItemIndex + 1,
            };
          }
        }

        setNormalizedState(newState);
        setHasPendingChanges(true);
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

        // Determine target location (can drop on section, lesson, or exam)
        if (overData.type === 'section') {
          // Dropping on section header - add to end
          newSectionId = overId;
          const targetSection = newState.sections[newSectionId];
          if (targetSection) {
            // Merge lessons and exams to get total count
            const allItems = [...targetSection.lessonIds, ...targetSection.examIds];
            insertIndex = allItems.length;
          }
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

          // Find insert position in merged list
          const targetSection = newState.sections[newSectionId];
          if (targetSection) {
            // First, get list WITH activeId to determine drag direction
            const allItemsWithActive: Array<{ id: string; type: 'lesson' | 'exam'; order: number }> = [];
            targetSection.lessonIds.forEach((id) => {
              const lesson = newState.lessons[id];
              if (lesson) allItemsWithActive.push({ id, type: 'lesson', order: lesson.order });
            });
            targetSection.examIds.forEach((id) => {
              const exam = newState.exams[id];
              if (exam) allItemsWithActive.push({ id, type: 'exam', order: exam.order });
            });
            allItemsWithActive.sort((a, b) => a.order - b.order);
            
            // Determine if dragging up or down (only if same section)
            const isSameSection = oldSectionId === newSectionId;
            const activeIndexInFull = isSameSection 
              ? allItemsWithActive.findIndex(item => item.id === activeId && item.type === 'exam')
              : -1;
            const overIndexInFull = allItemsWithActive.findIndex(item => item.id === overId && item.type === 'exam');
            const isDraggingUp = isSameSection && activeIndexInFull !== -1 && activeIndexInFull > overIndexInFull;
            
            // Now get list WITHOUT activeId for correct insert position
            const allItems: Array<{ id: string; type: 'lesson' | 'exam'; order: number }> = [];
            targetSection.lessonIds.forEach((id) => {
              const lesson = newState.lessons[id];
              if (lesson) allItems.push({ id, type: 'lesson', order: lesson.order });
            });
            targetSection.examIds.forEach((id) => {
              if (id !== activeId) { // Exclude activeId to get correct index
                const exam = newState.exams[id];
                if (exam) allItems.push({ id, type: 'exam', order: exam.order });
              }
            });
            allItems.sort((a, b) => a.order - b.order);
            
            // Find overIndex in the list WITHOUT activeId
            const overIndex = allItems.findIndex(item => item.id === overId && item.type === 'exam');
            if (overIndex === -1) {
              insertIndex = allItems.length;
            } else {
              // If dragging up, insert BEFORE overItem. If dragging down or from different section, insert AFTER overItem
              insertIndex = isDraggingUp ? overIndex : overIndex + 1;
            }
          }
        } else if (overData.type === 'lesson') {
          // Dropping on a lesson - insert before/after that lesson
          const overLesson = newState.lessons[overId];
          if (!overLesson) {
            return;
          }
          newSectionId = overLesson.sectionId;
          
          // Find insert position in merged list
          const targetSection = newState.sections[newSectionId];
          if (targetSection) {
            // First, get list WITH activeId to determine drag direction
            const allItemsWithActive: Array<{ id: string; type: 'lesson' | 'exam'; order: number }> = [];
            targetSection.lessonIds.forEach((id) => {
              const lesson = newState.lessons[id];
              if (lesson) allItemsWithActive.push({ id, type: 'lesson', order: lesson.order });
            });
            targetSection.examIds.forEach((id) => {
              const exam = newState.exams[id];
              if (exam) allItemsWithActive.push({ id, type: 'exam', order: exam.order });
            });
            allItemsWithActive.sort((a, b) => a.order - b.order);
            
            // Determine if dragging up or down (only if same section)
            const isSameSection = oldSectionId === newSectionId;
            const activeIndexInFull = isSameSection 
              ? allItemsWithActive.findIndex(item => item.id === activeId && item.type === 'exam')
              : -1;
            const overIndexInFull = allItemsWithActive.findIndex(item => item.id === overId && item.type === 'lesson');
            const isDraggingUp = isSameSection && activeIndexInFull !== -1 && activeIndexInFull > overIndexInFull;
            
            // Now get list WITHOUT activeId for correct insert position
            const allItems: Array<{ id: string; type: 'lesson' | 'exam'; order: number }> = [];
            targetSection.lessonIds.forEach((id) => {
              if (id !== activeId) { // Exclude activeId to get correct index
                const lesson = newState.lessons[id];
                if (lesson) allItems.push({ id, type: 'lesson', order: lesson.order });
              }
            });
            targetSection.examIds.forEach((id) => {
              const exam = newState.exams[id];
              if (exam) allItems.push({ id, type: 'exam', order: exam.order });
            });
            allItems.sort((a, b) => a.order - b.order);
            
            // Find overIndex in the list WITHOUT activeId
            const overIndex = allItems.findIndex(item => item.id === overId && item.type === 'lesson');
            if (overIndex === -1) {
              insertIndex = allItems.length;
            } else {
              // If dragging up, insert BEFORE overItem. If dragging down or from different section, insert AFTER overItem
              insertIndex = isDraggingUp ? overIndex : overIndex + 1;
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

        // Add to new section at correct position
        const newSection = newState.sections[newSectionId];
        if (newSection) {
          // Get merged list of lessons and exams (excluding activeId)
          const allItems: Array<{ id: string; type: 'lesson' | 'exam' }> = [];
          newSection.lessonIds.forEach((id) => {
            const lesson = newState.lessons[id];
            if (lesson) allItems.push({ id, type: 'lesson' });
          });
          newSection.examIds.forEach((id) => {
            if (id !== activeId) {
              const exam = newState.exams[id];
              if (exam) allItems.push({ id, type: 'exam' });
            }
          });
          
          // Sort by current order
          allItems.sort((a, b) => {
            const aItem = a.type === 'lesson' ? newState.lessons[a.id] : newState.exams[a.id];
            const bItem = b.type === 'lesson' ? newState.lessons[b.id] : newState.exams[b.id];
            return (aItem?.order || 0) - (bItem?.order || 0);
          });
          
          // Insert at correct position
          if (insertIndex !== null && insertIndex >= 0 && insertIndex <= allItems.length) {
            allItems.splice(insertIndex, 0, { id: activeId, type: 'exam' });
          } else {
            allItems.push({ id: activeId, type: 'exam' });
          }
          
          // Split back into lessonIds and examIds and update order
          const newLessonIds: string[] = [];
          const newExamIds: string[] = [];
          allItems.forEach((item, index) => {
            // Update order field for each item
            if (item.type === 'lesson') {
              newLessonIds.push(item.id);
              newState.lessons[item.id] = {
                ...newState.lessons[item.id],
                order: index + 1,
              };
            } else {
              newExamIds.push(item.id);
              newState.exams[item.id] = {
                ...newState.exams[item.id],
                order: index + 1,
              };
            }
          });
          
          newState.sections[newSectionId] = {
            ...newSection,
            lessonIds: newLessonIds,
            examIds: newExamIds,
          };
          // Update order for the moved exam
          const activeItemIndex = allItems.findIndex(item => item.id === activeId && item.type === 'exam');
          if (activeItemIndex !== -1) {
            newState.exams[activeId] = {
              ...activeExam,
              sectionId: newSectionId,
              order: activeItemIndex + 1,
            };
          }
        }

        setNormalizedState(newState);
        setHasPendingChanges(true);
        return;
      }
  };

  // Save all pending changes - Batch Update API
  const handleSaveChanges = async () => {
    if (!hasPendingChanges || !courseId) return;

    const confirmed = confirm('Bạn có chắc chắn muốn lưu các thay đổi thứ tự?');
    if (!confirmed) return;

    try {
      setIsSavingChanges(true);

      // Build batch update payload - chỉ gửi order và sectionId, không gửi status/isPublished
      const payload = {
        sections: normalizedState.sectionOrder.map((id, index) => ({
          id,
          order: index + 1,
        })),
        items: [] as Array<{
          id: string;
          type: 'lesson' | 'exam';
          sectionId: string;
          order: number;
        }>,
      };

      // Collect all items (lessons + exams) with their new order
      normalizedState.sectionOrder.forEach((sectionId) => {
        const section = normalizedState.sections[sectionId];
        if (!section) return;

        // Merge lessons and exams, sorted by order
        const allItems: Array<{ id: string; type: 'lesson' | 'exam'; order: number }> = [];
        
        section.lessonIds.forEach((lessonId) => {
          const lesson = normalizedState.lessons[lessonId];
          if (lesson) {
            allItems.push({
              id: lessonId,
              type: 'lesson',
              order: lesson.order,
            });
          }
        });

        section.examIds.forEach((examId) => {
          const exam = normalizedState.exams[examId];
          if (exam) {
            allItems.push({
              id: examId,
              type: 'exam',
              order: exam.order,
            });
          }
        });

        // Sort by order to ensure correct sequence
        allItems.sort((a, b) => a.order - b.order);

        // Add to payload with correct sectionId and order
        allItems.forEach((item) => {
          payload.items.push({
            id: item.id,
            type: item.type,
            sectionId: sectionId,
            order: item.order,
          });
        });
      });

      // Single API call for batch reorder
      await api.put(`/courses/${courseId}/reorder`, payload);

      // Reload curriculum to sync with backend
      await loadCurriculum();
      setHasPendingChanges(false);
      
      alert('Đã lưu thay đổi thành công!');
    } catch (err: any) {
      console.error('Failed to save changes:', err);
      
      // Handle different error types
      if (err.response?.status === 409) {
        // Conflict - reload và show message
        await loadCurriculum();
        alert('Có thay đổi từ người khác. Đã reload.');
      } else if (err.response?.status === 400) {
        // Validation error
        alert(err.response.data?.message || 'Dữ liệu không hợp lệ. Vui lòng thử lại.');
      } else {
        // Network error
        alert('Lỗi kết nối. Vui lòng thử lại.');
      }
    } finally {
      setIsSavingChanges(false);
    }
  };

  // Cancel pending changes and reload
  const handleCancelChanges = async () => {
    const confirmed = confirm('Bạn có chắc muốn hủy tất cả thay đổi chưa lưu?');
    if (!confirmed) return;

    await loadCurriculum();
    setHasPendingChanges(false);
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
        setHasPendingChanges(false); // Reset pending changes after reload
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể tạo section.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateLesson = (sectionId: string) => {
    setSelectedSectionForModal(sectionId);
    setShowLessonModal(true);
  };

  const handleCreateExamManually = (sectionId: string) => {
    setSelectedSectionForModal(sectionId);
    setShowExamModal(true);
    setShowExamCreateMenu(null);
  };

  const handleCreateExamWithAI = (sectionId: string) => {
    if (!courseId || !sectionId) return;
    router.push(`/instructor/courses/${courseId}/exams/generate?section=${sectionId}`);
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
      // Navigate to exam edit page
      router.push(`/instructor/courses/${courseId}/exams/${item._id}/edit`);
    }
  };

  const handleDuplicate = async (item: CurriculumItem) => {
    if (!courseId) return;

    try {
      setIsSaving(true);
      setHasPendingChanges(false); // Reset pending changes when creating new item
      
      if (item.type === 'lesson') {
        const lesson = normalizedState.lessons[item._id];
        if (!lesson) return;
        
        // Get lesson details from API
        const res = await api.get(`/lessons/${item._id}`);
        if (res.data?.success) {
          const lessonData = res.data.lesson;
          // Create duplicate with "Copy of" prefix
          const duplicateRes = await api.post(`/sections/${lesson.sectionId}/lessons`, {
            title: `Copy of ${lessonData.title}`,
            description: lessonData.description,
            type: lessonData.type,
            videoUrl: lessonData.videoUrl,
            videoDuration: lessonData.videoDuration,
            articleContent: lessonData.articleContent,
            quizQuestions: lessonData.quizQuestions,
            isFree: lessonData.isFree,
            isPublished: false, // Always create as draft
          });
          
          if (duplicateRes.data?.success) {
            await loadCurriculum();
          }
        }
      } else if (item.type === 'exam') {
        const exam = normalizedState.exams[item._id];
        if (!exam) return;
        
        // Get exam details from API
        const res = await api.get(`/exams/${item._id}`);
        if (res.data?.success) {
          const examData = res.data.exam;
          // Create duplicate with "Copy of" prefix
          const duplicateRes = await api.post('/exams', {
            course: courseId,
            section: exam.sectionId,
            title: `Copy of ${examData.title}`,
            description: examData.description,
            questions: examData.questions || [],
            totalPoints: examData.totalPoints,
            passingScore: examData.passingScore,
            shuffleQuestions: examData.shuffleQuestions,
            shuffleAnswers: examData.shuffleAnswers,
            durationMinutes: examData.durationMinutes,
            maxAttempts: examData.maxAttempts,
            scoringMethod: examData.scoringMethod,
            showCorrectAnswers: examData.showCorrectAnswers,
            showScoreToStudent: examData.showScoreToStudent,
            allowLateSubmission: examData.allowLateSubmission,
            latePenaltyPercent: examData.latePenaltyPercent,
            status: 'draft', // Always create as draft
          });
          
          if (duplicateRes.data?.success) {
            await loadCurriculum();
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to duplicate:', err);
      alert(err.response?.data?.message || 'Không thể sao chép.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async (item: CurriculumItem) => {
    if (item.type !== 'lesson') return;

    try {
      setIsSaving(true);
      await api.put(`/lessons/${item._id}`, { isPublished: true });
      await loadCurriculum();
      setHasPendingChanges(false); // Reset pending changes after reload
    } catch (err: any) {
      console.error('Failed to publish:', err);
      alert(err.response?.data?.message || 'Không thể xuất bản.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnpublish = async (item: CurriculumItem) => {
    if (item.type !== 'lesson') return;

    try {
      setIsSaving(true);
      await api.put(`/lessons/${item._id}`, { isPublished: false });
      await loadCurriculum();
      setHasPendingChanges(false); // Reset pending changes after reload
    } catch (err: any) {
      console.error('Failed to unpublish:', err);
      alert(err.response?.data?.message || 'Không thể bỏ xuất bản.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async (item: CurriculumItem) => {
    if (item.type !== 'exam') return;

    try {
      setIsSaving(true);
      await api.put(`/exams/${item._id}`, { status: 'archived' });
      await loadCurriculum();
      setHasPendingChanges(false); // Reset pending changes after reload
    } catch (err: any) {
      console.error('Failed to archive:', err);
      alert(err.response?.data?.message || 'Không thể lưu trữ.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewAnalytics = (item: CurriculumItem) => {
    if (item.type !== 'exam' || !courseId) return;
    router.push(`/instructor/courses/${courseId}/exams/${item._id}/analytics`);
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

  // Filter logic
  const getAllItems = useCallback((): CurriculumItem[] => {
    const items: CurriculumItem[] = [];
    
    // Add sections
    normalizedState.sectionOrder.forEach((sectionId) => {
      const section = normalizedState.sections[sectionId];
      if (section) items.push(section);
    });
    
    // Add lessons
    Object.values(normalizedState.lessons).forEach((lesson) => {
      items.push(lesson);
    });
    
    // Add exams
    Object.values(normalizedState.exams).forEach((exam) => {
      items.push(exam);
    });
    
    return items;
  }, [normalizedState]);

  const filteredItems = useMemo(() => {
    let items = getAllItems();
    
    // Filter by type
    if (filterType !== 'all') {
      items = items.filter(item => item.type === filterType);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.title.toLowerCase().includes(query)
      );
    }
    
    // Filter by status (for lessons/exams)
    if (filterStatus !== 'all') {
      items = items.filter(item => {
        if (item.type === 'lesson') {
          return (item as LessonItem).isPublished === (filterStatus === 'published');
        }
        if (item.type === 'exam') {
          return (item as ExamItem).status === filterStatus;
        }
        return true;
      });
    }
    
  return items;
}, [getAllItems, searchQuery, filterType, filterStatus, normalizedState]);

  const renderTree = () => {
    const elements: JSX.Element[] = [];
    
    // Get filtered section IDs
    const filteredSectionIds = new Set(
      filteredItems
        .filter(item => item.type === 'section')
        .map(item => item._id)
    );
    
    // Get filtered lesson/exam IDs
    const filteredLessonIds = new Set(
      filteredItems
        .filter(item => item.type === 'lesson')
        .map(item => item._id)
    );
    const filteredExamIds = new Set(
      filteredItems
        .filter(item => item.type === 'exam')
        .map(item => item._id)
    );

    // Add sections with their children (only if section passes filter or has filtered children)
    normalizedState.sectionOrder.forEach((sectionId) => {
      const section = normalizedState.sections[sectionId];
      if (!section) return;
      
      // Show section if:
      // 1. Section itself matches filter, OR
      // 2. Section has children that match filter
      const hasFilteredChildren = 
        section.lessonIds.some(id => filteredLessonIds.has(id)) ||
        section.examIds.some(id => filteredExamIds.has(id));
      
      const sectionMatches = filteredSectionIds.has(sectionId);
      
      if (!sectionMatches && !hasFilteredChildren) return;

      elements.push(
        <div key={section._id} className="space-y-2 mb-4">
          <SortableItem
            item={section}
            onSelect={(item) => setSelectedItem({ type: item.type, id: item._id })}
            onDelete={handleDelete}
            onNavigate={handleNavigate}
            isSelected={selectedItem?.id === section._id}
            dragEnabled={dragMode}
            showActionsMenu={showActionsMenu}
            onToggleActionsMenu={setShowActionsMenu}
          />
          {/* Section children */}
          <div className="ml-8 mt-2 space-y-2 border-l-2 border-gray-200 pl-4">
            {/* Lessons and Exams merged and sorted by order */}
            {(() => {
              // Combine lessons and exams, filter, and sort by order
              const allItems: CurriculumItem[] = [];
              
              // Add lessons
              section.lessonIds.forEach((lessonId) => {
                const lesson = normalizedState.lessons[lessonId];
                if (lesson && filteredLessonIds.has(lessonId)) {
                  allItems.push(lesson);
                }
              });
              
              // Add exams
              section.examIds.forEach((examId) => {
                const exam = normalizedState.exams[examId];
                if (exam && filteredExamIds.has(examId)) {
                  allItems.push(exam);
                }
              });
              
              // Sort by order (ascending), then by title as fallback
              allItems.sort((a, b) => {
                if (a.order !== b.order) {
                  return a.order - b.order;
                }
                return a.title.localeCompare(b.title);
              });
              
              // Render sorted items
              return (
                <div className="space-y-1.5">
                  {allItems.map((item) => {
                    if (item.type === 'lesson') {
                      return (
                        <SortableItem
                          key={item._id}
                          item={item}
                          onSelect={(item) => setSelectedItem({ type: item.type, id: item._id })}
                          onDelete={handleDelete}
                          onNavigate={handleNavigate}
                          onDuplicate={handleDuplicate}
                          onPublish={handlePublish}
                          onUnpublish={handleUnpublish}
                          isSelected={selectedItem?.id === item._id}
                          dragEnabled={dragMode}
                          showActionsMenu={showActionsMenu}
                          onToggleActionsMenu={setShowActionsMenu}
                        />
                      );
                    } else if (item.type === 'exam') {
                      return (
                        <SortableItem
                          key={item._id}
                          item={item}
                          onSelect={(item) => setSelectedItem({ type: item.type, id: item._id })}
                          onDelete={handleDelete}
                          onNavigate={handleNavigate}
                          onDuplicate={handleDuplicate}
                          onArchive={handleArchive}
                          onViewAnalytics={handleViewAnalytics}
                          isSelected={selectedItem?.id === item._id}
                          dragEnabled={dragMode}
                          showActionsMenu={showActionsMenu}
                          onToggleActionsMenu={setShowActionsMenu}
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              );
            })()}
            {/* Add buttons for section */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleCreateLesson(sectionId)}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1.5 rounded transition-colors font-medium"
              >
                <Plus className="w-3 h-3" />
                Thêm Lesson
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowExamCreateMenu(showExamCreateMenu === sectionId ? null : sectionId)}
                  className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-2 py-1.5 rounded transition-colors font-medium"
                >
                  <Plus className="w-3 h-3" />
                  Thêm Exam
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showExamCreateMenu === sectionId && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowExamCreateMenu(null)}
                    />
                    <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[200px] overflow-hidden">
                      <button
                        onClick={() => handleCreateExamWithAI(sectionId)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span>Tạo bằng AI</span>
                      </button>
                      <button
                        onClick={() => handleCreateExamManually(sectionId)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2 border-t border-gray-100"
                      >
                        <PenTool className="w-4 h-4 text-blue-600" />
                        <span>Tạo thủ công</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
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
          </div>

          {/* Search & Filter Bar */}
          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterType={filterType}
            onFilterTypeChange={setFilterType}
            filterStatus={filterStatus}
            onFilterStatusChange={setFilterStatus}
          />

          {/* Header Actions */}
          <div className="flex items-center justify-between mb-6">
            {/* Pending Changes Indicator */}
            {hasPendingChanges && dragMode && (
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <span className="text-sm text-yellow-800 font-medium">
                  Có thay đổi chưa lưu
                </span>
                <button
                  onClick={handleSaveChanges}
                  disabled={isSavingChanges}
                  className="inline-flex items-center px-3 py-1.5 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {isSavingChanges ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button
                  onClick={handleCancelChanges}
                  disabled={isSavingChanges}
                  className="inline-flex items-center px-3 py-1.5 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Hủy
                </button>
              </div>
            )}
            
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => {
                  if (dragMode && hasPendingChanges) {
                    const confirmed = confirm('Bạn có thay đổi chưa lưu. Bạn có muốn hủy các thay đổi này không?');
                    if (!confirmed) return;
                    setHasPendingChanges(false);
                  }
                  setDragMode(!dragMode);
                }}
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
                disabled={isSaving || dragMode}
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

      {/* Modals */}
      {showLessonModal && selectedSectionForModal && (
        <LessonCreateModal
          isOpen={showLessonModal}
          sectionId={selectedSectionForModal}
          courseId={courseId!}
          onClose={() => {
            setShowLessonModal(false);
            setSelectedSectionForModal(null);
          }}
          onSuccess={() => {
            loadCurriculum();
            setHasPendingChanges(false); // Reset pending changes after reload
            setShowLessonModal(false);
            setSelectedSectionForModal(null);
          }}
        />
      )}

      {showExamModal && selectedSectionForModal && (
        <ExamCreateModal
          isOpen={showExamModal}
          sectionId={selectedSectionForModal}
          courseId={courseId!}
          onClose={() => {
            setShowExamModal(false);
            setSelectedSectionForModal(null);
          }}
          onSuccess={() => {
            loadCurriculum();
            setHasPendingChanges(false); // Reset pending changes after reload
            setShowExamModal(false);
            setSelectedSectionForModal(null);
          }}
        />
      )}
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData(item);
  }, [item]);

  const handleSave = async () => {
    setFieldErrors({});

    // Client-side validation
    const errors: Record<string, string> = {};

    if (!formData.title || !formData.title.trim()) {
      errors.title = 'Tiêu đề là bắt buộc.';
    } else if (formData.title.length > 200) {
      errors.title = 'Tiêu đề không được vượt quá 200 ký tự.';
    }

    if (item.type === 'section' && formData.description && formData.description.length > 500) {
      errors.description = 'Mô tả không được vượt quá 500 ký tự.';
    } else if (item.type === 'lesson' && formData.description && formData.description.length > 1000) {
      errors.description = 'Mô tả không được vượt quá 1000 ký tự.';
    } else if (item.type === 'exam' && formData.description && formData.description.length > 2000) {
      errors.description = 'Mô tả không được vượt quá 2000 ký tự.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

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
      // Parse backend validation errors
      const backendErrors: Record<string, string> = {};
      if (err?.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        err.response.data.errors.forEach((error: any) => {
          const field = error.path || error.field || 'general';
          backendErrors[field] = error.message || error.msg || 'Lỗi validation';
        });
      }

      if (Object.keys(backendErrors).length > 0) {
        setFieldErrors(backendErrors);
      } else {
        alert(err.response?.data?.message || 'Không thể cập nhật.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Chỉnh sửa {item.type === 'section' ? 'Section' : item.type === 'lesson' ? 'Lesson' : 'Exam'}</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tiêu đề <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          value={formData.title || ''}
          onChange={(e) => {
            setFormData({ ...formData, title: e.target.value });
            if (fieldErrors.title) {
              setFieldErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors.title;
                return newErrors;
              });
            }
          }}
          className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            fieldErrors.title ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
          maxLength={200}
          required
        />
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Tiêu đề ngắn gọn, mô tả rõ nội dung (tối đa 200 ký tự)
          </p>
          <span className="text-xs text-gray-400">
            {(formData.title || '').length}/200
          </span>
        </div>
        {fieldErrors.title && (
          <p className="mt-1 text-xs text-red-600 flex items-center">
            <span className="mr-1">⚠️</span>
            {fieldErrors.title}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mô tả <span className="text-xs text-gray-500 font-normal">(Tùy chọn)</span>
        </label>
        <textarea
          name="description"
          value={formData.description || ''}
          onChange={(e) => {
            setFormData({ ...formData, description: e.target.value });
            if (fieldErrors.description) {
              setFieldErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors.description;
                return newErrors;
              });
            }
          }}
          rows={3}
          className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            fieldErrors.description ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
          maxLength={item.type === 'section' ? 500 : item.type === 'lesson' ? 1000 : 2000}
          placeholder="Mô tả chi tiết..."
        />
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Mô tả giúp học viên hiểu rõ nội dung
            {item.type === 'section' && ' (tối đa 500 ký tự)'}
            {item.type === 'lesson' && ' (tối đa 1000 ký tự)'}
            {item.type === 'exam' && ' (tối đa 2000 ký tự)'}
          </p>
          <span className="text-xs text-gray-400">
            {(formData.description || '').length}/{item.type === 'section' ? 500 : item.type === 'lesson' ? 1000 : 2000}
          </span>
        </div>
        {fieldErrors.description && (
          <p className="mt-1 text-xs text-red-600 flex items-center">
            <span className="mr-1">⚠️</span>
            {fieldErrors.description}
          </p>
        )}
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

