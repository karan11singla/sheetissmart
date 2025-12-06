import { useState, useRef, useEffect } from 'react';
import type { TableCellProps } from './types';

export default function TableCell({
  cell,
  rowIndex,
  colIndex,
  isSelected,
  isEditing,
  isViewOnly,
  isFormulaMode = false,
  isInSelectionRange = false,
  onSelect,
  onEdit,
  onSave,
  onNavigate,
  onFillDrag,
  onFormulaSelect,
  onDragSelect,
  editingCellValue,
  onValueChange,
}: TableCellProps) {
  const [value, setValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSelectionDragging, setIsSelectionDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const fillHandleRef = useRef<HTMLDivElement>(null);

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

  // If cell has a formula, show the formula when editing and computed value when viewing
  const hasFormula = cell?.formula !== null && cell?.formula !== undefined;
  const displayValue = hasFormula
    ? cell?.formula
    : (cell?.value ? JSON.parse(cell.value) : '');
  const computedValue = cell?.computedValue;

  const handleDoubleClick = () => {
    if (!isViewOnly && cell) {
      // When editing, show the formula or raw value
      const editValue = hasFormula ? cell.formula : displayValue;
      onEdit(cell.id, editValue, { rowIndex, colIndex });
      setValue(editValue || '');
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
      onEdit(cell.id, displayValue, { rowIndex, colIndex });
      setValue(e.key); // Start with the typed character
    }
    // Enter key starts editing with existing content
    else if (e.key === 'Enter' && !isViewOnly && cell) {
      e.preventDefault();
      onEdit(cell.id, displayValue, { rowIndex, colIndex });
      setValue(displayValue);
    }
  };

  const handleFillHandleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isViewOnly && onFillDrag) {
      setIsDragging(true);
      onFillDrag({ rowIndex, colIndex }, 'start');
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (onFillDrag) {
        // Find the cell under the mouse - only look for actual table cells, not row headers
        const element = document.elementFromPoint(e.clientX, e.clientY);
        // Make sure we're finding a div inside a td, not the row header
        const cellElement = element?.closest('td [data-cell-pos]');
        if (cellElement) {
          const pos = cellElement.getAttribute('data-cell-pos');
          if (pos) {
            const [row, col] = pos.split(',').map(Number);
            onFillDrag({ rowIndex: row, colIndex: col }, 'drag');
          }
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (onFillDrag) {
        onFillDrag({ rowIndex, colIndex }, 'end');
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, rowIndex, colIndex, onFillDrag]);

  // Reset selection dragging on global mouseup
  useEffect(() => {
    if (!isSelectionDragging) return;

    const handleMouseUp = () => {
      setIsSelectionDragging(false);
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSelectionDragging]);

  // Sync local value with prop value when editing starts
  useEffect(() => {
    if (isEditing && editingCellValue !== undefined) {
      setValue(editingCellValue);
    }
  }, [isEditing, editingCellValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  const handleBlur = () => {
    // Don't save on blur if we're in formula mode - clicking cells should not trigger blur save
    if (!isFormulaMode) {
      handleSave();
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full h-full px-3 py-2 border-2 focus:outline-none ${
          isFormulaMode
            ? 'border-green-500 bg-green-50/30'
            : 'border-blue-500 bg-white'
        }`}
      />
    );
  }

  // For display: show computed value if it's a formula, otherwise show the regular value
  const cellDisplayValue = hasFormula
    ? (computedValue !== undefined && computedValue !== null ? String(computedValue) : '')
    : (displayValue || '');

  // Handle cell click - if in formula mode (but not this cell being edited), call onFormulaSelect
  const handleCellClick = (e: React.MouseEvent) => {
    // If we're in formula mode and this is NOT the editing cell, add cell reference
    if (isFormulaMode && !isEditing && onFormulaSelect) {
      e.preventDefault();
      e.stopPropagation();
      onFormulaSelect({ rowIndex, colIndex });
    } else if (!isSelectionDragging) {
      // Normal cell selection - pass shiftKey for range extension
      // Only select if we're not in a drag operation
      onSelect({ rowIndex, colIndex }, e.shiftKey);
    }
  };

  // Handle mouse down for drag selection
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag selection on left click and not when editing or in formula mode
    if (e.button === 0 && !isEditing && !isFormulaMode && onDragSelect) {
      setIsSelectionDragging(true);
      onDragSelect({ rowIndex, colIndex }, 'start');
    }
  };

  // Handle mouse enter during drag
  const handleMouseEnter = () => {
    // Only trigger drag if we're actually in a selection drag operation
    if (isSelectionDragging && onDragSelect) {
      onDragSelect({ rowIndex, colIndex }, 'drag');
    }
  };

  // Show green hover effect when in formula mode and not the editing cell
  const showFormulaHoverEffect = isFormulaMode && !isEditing && onFormulaSelect;

  return (
    <div
      ref={cellRef}
      tabIndex={isSelected ? 0 : -1}
      data-cell-pos={`${rowIndex},${colIndex}`}
      className={`w-full h-full px-3 py-2 transition-colors focus:outline-none relative ${
        !isViewOnly && !showFormulaHoverEffect ? 'cursor-pointer hover:bg-blue-50/50' : ''
      } ${showFormulaHoverEffect ? 'cursor-crosshair hover:bg-green-100 hover:ring-1 hover:ring-inset hover:ring-green-400' : ''} ${
        isSelected ? 'ring-2 ring-inset ring-blue-500 bg-blue-50/60' : ''
      } ${isInSelectionRange && !isSelected ? 'bg-blue-100/70 ring-1 ring-inset ring-blue-300' : ''} ${
        hasFormula ? 'italic text-indigo-700 font-medium' : ''
      }`}
      onClick={handleCellClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleCellKeyDown}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
    >
      <div className="truncate">
        {cellDisplayValue}
      </div>
      {isSelected && !isEditing && !isViewOnly && (
        <div
          ref={fillHandleRef}
          onMouseDown={handleFillHandleMouseDown}
          className="absolute bottom-0 right-0 w-2 h-2 bg-blue-600 cursor-crosshair"
          style={{ transform: 'translate(50%, 50%)' }}
        />
      )}
    </div>
  );
}
