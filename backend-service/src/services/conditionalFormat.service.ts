import prisma from '../config/database';
import type { FormatRuleType } from '@prisma/client';

export interface ConditionalFormatRule {
  id?: string;
  sheetId: string;
  name: string;
  ruleType: FormatRuleType;
  condition: string; // JSON string
  backgroundColor?: string | null;
  textColor?: string | null;
  bold?: boolean;
  italic?: boolean;
  priority?: number;
  range: string;
}

export interface CellFormatStyle {
  backgroundColor?: string;
  textColor?: string;
  bold?: boolean;
  italic?: boolean;
}

// Create a new conditional formatting rule
export async function createConditionalFormat(rule: ConditionalFormatRule) {
  return await prisma.conditionalFormat.create({
    data: {
      sheetId: rule.sheetId,
      name: rule.name,
      ruleType: rule.ruleType,
      condition: rule.condition,
      backgroundColor: rule.backgroundColor,
      textColor: rule.textColor,
      bold: rule.bold || false,
      italic: rule.italic || false,
      priority: rule.priority || 0,
      range: rule.range,
    },
  });
}

// Get all conditional formatting rules for a sheet
export async function getConditionalFormats(sheetId: string) {
  return await prisma.conditionalFormat.findMany({
    where: { sheetId },
    orderBy: { priority: 'desc' }, // Higher priority first
  });
}

// Update a conditional formatting rule
export async function updateConditionalFormat(id: string, data: Partial<ConditionalFormatRule>) {
  return await prisma.conditionalFormat.update({
    where: { id },
    data: {
      name: data.name,
      ruleType: data.ruleType,
      condition: data.condition,
      backgroundColor: data.backgroundColor,
      textColor: data.textColor,
      bold: data.bold,
      italic: data.italic,
      priority: data.priority,
      range: data.range,
    },
  });
}

// Delete a conditional formatting rule
export async function deleteConditionalFormat(id: string) {
  return await prisma.conditionalFormat.delete({
    where: { id },
  });
}

// Parse cell reference (e.g., "A1" -> {col: 0, row: 0})
function parseCellRef(ref: string): { col: number; row: number } | null {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;

  const colLetters = match[1];
  const rowNum = parseInt(match[2]) - 1; // 0-based

  // Convert column letters to index (A=0, B=1, etc.)
  let col = 0;
  for (let i = 0; i < colLetters.length; i++) {
    col = col * 26 + (colLetters.charCodeAt(i) - 64);
  }
  col -= 1; // Convert to 0-based

  return { col, row: rowNum };
}

// Check if a cell is in a range (e.g., "A1:B10")
function cellInRange(cellRef: string, range: string): boolean {
  if (range.includes(':')) {
    const [start, end] = range.split(':');
    const cell = parseCellRef(cellRef);
    const startCell = parseCellRef(start);
    const endCell = parseCellRef(end);

    if (!cell || !startCell || !endCell) return false;

    return (
      cell.row >= startCell.row &&
      cell.row <= endCell.row &&
      cell.col >= startCell.col &&
      cell.col <= endCell.col
    );
  } else {
    // Single cell reference
    return cellRef === range;
  }
}

// Evaluate a conditional formatting rule for a specific cell
function evaluateRule(
  rule: ConditionalFormatRule,
  cellValue: any,
  cellRef: string,
  allCellsInRange?: Map<string, any>
): boolean {
  try {
    const condition = JSON.parse(rule.condition);

    switch (rule.ruleType) {
      case 'CELL_VALUE': {
        const { operator, value } = condition;
        const numValue = parseFloat(cellValue);
        const compareValue = parseFloat(value);

        if (isNaN(numValue)) return false;

        switch (operator) {
          case '>':
            return numValue > compareValue;
          case '<':
            return numValue < compareValue;
          case '>=':
            return numValue >= compareValue;
          case '<=':
            return numValue <= compareValue;
          case '=':
          case '==':
            return numValue === compareValue;
          case '!=':
            return numValue !== compareValue;
          case 'between': {
            const { min, max } = condition;
            return numValue >= parseFloat(min) && numValue <= parseFloat(max);
          }
          default:
            return false;
        }
      }

      case 'TEXT_CONTAINS': {
        const { text, caseSensitive } = condition;
        const cellText = String(cellValue);
        const searchText = String(text);

        if (caseSensitive) {
          return cellText.includes(searchText);
        } else {
          return cellText.toLowerCase().includes(searchText.toLowerCase());
        }
      }

      case 'DUPLICATE_VALUES': {
        if (!allCellsInRange) return false;
        let count = 0;
        for (const [, value] of allCellsInRange) {
          if (value === cellValue) count++;
        }
        return count > 1;
      }

      case 'UNIQUE_VALUES': {
        if (!allCellsInRange) return false;
        let count = 0;
        for (const [, value] of allCellsInRange) {
          if (value === cellValue) count++;
        }
        return count === 1;
      }

      case 'ABOVE_BELOW_AVERAGE': {
        if (!allCellsInRange) return false;
        const { type } = condition; // 'above' or 'below'
        const values = Array.from(allCellsInRange.values())
          .map((v) => parseFloat(v))
          .filter((v) => !isNaN(v));

        if (values.length === 0) return false;

        const average = values.reduce((sum, v) => sum + v, 0) / values.length;
        const numValue = parseFloat(cellValue);

        if (isNaN(numValue)) return false;

        return type === 'above' ? numValue > average : numValue < average;
      }

      case 'TOP_BOTTOM': {
        if (!allCellsInRange) return false;
        const { type, count } = condition; // type: 'top' or 'bottom', count: number
        const values = Array.from(allCellsInRange.values())
          .map((v) => parseFloat(v))
          .filter((v) => !isNaN(v))
          .sort((a, b) => (type === 'top' ? b - a : a - b));

        const numValue = parseFloat(cellValue);
        if (isNaN(numValue)) return false;

        return values.slice(0, count).includes(numValue);
      }

      default:
        return false;
    }
  } catch (error) {
    console.error('Error evaluating conditional format rule:', error);
    return false;
  }
}

// Get formatting styles for a cell based on all applicable rules
export async function getCellFormatting(
  sheetId: string,
  cellRef: string,
  cellValue: any
): Promise<CellFormatStyle | null> {
  const rules = await getConditionalFormats(sheetId);

  // Filter rules that apply to this cell
  const applicableRules = rules.filter((rule) => cellInRange(cellRef, rule.range));

  if (applicableRules.length === 0) return null;

  // For rules that need all cells in range (like duplicates, average, etc.)
  // we'll need to fetch the cells - for now, we'll just evaluate simple rules
  for (const rule of applicableRules) {
    if (evaluateRule(rule, cellValue, cellRef)) {
      return {
        backgroundColor: rule.backgroundColor || undefined,
        textColor: rule.textColor || undefined,
        bold: rule.bold,
        italic: rule.italic,
      };
    }
  }

  return null;
}

// Get all cell formattings for a sheet (bulk operation)
export async function getSheetCellFormattings(
  sheetId: string,
  cells: Map<string, any>
): Promise<Map<string, CellFormatStyle>> {
  const rules = await getConditionalFormats(sheetId);
  const formattings = new Map<string, CellFormatStyle>();

  for (const [cellRef, cellValue] of cells) {
    // Filter rules that apply to this cell
    const applicableRules = rules.filter((rule) => cellInRange(cellRef, rule.range));

    for (const rule of applicableRules) {
      // For rules that need all cells, get cells in range
      let allCellsInRange: Map<string, any> | undefined;
      if (
        ['DUPLICATE_VALUES', 'UNIQUE_VALUES', 'ABOVE_BELOW_AVERAGE', 'TOP_BOTTOM'].includes(
          rule.ruleType
        )
      ) {
        allCellsInRange = new Map();
        for (const [ref, value] of cells) {
          if (cellInRange(ref, rule.range)) {
            allCellsInRange.set(ref, value);
          }
        }
      }

      if (evaluateRule(rule, cellValue, cellRef, allCellsInRange)) {
        formattings.set(cellRef, {
          backgroundColor: rule.backgroundColor || undefined,
          textColor: rule.textColor || undefined,
          bold: rule.bold,
          italic: rule.italic,
        });
        break; // First matching rule wins (highest priority)
      }
    }
  }

  return formattings;
}
