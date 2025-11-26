import { useState, useRef, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import type { TableCellProps } from './types';

export default function TableCell({
  cell,
  rowIndex,
  colIndex,
  isSelected,
  isEditing,
  isViewOnly,
  onSelect,
  onEdit,
  onSave,
  onNavigate,
  onCommentClick,
}: TableCellProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isSelected && !isEditing && cellRef.current) {
      cellRef.current.focus();
    }
  }, [isSelected, isEditing]);

  const displayValue = cell?.value ? JSON.parse(cell.value) : '';
  const computedValue = (cell as any)?.computedValue;

  const handleDoubleClick = () => {
    if (!isViewOnly && cell) {
      onEdit(cell.id, displayValue);
      setValue(displayValue);
    }
  };

  const handleSave = () => {
    if (cell) {
      onSave(cell.id, value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const cursorAtStart = input.selectionStart === 0;
    const cursorAtEnd = input.selectionStart === input.value.length;

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleSave();
      onNavigate('up');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleSave();
      onNavigate('down');
    } else if (e.key === 'ArrowLeft' && cursorAtStart) {
      e.preventDefault();
      handleSave();
      onNavigate('left');
    } else if (e.key === 'ArrowRight' && cursorAtEnd) {
      e.preventDefault();
      handleSave();
      onNavigate('right');
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle arrow key navigation when not editing
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onNavigate('up');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onNavigate('down');
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onNavigate('left');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onNavigate('right');
    }
    // Start editing on alphanumeric keys, clearing old content
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !isViewOnly && cell) {
      e.preventDefault();
      onEdit(cell.id, displayValue);
      setValue(e.key); // Start with the typed character
    }
    // Enter key starts editing with existing content
    else if (e.key === 'Enter' && !isViewOnly && cell) {
      e.preventDefault();
      onEdit(cell.id, displayValue);
      setValue(displayValue);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full h-full px-3 py-2 border-2 border-blue-500 focus:outline-none bg-white"
      />
    );
  }

  const hasComments = !!(cell?._count?.comments && cell._count.comments > 0);

  return (
    <div
      ref={cellRef}
      tabIndex={isSelected ? 0 : -1}
      className={`w-full h-full px-3 py-2 transition-colors focus:outline-none relative ${
        !isViewOnly ? 'cursor-pointer hover:bg-blue-50/50' : ''
      } ${isSelected ? 'ring-2 ring-inset ring-blue-500 bg-blue-50/60' : ''}`}
      onClick={() => onSelect({ rowIndex, colIndex })}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleCellKeyDown}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="truncate flex-1">
          {computedValue !== undefined ? computedValue : (displayValue || '')}
        </div>
        {hasComments && cell && onCommentClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCommentClick(cell.id);
            }}
            className="flex-shrink-0 text-indigo-600 hover:text-indigo-800 transition-colors"
            title={`${cell._count?.comments} comment${cell._count?.comments !== 1 ? 's' : ''}`}
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
