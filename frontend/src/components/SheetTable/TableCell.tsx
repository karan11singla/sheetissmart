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
  isDragSelecting = false,
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
      // Pass the typed key as the initial value so it becomes the starting text
      onEdit(cell.id, e.key, { rowIndex, colIndex });
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
    e.preventDefault(); // Prevent browser text selection
    if (!isViewOnly && onFillDrag) {
      setIsDragging(true);
      onFillDrag({ rowIndex, colIndex }, 'start');
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!onFillDrag) return;

      // Find the cell under the mouse - only look for actual table cells, not row headers
      const element = document.elementFromPoint(e.clientX, e.clientY);
      if (!element) return;

      // Only process if we're over a TD element that's a data cell (not row header)
      const td = element.closest('td');
      if (!td) return;

      // Skip if this TD doesn't contain a div with data-cell-pos
      // Row header TDs won't have this
      const cellDiv = td.querySelector('[data-cell-pos]');
      if (!cellDiv) return;

      const pos = cellDiv.getAttribute('data-cell-pos');
      if (pos) {
        const [row, col] = pos.split(',').map(Number);
        // Validate that both row and col are valid numbers (not NaN) and col >= 0
        // This ensures we only process valid data cells, not row headers
        if (!isNaN(row) && !isNaN(col) && row >= 0 && col >= 0) {
          onFillDrag({ rowIndex: row, colIndex: col }, 'drag');
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      if (onFillDrag) {
        // Find the cell under the mouse at mouseup time
        const element = document.elementFromPoint(e.clientX, e.clientY);
        let endPosition = { rowIndex, colIndex }; // fallback to start position

        if (element) {
          const td = element.closest('td');
          if (td) {
            const cellDiv = td.querySelector('[data-cell-pos]');
            if (cellDiv) {
              const pos = cellDiv.getAttribute('data-cell-pos');
              if (pos) {
                const [row, col] = pos.split(',').map(Number);
                if (!isNaN(row) && !isNaN(col) && row >= 0 && col >= 0) {
                  endPosition = { rowIndex: row, colIndex: col };
                }
              }
            }
          }
        }

        // Send final drag position before end
        onFillDrag(endPosition, 'drag');
        onFillDrag(endPosition, 'end');
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, rowIndex, colIndex, onFillDrag]);


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
    } else if (!isDragSelecting) {
      // Normal cell selection - pass shiftKey for range extension
      // Only select if we're not in a drag operation
      onSelect({ rowIndex, colIndex }, e.shiftKey);
    }
  };

  // Handle mouse down for drag selection
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag selection on left click and not when editing or in formula mode
    if (e.button === 0 && !isEditing && !isFormulaMode && onDragSelect) {
      onDragSelect({ rowIndex, colIndex }, 'start');
    }
  };

  // Handle mouse enter during drag
  const handleMouseEnter = () => {
    // Only trigger drag if we're actually in a selection drag operation (from parent state)
    if (isDragSelecting && onDragSelect) {
      onDragSelect({ rowIndex, colIndex }, 'drag');
    }
  };

  // Show green hover effect when in formula mode and not the editing cell
  const showFormulaHoverEffect = isFormulaMode && !isEditing && onFormulaSelect;

  // Get text alignment class
  const alignmentClass = cell?.textAlign === 'center' ? 'text-center' :
                        cell?.textAlign === 'right' ? 'text-right' :
                        'text-left';

  // Get vertical alignment style
  const verticalAlignStyle = cell?.verticalAlign === 'top' ? 'flex-start' :
                            cell?.verticalAlign === 'bottom' ? 'flex-end' :
                            'center';

  // Build inline styles for cell formatting
  const cellStyles: React.CSSProperties = {
    backgroundColor: cell?.backgroundColor || undefined,
    color: cell?.textColor || undefined,
    fontSize: cell?.fontSize ? `${cell.fontSize}px` : undefined,
    fontFamily: cell?.fontFamily || undefined,
    display: 'flex',
    alignItems: verticalAlignStyle,
  };

  // Text rotation style
  const textRotationStyle: React.CSSProperties = cell?.textRotation ? {
    transform: `rotate(${cell.textRotation}deg)`,
    transformOrigin: 'center center',
    whiteSpace: cell.textRotation === 90 || cell.textRotation === -90 ? 'nowrap' : undefined,
  } : {};

  // Build text formatting classes
  const textFormatClasses = [
    cell?.bold ? 'font-bold' : '',
    cell?.italic ? 'italic' : '',
    cell?.underline ? 'underline' : '',
    cell?.strikethrough ? 'line-through' : '',
  ].filter(Boolean).join(' ');

  // Format number value based on numberFormat
  const formatDisplayValue = (val: string | number): string => {
    if (!val && val !== 0) return '';
    const numVal = typeof val === 'string' ? parseFloat(val) : val;

    if (isNaN(numVal)) return String(val);

    const decimals = cell?.decimalPlaces ?? 2;

    switch (cell?.numberFormat) {
      case 'currency':
        return `$${numVal.toFixed(decimals)}`;
      case 'percentage':
        return `${(numVal * 100).toFixed(decimals)}%`;
      case 'number':
        return numVal.toFixed(decimals);
      default:
        return String(val);
    }
  };

  const formattedDisplayValue = cell?.numberFormat && cell.numberFormat !== 'general'
    ? formatDisplayValue(cellDisplayValue)
    : cellDisplayValue;

  // Build border classes based on individual border settings
  const borderClasses = [
    cell?.hasBorder ? 'border border-slate-400' : '',
    cell?.borderTop ? 'border-t border-t-slate-400' : '',
    cell?.borderBottom ? 'border-b border-b-slate-400' : '',
    cell?.borderLeft ? 'border-l border-l-slate-400' : '',
    cell?.borderRight ? 'border-r border-r-slate-400' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={cellRef}
      tabIndex={isSelected ? 0 : -1}
      data-cell-pos={`${rowIndex},${colIndex}`}
      className={`w-full h-full px-3 py-2 transition-colors focus:outline-none relative select-none ${alignmentClass} ${
        !isViewOnly && !showFormulaHoverEffect ? 'cursor-pointer hover:bg-blue-50/50' : ''
      } ${showFormulaHoverEffect ? 'cursor-crosshair hover:bg-green-100 hover:ring-1 hover:ring-inset hover:ring-green-400' : ''} ${
        isSelected ? 'ring-2 ring-inset ring-blue-500 bg-blue-50/60' : ''
      } ${isInSelectionRange && !isSelected ? 'bg-blue-100/70 ring-1 ring-inset ring-blue-300' : ''} ${
        hasFormula && !cell?.bold && !cell?.italic ? 'italic text-indigo-700 font-medium' : ''
      } ${borderClasses}`}
      style={cellStyles}
      onClick={handleCellClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleCellKeyDown}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
    >
      <div
        className={`${cell?.wrapText ? 'whitespace-normal break-words' : 'truncate'} ${textFormatClasses}`}
        style={textRotationStyle}
      >
        {formattedDisplayValue}
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
