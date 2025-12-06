export interface Sheet {
  id: string;
  name: string;
  description?: string;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
  columns?: Column[];
  rows?: Row[];
  user?: {
    id: string;
    name: string;
    email: string;
  };
  _count?: {
    rows: number;
    columns: number;
  };
}

export interface Column {
  id: string;
  sheetId: string;
  name: string;
  type: ColumnType;
  position: number;
  width?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Row {
  id: string;
  sheetId: string;
  name?: string;
  position: number;
  height?: number;
  cells?: Cell[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    comments: number;
  };
}

export interface Cell {
  id: string;
  sheetId: string;
  rowId: string;
  columnId: string;
  value?: string;
  formula?: string;
  computedValue?: string | number;
  // Cell formatting
  textColor?: string;
  backgroundColor?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textAlign?: string;
  hasBorder?: boolean;
  numberFormat?: string;
  decimalPlaces?: number;
  createdAt: string;
  updatedAt: string;
  column?: Column;
}

export enum ColumnType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  DROPDOWN = 'DROPDOWN',
  CHECKBOX = 'CHECKBOX',
  FORMULA = 'FORMULA',
}

export interface CreateSheetInput {
  name: string;
  description?: string;
}

export interface UpdateSheetInput {
  name?: string;
  description?: string;
}

export interface CreateColumnInput {
  name: string;
  type?: ColumnType;
  position: number;
  width?: number;
}

export interface CreateRowInput {
  position: number;
  height?: number;
}

export interface UpdateCellInput {
  value?: any;
  textColor?: string;
  backgroundColor?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textAlign?: string;
  hasBorder?: boolean;
  numberFormat?: string;
  decimalPlaces?: number;
}

export interface RowComment {
  id: string;
  rowId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateCommentInput {
  content: string;
}
