import { Command } from './undoRedoStore';
import { sheetApi } from '../services/api';
import { QueryClient } from '@tanstack/react-query';
import type { UpdateCellInput, Row, Column, ColumnType } from '../types';

/**
 * Update Cell Command
 * Handles undo/redo for cell value changes and formatting
 */
export class UpdateCellCommand implements Command {
  description: string;

  constructor(
    private sheetId: string,
    private cellId: string,
    private oldValue: any,
    private newValue: any,
    private queryClient: QueryClient,
    private formatting?: Omit<UpdateCellInput, 'value'>
  ) {
    this.description = `Update cell value from "${oldValue || ''}" to "${newValue || ''}"`;
  }

  async execute(): Promise<void> {
    await sheetApi.updateCell(this.sheetId, this.cellId, {
      value: this.newValue,
      ...this.formatting
    });
    // Invalidate queries to refresh the UI
    this.queryClient.invalidateQueries({ queryKey: ['sheets', this.sheetId] });
  }

  async undo(): Promise<void> {
    await sheetApi.updateCell(this.sheetId, this.cellId, { value: this.oldValue });
    // Invalidate queries to refresh the UI
    this.queryClient.invalidateQueries({ queryKey: ['sheets', this.sheetId] });
  }
}

/**
 * Add Row Command
 * Handles undo/redo for adding a new row
 */
export class AddRowCommand implements Command {
  description: string;
  private createdRowId: string | null = null;

  constructor(
    private sheetId: string,
    private position: number,
    private queryClient: QueryClient
  ) {
    this.description = `Add row at position ${position + 1}`;
  }

  async execute(): Promise<void> {
    const row = await sheetApi.createRow(this.sheetId, { position: this.position });
    this.createdRowId = row.id;
    this.queryClient.invalidateQueries({ queryKey: ['sheets', this.sheetId] });
  }

  async undo(): Promise<void> {
    if (this.createdRowId) {
      await sheetApi.deleteRow(this.sheetId, this.createdRowId);
      this.queryClient.invalidateQueries({ queryKey: ['sheets', this.sheetId] });
    }
  }
}

/**
 * Delete Row Command
 * Handles undo/redo for row deletion with full data restoration
 */
export class DeleteRowCommand implements Command {
  description: string;
  private deletedRow: Row;

  constructor(
    private sheetId: string,
    private rowId: string,
    rowData: Row,
    private queryClient: QueryClient
  ) {
    this.description = `Delete row ${rowData.position + 1}`;
    // Store the row data before deletion
    this.deletedRow = rowData;
  }

  async execute(): Promise<void> {
    await sheetApi.deleteRow(this.sheetId, this.rowId);
    this.queryClient.invalidateQueries({ queryKey: ['sheets', this.sheetId] });
  }

  async undo(): Promise<void> {
    // Recreate the row at the same position
    await sheetApi.createRow(this.sheetId, {
      position: this.deletedRow.position,
      height: this.deletedRow.height,
    });

    // Note: Cell values cannot be restored with original cell IDs since new cells are created
    // The backend would need to support restoring cells with specific IDs for full restoration
    this.queryClient.invalidateQueries({ queryKey: ['sheets', this.sheetId] });
  }
}

/**
 * Add Column Command
 * Handles undo/redo for adding a new column
 */
export class AddColumnCommand implements Command {
  description: string;
  private createdColumnId: string | null = null;

  constructor(
    private sheetId: string,
    private name: string,
    private position: number,
    private queryClient: QueryClient,
    private type: ColumnType = 'TEXT' as ColumnType
  ) {
    this.description = `Add column "${name}"`;
  }

  async execute(): Promise<void> {
    const column = await sheetApi.createColumn(this.sheetId, {
      name: this.name,
      position: this.position,
      type: this.type,
    });
    this.createdColumnId = column.id;
    this.queryClient.invalidateQueries({ queryKey: ['sheets', this.sheetId] });
  }

  async undo(): Promise<void> {
    if (this.createdColumnId) {
      await sheetApi.deleteColumn(this.sheetId, this.createdColumnId);
      this.queryClient.invalidateQueries({ queryKey: ['sheets', this.sheetId] });
    }
  }
}

/**
 * Delete Column Command
 * Handles undo/redo for column deletion with column structure restoration
 */
export class DeleteColumnCommand implements Command {
  description: string;
  private deletedColumn: Column;

  constructor(
    private sheetId: string,
    private columnId: string,
    columnData: Column,
    _allRows: Row[],
    private queryClient: QueryClient
  ) {
    this.description = `Delete column "${columnData.name}"`;
    // Store the column data before deletion
    this.deletedColumn = columnData;
  }

  async execute(): Promise<void> {
    await sheetApi.deleteColumn(this.sheetId, this.columnId);
    this.queryClient.invalidateQueries({ queryKey: ['sheets', this.sheetId] });
  }

  async undo(): Promise<void> {
    // Recreate the column at the same position
    await sheetApi.createColumn(this.sheetId, {
      name: this.deletedColumn.name,
      position: this.deletedColumn.position,
      type: this.deletedColumn.type,
      width: this.deletedColumn.width,
    });

    // Note: Cell values cannot be restored since new cells are created with new IDs
    this.queryClient.invalidateQueries({ queryKey: ['sheets', this.sheetId] });
  }
}

/**
 * Update Column Command
 * Handles undo/redo for column updates (width, name changes)
 */
export class UpdateColumnCommand implements Command {
  description: string;

  constructor(
    private sheetId: string,
    private columnId: string,
    private oldData: { width?: number; name?: string },
    private newData: { width?: number; name?: string },
    private queryClient: QueryClient
  ) {
    const changes = [];
    if (newData.width !== undefined) changes.push(`width: ${oldData.width} → ${newData.width}`);
    if (newData.name !== undefined) changes.push(`name: "${oldData.name}" → "${newData.name}"`);
    this.description = `Update column (${changes.join(', ')})`;
  }

  async execute(): Promise<void> {
    await sheetApi.updateColumn(this.sheetId, this.columnId, this.newData);
    this.queryClient.invalidateQueries({ queryKey: ['sheets', this.sheetId] });
  }

  async undo(): Promise<void> {
    await sheetApi.updateColumn(this.sheetId, this.columnId, this.oldData);
    this.queryClient.invalidateQueries({ queryKey: ['sheets', this.sheetId] });
  }
}

/**
 * Update Cell Format Command
 * Handles undo/redo for cell formatting changes (bold, italic, color, number format, etc.)
 */
export class UpdateCellFormatCommand implements Command {
  description: string;

  constructor(
    private sheetId: string,
    private cellId: string,
    private cellValue: any,
    private oldFormat: UpdateCellInput,
    private newFormat: UpdateCellInput,
    private queryClient: QueryClient,
    private onLocalUpdate?: (cellId: string, format: UpdateCellInput) => void
  ) {
    // Build description from format changes
    const changes: string[] = [];
    if (newFormat.bold !== oldFormat.bold) changes.push(`bold: ${oldFormat.bold || false} → ${newFormat.bold}`);
    if (newFormat.italic !== oldFormat.italic) changes.push(`italic: ${oldFormat.italic || false} → ${newFormat.italic}`);
    if (newFormat.underline !== oldFormat.underline) changes.push(`underline: ${oldFormat.underline || false} → ${newFormat.underline}`);
    if (newFormat.numberFormat !== oldFormat.numberFormat) changes.push(`format: ${oldFormat.numberFormat || 'general'} → ${newFormat.numberFormat}`);
    if (newFormat.textColor !== oldFormat.textColor) changes.push(`color changed`);
    if (newFormat.backgroundColor !== oldFormat.backgroundColor) changes.push(`bg color changed`);
    this.description = changes.length > 0 ? `Format cell (${changes.join(', ')})` : 'Format cell';
  }

  async execute(): Promise<void> {
    await sheetApi.updateCell(this.sheetId, this.cellId, {
      value: this.cellValue,
      ...this.newFormat
    });
    this.onLocalUpdate?.(this.cellId, this.newFormat);
    this.queryClient.invalidateQueries({ queryKey: ['sheets', this.sheetId] });
  }

  async undo(): Promise<void> {
    await sheetApi.updateCell(this.sheetId, this.cellId, {
      value: this.cellValue,
      ...this.oldFormat
    });
    this.onLocalUpdate?.(this.cellId, this.oldFormat);
    this.queryClient.invalidateQueries({ queryKey: ['sheets', this.sheetId] });
  }
}

/**
 * Update Row Command
 * Handles undo/redo for row updates (height, name changes)
 */
export class UpdateRowCommand implements Command {
  description: string;

  constructor(
    private sheetId: string,
    private rowId: string,
    private oldData: { height?: number; name?: string },
    private newData: { height?: number; name?: string },
    private queryClient: QueryClient
  ) {
    const changes = [];
    if (newData.height !== undefined) changes.push(`height: ${oldData.height} → ${newData.height}`);
    if (newData.name !== undefined) changes.push(`name: "${oldData.name}" → "${newData.name}"`);
    this.description = `Update row (${changes.join(', ')})`;
  }

  async execute(): Promise<void> {
    await sheetApi.updateRow(this.sheetId, this.rowId, this.newData);
    this.queryClient.invalidateQueries({ queryKey: ['sheets', this.sheetId] });
  }

  async undo(): Promise<void> {
    await sheetApi.updateRow(this.sheetId, this.rowId, this.oldData);
    this.queryClient.invalidateQueries({ queryKey: ['sheets', this.sheetId] });
  }
}
