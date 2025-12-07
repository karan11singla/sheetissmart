import { useState, useEffect, useRef, useCallback } from 'react';
import { Edit3, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import type { ColumnHeaderProps } from './types';

export default function ColumnHeader({
  column,
  isViewOnly,
  onRename,
  onDelete,
  onInsertLeft,
  onInsertRight,
  onResize,
}: ColumnHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(column.name);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);

  // Sync local state with column prop changes
  useEffect(() => {
    setName(column.name);
  }, [column.name]);

  const handleSave = () => {
    if (name.trim() && name !== column.name) {
      onRename(column.id, name.trim());
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Delete column "${column.name}"? This will permanently delete all data in this column.`)) {
      onDelete(column.id);
    }
  };

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = column.width || 150;
  }, [column.width]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizeStartX.current;
      const newWidth = Math.max(50, resizeStartWidth.current + diff);
      // Update live during drag via CSS custom property on parent
      const th = document.querySelector(`[data-column-id="${column.id}"]`) as HTMLElement;
      if (th) {
        th.style.minWidth = `${newWidth}px`;
        th.style.maxWidth = `${newWidth}px`;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsResizing(false);
      const diff = e.clientX - resizeStartX.current;
      const newWidth = Math.max(50, resizeStartWidth.current + diff);
      if (onResize && newWidth !== resizeStartWidth.current) {
        onResize(column.id, newWidth);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, column.id, onResize]);

  if (isEditing) {
    return (
      <div className="relative w-full">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          autoFocus
          className="w-full font-bold bg-white border-b-2 border-blue-500 px-2 py-1 focus:outline-none rounded"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between w-full group relative">
      <div className="flex items-center space-x-1.5 flex-1 min-w-0">
        <span
          className="truncate cursor-pointer hover:text-blue-600 font-bold transition-colors"
          onDoubleClick={() => !isViewOnly && setIsEditing(true)}
          title="Double-click to rename"
        >
          {column.name}
        </span>
        {!isViewOnly && (
          <button
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-blue-100 transition-all flex-shrink-0"
            title="Rename column"
          >
            <Edit3 className="h-3 w-3 text-blue-600" />
          </button>
        )}
      </div>
      {!isViewOnly && (
        <div className="flex items-center flex-shrink-0">
          {onInsertLeft && (
            <button
              onClick={() => onInsertLeft(column.position)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-green-100 transition-all"
              title="Insert column to left"
            >
              <ArrowLeft className="h-3 w-3 text-green-600" />
            </button>
          )}
          {onInsertRight && (
            <button
              onClick={() => onInsertRight(column.position + 1)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-green-100 transition-all"
              title="Insert column to right"
            >
              <ArrowRight className="h-3 w-3 text-green-600" />
            </button>
          )}
          <button
            onClick={handleDelete}
            className="p-0.5 rounded hover:bg-red-100 transition-colors text-gray-400 hover:text-red-600"
            title="Delete column"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
      {/* Resize handle - positioned at the right edge of the column header */}
      {!isViewOnly && onResize && (
        <div
          className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 ${
            isResizing ? 'bg-blue-500' : 'bg-transparent'
          }`}
          onMouseDown={handleResizeStart}
          title="Drag to resize column"
        />
      )}
    </div>
  );
}
