import { useState } from 'react';
import { X, Filter } from 'lucide-react';
import type { Column } from '../types';

interface FilterPanelProps {
  columns: Column[];
  filters: Record<string, string>;
  onFilterChange: (columnId: string, value: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}

export default function FilterPanel({
  columns,
  filters,
  onFilterChange,
  onClearAll,
  onClose,
}: FilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<Record<string, string>>(filters);

  const handleFilterChange = (columnId: string, value: string) => {
    setLocalFilters(prev => ({ ...prev, [columnId]: value }));
    onFilterChange(columnId, value);
  };

  const handleClearColumn = (columnId: string) => {
    setLocalFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[columnId];
      return newFilters;
    });
    onFilterChange(columnId, '');
  };

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Filter by column</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClearAll}
              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100"
            >
              Clear all
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {columns.map((column) => (
            <div key={column.id} className="relative">
              <label className="block text-xs font-medium text-slate-500 mb-1 truncate">
                {column.name}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={localFilters[column.id] || ''}
                  onChange={(e) => handleFilterChange(column.id, e.target.value)}
                  placeholder="Filter..."
                  className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 pr-6"
                />
                {localFilters[column.id] && (
                  <button
                    onClick={() => handleClearColumn(column.id)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
