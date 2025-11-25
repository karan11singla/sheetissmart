import { useState, useRef, useEffect } from 'react';
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
}: TableCellProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

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

  return (
    <div
      className={`w-full h-full px-3 py-2 transition-colors ${
        !isViewOnly ? 'cursor-pointer hover:bg-blue-50/50' : ''
      } ${isSelected ? 'ring-2 ring-inset ring-blue-500 bg-blue-50/60' : ''}`}
      onClick={() => onSelect({ rowIndex, colIndex })}
      onDoubleClick={handleDoubleClick}
    >
      <div className="truncate">
        {computedValue !== undefined ? computedValue : displayValue}
      </div>
    </div>
  );
}
