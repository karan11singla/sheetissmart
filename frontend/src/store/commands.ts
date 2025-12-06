import { Command } from './undoRedoStore';
import { sheetApi } from '../services/api';
import { QueryClient } from '@tanstack/react-query';
import type { UpdateCellInput } from '../types';

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
 * Delete Row Command
 * Handles undo/redo for row deletion
 * Note: Currently undo is not fully supported as we'd need to restore the entire row
 */
export class DeleteRowCommand implements Command {
  description: string;

  constructor(
    private sheetId: string,
    private rowId: string,
    private queryClient: QueryClient
  ) {
    this.description = 'Delete row';
  }

  async execute(): Promise<void> {
    await sheetApi.deleteRow(this.sheetId, this.rowId);
    this.queryClient.invalidateQueries({ queryKey: ['sheets', this.sheetId] });
  }

  async undo(): Promise<void> {
    // TODO: To properly implement undo for deletion, we would need to:
    // 1. Store the entire row data before deletion
    // 2. Recreate the row with the same data at the same position
    // For now, we'll throw an error to indicate this isn't supported
    throw new Error('Undo for row deletion is not yet supported');
  }
}

/**
 * Delete Column Command
 * Handles undo/redo for column deletion
 * Note: Currently undo is not fully supported as we'd need to restore the entire column
 */
export class DeleteColumnCommand implements Command {
  description: string;

  constructor(
    private sheetId: string,
    private columnId: string,
    private queryClient: QueryClient
  ) {
    this.description = 'Delete column';
  }

  async execute(): Promise<void> {
    await sheetApi.deleteColumn(this.sheetId, this.columnId);
    this.queryClient.invalidateQueries({ queryKey: ['sheets', this.sheetId] });
  }

  async undo(): Promise<void> {
    // TODO: To properly implement undo for deletion, we would need to:
    // 1. Store the entire column data before deletion
    // 2. Recreate the column with the same data at the same position
    // For now, we'll throw an error to indicate this isn't supported
    throw new Error('Undo for column deletion is not yet supported');
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
