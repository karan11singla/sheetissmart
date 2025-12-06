import { useState, useCallback, useEffect, useRef } from 'react';
import TableCell from './TableCell';
import ColumnHeader from './ColumnHeader';
import RowHeader from './RowHeader';
import type { SheetTableProps, CellPosition } from './types';
import type { Cell } from '../../types';

export default function SheetTable({
  columns,
  rows,
  isViewOnly = false,
  onCellUpdate,
  onCellSelect,
  onColumnUpdate,
  onColumnDelete,
  onRowUpdate,
  onRowDelete,
  onCommentClick,
  onInsertRowAbove,
  onInsertRowBelow,
  onInsertColumnLeft,
  onInsertColumnRight,
  copiedCellId,
  selectionRange,
  onSelectionRangeChange,
}: SheetTableProps) {
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editingCellValue, setEditingCellValue] = useState<string>('');
  const [fillStart, setFillStart] = useState<CellPosition | null>(null);
  const [fillEnd, setFillEnd] = useState<CellPosition | null>(null);

  // Refs to track latest fill state for use in callbacks
  const fillStartRef = useRef<CellPosition | null>(null);
  const fillEndRef = useRef<CellPosition | null>(null);

  // Mouse drag selection
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<CellPosition | null>(null);

  const getCellValue = useCallback((row: typeof rows[0], columnId: string): Cell | undefined => {
    return row.cells?.find((c) => c.columnId === columnId);
  }, []);

  // Helper function to convert column index to letter (0 -> A, 1 -> B, 25 -> Z, 26 -> AA)
  const getColumnLetter = useCallback((colIndex: number): string => {
    let letter = '';
    let index = colIndex;
    while (index >= 0) {
      letter = String.fromCharCode(65 + (index % 26)) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  }, []);

  // Detect if we're in formula mode (editing cell value starts with '=')
  const isFormulaMode = editingCellValue.startsWith('=');

  const handleCellSelect = useCallback((position: CellPosition, shiftKey?: boolean) => {
    if (shiftKey && selectedCell) {
      // Extend selection range with Shift+Click
      const range = {
        start: selectedCell,
        end: position,
      };
      onSelectionRangeChange?.(range);
    } else {
      // Normal selection - clear range
      setSelectedCell(position);
      onCellSelect?.(position);
      onSelectionRangeChange?.(null);
    }
  }, [selectedCell, onCellSelect, onSelectionRangeChange]);

  const handleCellEdit = useCallback((cellId: string, initialValue: string, _position: CellPosition) => {
    setEditingCell(cellId);
    setEditingCellValue(initialValue);
  }, []);

  const handleCellSave = useCallback((cellId: string, value: string) => {
    onCellUpdate(cellId, value);
    setEditingCell(null);
    setEditingCellValue('');
  }, [onCellUpdate]);

  const handleCellValueChange = useCallback((value: string) => {
    setEditingCellValue(value);
  }, []);

  const handleFormulaCellSelect = useCallback((position: CellPosition) => {
    // Generate cell reference (e.g., "A1", "B2")
    const columnLetter = getColumnLetter(position.colIndex);
    const rowNumber = position.rowIndex + 1; // Row numbers are 1-indexed for display
    const cellReference = `${columnLetter}${rowNumber}`;

    // Append the cell reference to the current formula
    setEditingCellValue(prev => prev + cellReference);
  }, [getColumnLetter]);

  const handleDragSelect = useCallback((position: CellPosition, action: 'start' | 'drag' | 'end') => {
    if (action === 'start') {
      setIsDragging(true);
      setDragStart(position);
      setSelectedCell(position);
      onSelectionRangeChange?.(null);
    } else if (action === 'drag' && isDragging && dragStart) {
      // Update selection range as we drag
      const range = {
        start: dragStart,
        end: position,
      };
      onSelectionRangeChange?.(range);
    } else if (action === 'end') {
      setIsDragging(false);
      setDragStart(null);
    }
  }, [isDragging, dragStart, onSelectionRangeChange]);

  const handleNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!selectedCell) return;

    const { rowIndex, colIndex } = selectedCell;
    let newRowIndex = rowIndex;
    let newColIndex = colIndex;

    switch (direction) {
      case 'up':
        newRowIndex = Math.max(0, rowIndex - 1);
        break;
      case 'down':
        newRowIndex = Math.min(rows.length - 1, rowIndex + 1);
        break;
      case 'left':
        newColIndex = Math.max(0, colIndex - 1);
        break;
      case 'right':
        newColIndex = Math.min(columns.length - 1, colIndex + 1);
        break;
    }

    setSelectedCell({ rowIndex: newRowIndex, colIndex: newColIndex });
    // Clear selection range when navigating
    onSelectionRangeChange?.(null);
  }, [selectedCell, rows.length, columns.length, onSelectionRangeChange]);

  // Add global mouseup listener to end drag selection
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) {
        handleDragSelect({ rowIndex: 0, colIndex: 0 }, 'end');
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleDragSelect]);

  const handleFillDrag = useCallback((position: CellPosition, action: 'start' | 'drag' | 'end') => {
    if (action === 'start') {
      // Fill starts from the selected cell
      setFillStart(selectedCell);
      setFillEnd(selectedCell); // Start with same position
      fillStartRef.current = selectedCell;
      fillEndRef.current = selectedCell;
      // Clear any selection range when starting fill
      onSelectionRangeChange?.(null);
    } else if (action === 'drag' && fillStartRef.current) {
      // Constrain fill to either vertical OR horizontal (not both)
      // Lock to the axis with greater movement
      const start = fillStartRef.current;
      const rowDiff = Math.abs(position.rowIndex - start.rowIndex);
      const colDiff = Math.abs(position.colIndex - start.colIndex);

      let constrainedPosition: CellPosition;
      if (rowDiff >= colDiff) {
        // Vertical fill - lock to source column
        constrainedPosition = { rowIndex: position.rowIndex, colIndex: start.colIndex };
      } else {
        // Horizontal fill - lock to source row
        constrainedPosition = { rowIndex: start.rowIndex, colIndex: position.colIndex };
      }
      setFillEnd(constrainedPosition);
      fillEndRef.current = constrainedPosition;
    } else if (action === 'end' && fillStartRef.current && fillEndRef.current) {
      // Perform the fill operation using refs for latest values
      const sourceCell = fillStartRef.current;
      const endCell = fillEndRef.current;

      const sourceRow = rows[sourceCell.rowIndex];
      const sourceColumn = columns[sourceCell.colIndex];
      const sourceCellData = getCellValue(sourceRow, sourceColumn.id);

      if (!sourceCellData) {
        setFillStart(null);
        setFillEnd(null);
        fillStartRef.current = null;
        fillEndRef.current = null;
        return;
      }

      // Get the value to copy
      const sourceValue = sourceCellData.value ? JSON.parse(sourceCellData.value) : '';

      // Determine the fill range
      const startRow = Math.min(sourceCell.rowIndex, endCell.rowIndex);
      const endRow = Math.max(sourceCell.rowIndex, endCell.rowIndex);
      const startCol = Math.min(sourceCell.colIndex, endCell.colIndex);
      const endCol = Math.max(sourceCell.colIndex, endCell.colIndex);

      // Fill all cells in the range
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          // Skip the source cell
          if (r === sourceCell.rowIndex && c === sourceCell.colIndex) continue;

          const targetRow = rows[r];
          const targetColumn = columns[c];
          const targetCell = getCellValue(targetRow, targetColumn.id);

          if (targetCell) {
            onCellUpdate(targetCell.id, sourceValue);
          }
        }
      }

      // Reset fill state
      setFillStart(null);
      setFillEnd(null);
      fillStartRef.current = null;
      fillEndRef.current = null;
    }
  }, [selectedCell, rows, columns, getCellValue, onCellUpdate, onSelectionRangeChange]);

  const handleColumnRename = useCallback((columnId: string, name: string) => {
    onColumnUpdate(columnId, name);
  }, [onColumnUpdate]);

  const handleRowRename = useCallback((rowId: string, name: string) => {
    onRowUpdate(rowId, name);
  }, [onRowUpdate]);

  return (
    <div className="flex flex-col h-full">
      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-full border-collapse">
              {/* Header */}
              <thead>
                <tr>
                  {/* Top-left corner cell */}
                  <th className="sticky top-0 left-0 z-20 w-14 px-3 py-3 text-center text-xs font-bold text-slate-700 bg-gradient-to-br from-slate-100 to-slate-50 border-b-2 border-r-2 border-slate-300">
                    #
                  </th>

                  {/* Column Headers */}
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      style={{ minWidth: column.width || 150, maxWidth: column.width || 150 }}
                      className="sticky top-0 z-10 px-4 py-3 text-left text-sm font-bold text-slate-700 bg-gradient-to-br from-slate-100 to-slate-50 border-b-2 border-slate-300 border-l border-slate-200"
                    >
                      <ColumnHeader
                        column={column}
                        isViewOnly={isViewOnly}
                        onRename={handleColumnRename}
                        onDelete={onColumnDelete}
                        onInsertLeft={onInsertColumnLeft}
                        onInsertRight={onInsertColumnRight}
                      />
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={row.id} className="bg-white hover:bg-blue-50/30 transition-colors">
                    {/* Row Header */}
                    <td
                      className="sticky left-0 z-10 text-center text-sm font-semibold text-slate-600 bg-gradient-to-br from-slate-50 to-white border-r-2 border-b border-slate-200"
                      style={{ height: row.height || 40 }}
                    >
                      <RowHeader
                        row={row}
                        rowIndex={rowIndex}
                        isViewOnly={isViewOnly}
                        onRename={handleRowRename}
                        onDelete={onRowDelete}
                        onCommentClick={onCommentClick}
                        onInsertAbove={onInsertRowAbove}
                        onInsertBelow={onInsertRowBelow}
                      />
                    </td>

                    {/* Data Cells */}
                    {columns.map((column, colIndex) => {
                      const cell = getCellValue(row, column.id);
                      const isSelected = selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === colIndex;
                      const isEditing = editingCell === cell?.id;

                      // Check if this cell is in the fill range
                      const isInFillRange = fillStart && fillEnd &&
                        rowIndex >= Math.min(fillStart.rowIndex, fillEnd.rowIndex) &&
                        rowIndex <= Math.max(fillStart.rowIndex, fillEnd.rowIndex) &&
                        colIndex >= Math.min(fillStart.colIndex, fillEnd.colIndex) &&
                        colIndex <= Math.max(fillStart.colIndex, fillEnd.colIndex);

                      // Check if this cell is in the selection range
                      const isInSelectionRange = selectionRange &&
                        rowIndex >= Math.min(selectionRange.start.rowIndex, selectionRange.end.rowIndex) &&
                        rowIndex <= Math.max(selectionRange.start.rowIndex, selectionRange.end.rowIndex) &&
                        colIndex >= Math.min(selectionRange.start.colIndex, selectionRange.end.colIndex) &&
                        colIndex <= Math.max(selectionRange.start.colIndex, selectionRange.end.colIndex);

                      // Check if this cell is copied
                      const isCopied = cell?.id === copiedCellId;

                      return (
                        <td
                          key={`${row.id}-${column.id}`}
                          className={`border-b border-slate-200 border-l border-slate-200 ${
                            isInFillRange ? 'bg-blue-100 ring-1 ring-inset ring-blue-400' : ''
                          } ${
                            isCopied ? 'ring-2 ring-inset ring-dashed ring-blue-500' : ''
                          }`}
                          style={{ height: row.height || 40 }}
                        >
                          <TableCell
                            cell={cell}
                            rowIndex={rowIndex}
                            colIndex={colIndex}
                            isSelected={isSelected}
                            isEditing={isEditing}
                            isViewOnly={isViewOnly}
                            isFormulaMode={isFormulaMode}
                            isInSelectionRange={isInSelectionRange || false}
                            isDragSelecting={isDragging}
                            onSelect={handleCellSelect}
                            onEdit={handleCellEdit}
                            onSave={handleCellSave}
                            onNavigate={handleNavigate}
                            onFillDrag={handleFillDrag}
                            onDragSelect={handleDragSelect}
                            onFormulaSelect={isFormulaMode ? handleFormulaCellSelect : undefined}
                            editingCellValue={isEditing ? editingCellValue : undefined}
                            onValueChange={isEditing ? handleCellValueChange : undefined}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
