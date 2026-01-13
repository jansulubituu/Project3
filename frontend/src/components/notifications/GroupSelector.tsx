'use client';

import { useState, useMemo } from 'react';
import { Search, Users, BookOpen, UserCheck } from 'lucide-react';

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

interface GroupSelectorProps {
  groups: UserGroup[];
  selectedGroupIds: Set<string>;
  onToggleGroup: (groupId: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  disabled?: boolean;
}

export default function GroupSelector({
  groups,
  selectedGroupIds,
  onToggleGroup,
  onSelectAll,
  onDeselectAll,
  searchTerm = '',
  onSearchChange,
  disabled = false,
}: GroupSelectorProps) {
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groups;
    const term = searchTerm.toLowerCase();
    return groups.filter(
      (group) =>
        group.name.toLowerCase().includes(term) ||
        group.description?.toLowerCase().includes(term) ||
        group.courseName?.toLowerCase().includes(term)
    );
  }, [groups, searchTerm]);

  const totalUsers = useMemo(() => {
    return filteredGroups
      .filter((g) => selectedGroupIds.has(g.id))
      .reduce((sum, g) => sum + g.userCount, 0);
  }, [filteredGroups, selectedGroupIds]);

  const getGroupIcon = (type: UserGroup['type']) => {
    switch (type) {
      case 'role':
        return <UserCheck className="w-4 h-4" />;
      case 'course':
        return <BookOpen className="w-4 h-4" />;
      case 'instructor_courses':
        return <Users className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getGroupTypeLabel = (type: UserGroup['type']) => {
    switch (type) {
      case 'role':
        return 'Nhóm theo vai trò';
      case 'course':
        return 'Khóa học';
      case 'instructor_courses':
        return 'Tất cả khóa học';
      default:
        return '';
    }
  };

  // Group by type
  const groupedByType = useMemo(() => {
    const grouped: Record<string, UserGroup[]> = {};
    filteredGroups.forEach((group) => {
      if (!grouped[group.type]) {
        grouped[group.type] = [];
      }
      grouped[group.type].push(group);
    });
    return grouped;
  }, [filteredGroups]);

  return (
    <div className="space-y-4">
      {/* Search and Select All */}
      <div className="flex items-center gap-2">
        {onSearchChange && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm nhóm..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={disabled}
            />
          </div>
        )}
        {onSelectAll && onDeselectAll && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSelectAll}
              disabled={disabled || filteredGroups.length === 0}
              className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Chọn tất cả
            </button>
            <button
              type="button"
              onClick={onDeselectAll}
              disabled={disabled || selectedGroupIds.size === 0}
              className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Bỏ chọn tất cả
            </button>
          </div>
        )}
      </div>

      {/* Groups List */}
      <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
        {filteredGroups.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'Không tìm thấy nhóm nào' : 'Không có nhóm nào'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {Object.entries(groupedByType).map(([type, typeGroups]) => (
              <div key={type}>
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700">
                    {getGroupTypeLabel(type as UserGroup['type'])}
                  </h4>
                </div>
                {typeGroups.map((group) => (
                  <label
                    key={group.id}
                    className={`flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedGroupIds.has(group.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroupIds.has(group.id)}
                      onChange={() => onToggleGroup(group.id)}
                      disabled={disabled}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-gray-600">{getGroupIcon(group.type)}</div>
                        <span className="font-medium text-gray-900">{group.name}</span>
                        <span className="text-sm text-gray-500">
                          ({group.userCount} {group.userCount === 1 ? 'người' : 'người'})
                        </span>
                      </div>
                      {group.description && (
                        <p className="mt-1 text-sm text-gray-600">{group.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total Selected Users */}
      {selectedGroupIds.size > 0 && (
        <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              Đã chọn {selectedGroupIds.size} nhóm
            </span>
            <span className="text-sm font-semibold text-blue-700">
              Tổng: {totalUsers} {totalUsers === 1 ? 'người dùng' : 'người dùng'} sẽ nhận thông báo
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
