import type { Column, Row, Cell } from '../../types';

export interface CellPosition {
  rowIndex: number;
  colIndex: number;
}

export interface CellRange {
  start: CellPosition;
  end: CellPosition;
}

export interface CellEditState {
  cellId: string;
  value: string;
  editedBy?: string; // User ID for collaboration tracking
  editedAt?: Date;
}

export interface SheetTableProps {
  columns: Column[];
  rows: Row[];
  isViewOnly?: boolean;
  frozenRows?: number;
  frozenColumns?: number;
  zoomLevel?: number;
  showGridlines?: boolean;
  onCellUpdate: (cellId: string, value: any) => void;
  onCellSelect?: (position: CellPosition | null) => void;
  onColumnUpdate: (columnId: string, name: string) => void;
  onColumnDelete: (columnId: string) => void;
  onColumnResize?: (columnId: string, width: number) => void;
  onRowUpdate: (rowId: string, name?: string) => void;
  onRowDelete: (rowId: string) => void;
  onCommentClick?: (rowId: string) => void;
  onInsertRowAbove?: (position: number) => void;
  onInsertRowBelow?: (position: number) => void;
  onInsertColumnLeft?: (position: number) => void;
  onInsertColumnRight?: (position: number) => void;
  copiedCellId?: string | null;
  selectionRange?: CellRange | null;
  onSelectionRangeChange?: (range: CellRange | null) => void;
}

export interface TableCellProps {
  cell: Cell | undefined;
  rowIndex: number;
  colIndex: number;
  isSelected: boolean;
  isEditing: boolean;
  isViewOnly: boolean;
  isFormulaMode?: boolean;
  isInSelectionRange?: boolean;
  isDragSelecting?: boolean;
  onSelect: (position: CellPosition, shiftKey?: boolean) => void;
  onEdit: (cellId: string, initialValue: string, position: CellPosition) => void;
  onSave: (cellId: string, value: string) => void;
  onNavigate: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onFillDrag?: (position: CellPosition, action: 'start' | 'drag' | 'end') => void;
  onFormulaSelect?: (position: CellPosition) => void;
  onDragSelect?: (position: CellPosition, action: 'start' | 'drag' | 'end') => void;
  editingCellValue?: string;
  onValueChange?: (value: string) => void;
}

export interface ColumnHeaderProps {
  column: Column;
  isViewOnly: boolean;
  onRename: (columnId: string, name: string) => void;
  onDelete: (columnId: string) => void;
  onInsertLeft?: (position: number) => void;
  onInsertRight?: (position: number) => void;
  onResize?: (columnId: string, width: number) => void;
}

export interface RowHeaderProps {
  row: Row;
  rowIndex: number;
  isViewOnly: boolean;
  onRename: (rowId: string, name: string) => void;
  onDelete: (rowId: string) => void;
  onCommentClick?: (rowId: string) => void;
  onInsertAbove?: (position: number) => void;
  onInsertBelow?: (position: number) => void;
}
