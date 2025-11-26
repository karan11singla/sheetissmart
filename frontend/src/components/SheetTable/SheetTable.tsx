import { useState, useCallback } from 'react';
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
  onColumnUpdate,
  onColumnDelete,
  onRowUpdate,
  onRowDelete,
  onCommentClick,
}: SheetTableProps) {
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);

  const getCellValue = useCallback((row: typeof rows[0], columnId: string): Cell | undefined => {
    return row.cells?.find((c) => c.columnId === columnId);
  }, []);

  const handleCellSelect = useCallback((position: CellPosition) => {
    setSelectedCell(position);
  }, []);

  const handleCellEdit = useCallback((cellId: string) => {
    setEditingCell(cellId);
  }, []);

  const handleCellSave = useCallback((cellId: string, value: string) => {
    onCellUpdate(cellId, value);
    setEditingCell(null);
  }, [onCellUpdate]);

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
  }, [selectedCell, rows.length, columns.length]);

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
                      />
                    </td>

                    {/* Data Cells */}
                    {columns.map((column, colIndex) => {
                      const cell = getCellValue(row, column.id);
                      const isSelected = selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === colIndex;
                      const isEditing = editingCell === cell?.id;

                      return (
                        <td
                          key={`${row.id}-${column.id}`}
                          className="border-b border-slate-200 border-l border-slate-200"
                          style={{ height: row.height || 40 }}
                        >
                          <TableCell
                            cell={cell}
                            rowIndex={rowIndex}
                            colIndex={colIndex}
                            isSelected={isSelected}
                            isEditing={isEditing}
                            isViewOnly={isViewOnly}
                            onSelect={handleCellSelect}
                            onEdit={handleCellEdit}
                            onSave={handleCellSave}
                            onNavigate={handleNavigate}
                            onCommentClick={onCommentClick}
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
