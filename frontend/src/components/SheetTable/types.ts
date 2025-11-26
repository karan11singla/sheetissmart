import type { Column, Row, Cell } from '../../types';

export interface CellPosition {
  rowIndex: number;
  colIndex: number;
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
  onCellUpdate: (cellId: string, value: any) => void;
  onColumnUpdate: (columnId: string, name: string) => void;
  onColumnDelete: (columnId: string) => void;
  onRowUpdate: (rowId: string, name?: string) => void;
  onRowDelete: (rowId: string) => void;
  onCommentClick?: (cellId: string) => void;
}

export interface TableCellProps {
  cell: Cell | undefined;
  rowIndex: number;
  colIndex: number;
  isSelected: boolean;
  isEditing: boolean;
  isViewOnly: boolean;
  onSelect: (position: CellPosition) => void;
  onEdit: (cellId: string, initialValue: string) => void;
  onSave: (cellId: string, value: string) => void;
  onNavigate: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onCommentClick?: (cellId: string) => void;
}

export interface ColumnHeaderProps {
  column: Column;
  isViewOnly: boolean;
  onRename: (columnId: string, name: string) => void;
  onDelete: (columnId: string) => void;
}

export interface RowHeaderProps {
  row: Row;
  rowIndex: number;
  isViewOnly: boolean;
  onRename: (rowId: string, name: string) => void;
  onDelete: (rowId: string) => void;
}
