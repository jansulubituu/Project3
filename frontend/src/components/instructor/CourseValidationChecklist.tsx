'use client';

import { useEffect, useMemo } from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface ValidationChecklistProps {
  course: {
    thumbnail?: string;
    totalLessons?: number;
    title?: string;
    description?: string;
    category?: { _id: string; name: string };
    price?: number;
  };
  onValidationChange?: (isValid: boolean, missingItems: string[]) => void;
}

export default function CourseValidationChecklist({
  course,
  onValidationChange,
}: ValidationChecklistProps) {
  const validationItems = useMemo(() => {
    const items = [
      {
        key: 'thumbnail',
        label: 'Thumbnail đã upload',
        isValid: !!course.thumbnail,
      },
      {
        key: 'lessons',
        label: 'Có ít nhất 1 lesson',
        isValid: (course.totalLessons || 0) > 0,
      },
      {
        key: 'title',
        label: 'Title không rỗng',
        isValid: !!course.title && course.title.trim().length > 0,
      },
      {
        key: 'description',
        label: 'Description không rỗng',
        isValid: !!course.description && course.description.trim().length > 0,
      },
      {
        key: 'category',
        label: 'Category đã chọn',
        isValid: !!course.category && !!course.category._id,
      },
      {
        key: 'price',
        label: 'Price đã set',
        isValid: typeof course.price === 'number' && course.price >= 0,
      },
    ];

    return items;
  }, [course]);

  const isValid = useMemo(
    () => validationItems.every((item) => item.isValid),
    [validationItems]
  );

  const missingItems = useMemo(
    () => validationItems.filter((item) => !item.isValid).map((item) => item.label),
    [validationItems]
  );

  useEffect(() => {
    onValidationChange?.(isValid, missingItems);
  }, [isValid, missingItems, onValidationChange]);

  return (
    <div className="space-y-2">
      {validationItems.map((item) => (
        <div
          key={item.key}
          className={`flex items-center space-x-2 p-2 rounded ${
            item.isValid ? 'bg-green-50' : 'bg-red-50'
          }`}
        >
          {item.isValid ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
          <span
            className={`text-sm ${
              item.isValid ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {item.label}
          </span>
        </div>
      ))}
      {!isValid && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Còn thiếu các yêu cầu sau:
              </p>
              <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                {missingItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
