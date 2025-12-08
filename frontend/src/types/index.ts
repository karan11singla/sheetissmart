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
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  textAlign?: string;
  verticalAlign?: string;
  wrapText?: boolean;
  hasBorder?: boolean;
  borderTop?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
  borderRight?: boolean;
  textRotation?: number;
  numberFormat?: string;
  decimalPlaces?: number;
  // Cell merge
  mergeRowSpan?: number;
  mergeColSpan?: number;
  mergedIntoId?: string;
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
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  textAlign?: string;
  verticalAlign?: string;
  wrapText?: boolean;
  hasBorder?: boolean;
  borderTop?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
  borderRight?: boolean;
  textRotation?: number;
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

export type NotificationType = 'MENTION' | 'COMMENT' | 'SHARE';

export interface Notification {
  id: string;
  userId: string;
  fromUserId: string;
  type: NotificationType;
  isRead: boolean;
  sheetId?: string;
  rowId?: string;
  commentId?: string;
  createdAt: string;
  updatedAt: string;
  fromUser: {
    id: string;
    name: string;
    email: string;
  };
  comment?: {
    id: string;
    content: string;
    row?: {
      id: string;
      position: number;
      sheet?: {
        id: string;
        name: string;
      };
    };
  };
}

// Conditional Formatting Types
export type FormatRuleType =
  | 'CELL_VALUE'
  | 'TEXT_CONTAINS'
  | 'DATE_IS'
  | 'DUPLICATE_VALUES'
  | 'UNIQUE_VALUES'
  | 'TOP_BOTTOM'
  | 'ABOVE_BELOW_AVERAGE'
  | 'FORMULA_CUSTOM';

export interface ConditionalFormat {
  id: string;
  sheetId: string;
  name: string;
  ruleType: FormatRuleType;
  condition: string; // JSON string
  backgroundColor?: string;
  textColor?: string;
  bold: boolean;
  italic: boolean;
  priority: number;
  range: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConditionalFormatInput {
  name: string;
  ruleType: FormatRuleType;
  condition: string;
  backgroundColor?: string;
  textColor?: string;
  bold?: boolean;
  italic?: boolean;
  priority?: number;
  range: string;
}

export interface UpdateConditionalFormatInput {
  name?: string;
  ruleType?: FormatRuleType;
  condition?: string;
  backgroundColor?: string;
  textColor?: string;
  bold?: boolean;
  italic?: boolean;
  priority?: number;
  range?: string;
}

// Chart Types
export type ChartType = 'BAR' | 'LINE' | 'PIE' | 'AREA' | 'SCATTER' | 'DOUGHNUT' | 'COLUMN';

export interface Chart {
  id: string;
  sheetId: string;
  name: string;
  type: ChartType;
  dataRange: string;
  labelRange?: string;
  config: string; // JSON string
  position: string; // JSON string: {x, y, width, height}
  createdAt: string;
  updatedAt: string;
}

export interface ChartConfig {
  title?: string;
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  colors?: string[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  showGrid?: boolean;
  stacked?: boolean;
}

export interface ChartPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CreateChartInput {
  name: string;
  type: ChartType;
  dataRange: string;
  labelRange?: string;
  config: ChartConfig;
  position: ChartPosition;
}

export interface UpdateChartInput {
  name?: string;
  type?: ChartType;
  dataRange?: string;
  labelRange?: string;
  config?: ChartConfig;
  position?: ChartPosition;
}

// Data Validation Types
export type ValidationType = 'LIST' | 'NUMBER' | 'TEXT_LENGTH' | 'DATE' | 'CUSTOM_FORMULA';

export interface DataValidation {
  id: string;
  sheetId: string;
  range: string;
  type: ValidationType;
  criteria: string; // JSON string
  allowBlank: boolean;
  showDropdown: boolean;
  errorTitle?: string;
  errorMessage?: string;
  inputTitle?: string;
  inputMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListValidationCriteria {
  values: string[];
}

export interface NumberValidationCriteria {
  min?: number;
  max?: number;
  integer?: boolean;
}

export interface TextLengthValidationCriteria {
  min?: number;
  max?: number;
}

export interface DateValidationCriteria {
  minDate?: string;
  maxDate?: string;
}

export interface CreateDataValidationInput {
  range: string;
  type: ValidationType;
  criteria: ListValidationCriteria | NumberValidationCriteria | TextLengthValidationCriteria | DateValidationCriteria;
  allowBlank?: boolean;
  showDropdown?: boolean;
  errorTitle?: string;
  errorMessage?: string;
  inputTitle?: string;
  inputMessage?: string;
}

export interface UpdateDataValidationInput {
  range?: string;
  type?: ValidationType;
  criteria?: ListValidationCriteria | NumberValidationCriteria | TextLengthValidationCriteria | DateValidationCriteria;
  allowBlank?: boolean;
  showDropdown?: boolean;
  errorTitle?: string;
  errorMessage?: string;
  inputTitle?: string;
  inputMessage?: string;
}
