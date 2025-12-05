import prisma from '../config/database';
import { getStockPrice } from './stock.service';

// Formula engine for spreadsheet calculations
export class FormulaEngine {
  // Parse cell reference (e.g., "A1" -> {col: 0, row: 0})
  private static parseCellRef(ref: string): { columnIndex: number; rowIndex: number } | null {
    const match = ref.match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;

    const col = match[1];
    const row = parseInt(match[2]) - 1; // Convert to 0-based

    // Convert column letters to index (A=0, B=1, ..., Z=25, AA=26, etc.)
    let columnIndex = 0;
    for (let i = 0; i < col.length; i++) {
      columnIndex = columnIndex * 26 + (col.charCodeAt(i) - 64);
    }
    columnIndex -= 1; // Convert to 0-based

    return { columnIndex, rowIndex: row };
  }

  // Get cell value by reference
  private static async getCellValue(
    sheetId: string,
    columnIndex: number,
    rowIndex: number
  ): Promise<number | null> {
    // Get columns and rows to map indices to IDs
    const [columns, rows] = await Promise.all([
      prisma.column.findMany({
        where: { sheetId },
        orderBy: { position: 'asc' },
      }),
      prisma.row.findMany({
        where: { sheetId },
        orderBy: { position: 'asc' },
      }),
    ]);

    const column = columns[columnIndex];
    const row = rows[rowIndex];

    if (!column || !row) return null;

    // Get cell
    const cell = await prisma.cell.findFirst({
      where: {
        sheetId,
        columnId: column.id,
        rowId: row.id,
      },
    });

    if (!cell || !cell.value) return null;

    // Parse value
    try {
      const value = JSON.parse(cell.value);
      // If it's a formula, we need to evaluate it (prevent circular refs for now)
      if (typeof value === 'string' && value.startsWith('=')) {
        return null; // Don't evaluate nested formulas for now
      }
      return parseFloat(value);
    } catch {
      return null;
    }
  }

  // Get range of values (e.g., "A1:A10")
  private static async getRangeValues(
    sheetId: string,
    startRef: string,
    endRef: string
  ): Promise<number[]> {
    const start = this.parseCellRef(startRef);
    const end = this.parseCellRef(endRef);

    if (!start || !end) return [];

    const values: number[] = [];

    for (let row = start.rowIndex; row <= end.rowIndex; row++) {
      for (let col = start.columnIndex; col <= end.columnIndex; col++) {
        const value = await this.getCellValue(sheetId, col, row);
        if (value !== null) {
          values.push(value);
        }
      }
    }

    return values;
  }

  // Get values from comma-separated references or ranges (e.g., "A1,B2,C1:C5")
  private static async getValuesFromArgs(
    sheetId: string,
    args: string
  ): Promise<number[]> {
    const values: number[] = [];

    // Split by commas (but not commas inside parentheses)
    const parts = args.split(',').map(s => s.trim());

    for (const part of parts) {
      // Check if it's a range (A1:A10)
      if (part.includes(':')) {
        const [start, end] = part.split(':').map(s => s.trim());
        const rangeValues = await this.getRangeValues(sheetId, start, end);
        values.push(...rangeValues);
      } else {
        // Single cell reference
        const parsed = this.parseCellRef(part);
        if (parsed) {
          const value = await this.getCellValue(sheetId, parsed.columnIndex, parsed.rowIndex);
          if (value !== null) {
            values.push(value);
          }
        }
      }
    }

    return values;
  }

  // Evaluate a formula
  public static async evaluate(sheetId: string, formula: string): Promise<number | string | null> {
    // Remove leading =
    formula = formula.trim();
    if (formula.startsWith('=')) {
      formula = formula.substring(1);
    }

    try {
      // Handle stock ticker - formulas starting with $ (e.g., $AAPL, $GOOGL)
      const stockMatch = formula.match(/^\$([A-Z]+)$/);
      if (stockMatch) {
        const symbol = stockMatch[1];
        try {
          const price = await getStockPrice(symbol);
          return price;
        } catch (error) {
          console.error(`Stock ticker error for ${symbol}:`, error);
          return '#ERROR!';
        }
      }

      // Handle SUM function - supports ranges (A1:A10) and comma-separated (A1,B2,C3)
      const sumMatch = formula.match(/^SUM\((.+)\)$/i);
      if (sumMatch) {
        const values = await this.getValuesFromArgs(sheetId, sumMatch[1]);
        return values.reduce((sum, val) => sum + val, 0);
      }

      // Handle AVERAGE/AVG function
      const avgMatch = formula.match(/^(AVERAGE|AVG)\((.+)\)$/i);
      if (avgMatch) {
        const values = await this.getValuesFromArgs(sheetId, avgMatch[2]);
        return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
      }

      // Handle COUNT function
      const countMatch = formula.match(/^COUNT\((.+)\)$/i);
      if (countMatch) {
        const values = await this.getValuesFromArgs(sheetId, countMatch[1]);
        return values.length;
      }

      // Handle MIN function
      const minMatch = formula.match(/^MIN\((.+)\)$/i);
      if (minMatch) {
        const values = await this.getValuesFromArgs(sheetId, minMatch[1]);
        return values.length > 0 ? Math.min(...values) : 0;
      }

      // Handle MAX function
      const maxMatch = formula.match(/^MAX\((.+)\)$/i);
      if (maxMatch) {
        const values = await this.getValuesFromArgs(sheetId, maxMatch[1]);
        return values.length > 0 ? Math.max(...values) : 0;
      }

      // Handle PRODUCT function (multiply all values)
      const productMatch = formula.match(/^PRODUCT\((.+)\)$/i);
      if (productMatch) {
        const values = await this.getValuesFromArgs(sheetId, productMatch[1]);
        return values.length > 0 ? values.reduce((product, val) => product * val, 1) : 0;
      }

      // Handle CONCAT function (concatenate text)
      const concatMatch = formula.match(/^CONCAT\((.+)\)$/i);
      if (concatMatch) {
        const args = concatMatch[1].split(',').map(s => s.trim());
        const parts: string[] = [];
        for (const arg of args) {
          // Check if it's a cell reference
          const cellMatch = arg.match(/^([A-Z]+\d+)$/);
          if (cellMatch) {
            const parsed = this.parseCellRef(cellMatch[1]);
            if (parsed) {
              const value = await this.getCellValue(sheetId, parsed.columnIndex, parsed.rowIndex);
              parts.push(value !== null ? value.toString() : '');
            }
          } else {
            // It's a string literal - remove quotes if present
            parts.push(arg.replace(/^["']|["']$/g, ''));
          }
        }
        return parts.join('');
      }

      // Handle IF function - IF(condition, true_value, false_value)
      // Simple format: IF(A1>10, "Yes", "No") or IF(A1>B1, A1, B1)
      const ifMatch = formula.match(/^IF\((.+),(.+),(.+)\)$/i);
      if (ifMatch) {
        let condition = ifMatch[1].trim();
        const trueVal = ifMatch[2].trim();
        const falseVal = ifMatch[3].trim();

        // Replace cell references in condition with values
        const cellRefs = condition.match(/[A-Z]+\d+/g);
        if (cellRefs) {
          for (const ref of cellRefs) {
            const parsed = this.parseCellRef(ref);
            if (parsed) {
              const value = await this.getCellValue(sheetId, parsed.columnIndex, parsed.rowIndex);
              condition = condition.replace(ref, value !== null ? value.toString() : '0');
            }
          }
        }

        // Evaluate condition (simple comparison operators)
        let conditionResult = false;
        try {
          // This is a simple eval for the condition - only allows comparisons
          if (/^[\d\s+\-*/(). <>!=]+$/.test(condition)) {
            conditionResult = new Function('return ' + condition)();
          }
        } catch {
          conditionResult = false;
        }

        // Get the true or false value
        const resultVal = conditionResult ? trueVal : falseVal;

        // Check if it's a cell reference
        const cellMatch = resultVal.match(/^([A-Z]+\d+)$/);
        if (cellMatch) {
          const parsed = this.parseCellRef(cellMatch[1]);
          if (parsed) {
            const value = await this.getCellValue(sheetId, parsed.columnIndex, parsed.rowIndex);
            return value !== null ? value : 0;
          }
        }

        // Otherwise return the literal value (remove quotes if present)
        return resultVal.replace(/^["']|["']$/g, '');
      }

      // Handle basic arithmetic with cell references
      // Replace cell references with values
      let expression = formula;
      const cellRefs = formula.match(/[A-Z]+\d+/g);

      if (cellRefs) {
        for (const ref of cellRefs) {
          const parsed = this.parseCellRef(ref);
          if (parsed) {
            const value = await this.getCellValue(sheetId, parsed.columnIndex, parsed.rowIndex);
            expression = expression.replace(ref, value !== null ? value.toString() : '0');
          }
        }
      }

      // Evaluate the expression (basic math only)
      // This is a simple eval alternative that only supports basic math
      const result = this.evaluateMathExpression(expression);
      return result;
    } catch (error) {
      console.error('Formula evaluation error:', error);
      return null;
    }
  }

  // Safe math expression evaluator
  private static evaluateMathExpression(expr: string): number | null {
    try {
      // Remove all spaces
      expr = expr.replace(/\s/g, '');

      // Validate that expression only contains numbers and operators
      if (!/^[\d+\-*/(). ]+$/.test(expr)) {
        return null;
      }

      // Use Function constructor instead of eval for safety
      const result = new Function('return ' + expr)();
      return typeof result === 'number' && !isNaN(result) ? result : null;
    } catch {
      return null;
    }
  }
}

// Update cell value with formula evaluation
export async function updateCellWithFormula(
  sheetId: string,
  cellId: string,
  value: string
): Promise<{ value: string; computedValue?: number | string | null }> {
  const isFormula = value.trim().startsWith('=');

  if (isFormula) {
    const computedValue = await FormulaEngine.evaluate(sheetId, value);
    return {
      value, // Store the formula
      computedValue,
    };
  }

  return { value };
}
