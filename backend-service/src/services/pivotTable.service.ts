import prisma from '../config/database';
import type { Column, Row, Cell } from '@prisma/client';

interface PivotTableInput {
  sheetId: string;
  name: string;
  sourceRange: string;
  rowFields: string[];
  columnFields?: string[];
  valueFields: { column: string; aggregation: 'SUM' | 'COUNT' | 'AVERAGE' | 'MIN' | 'MAX' | 'COUNT_DISTINCT' }[];
  filters?: Record<string, string[]>;
  config?: Record<string, unknown>;
}

interface PivotTableUpdateInput {
  name?: string;
  sourceRange?: string;
  rowFields?: string[];
  columnFields?: string[];
  valueFields?: { column: string; aggregation: 'SUM' | 'COUNT' | 'AVERAGE' | 'MIN' | 'MAX' | 'COUNT_DISTINCT' }[];
  filters?: Record<string, string[]>;
  config?: Record<string, unknown>;
}

// Parse range string like "A1:E10" into cell coordinates
function parseRange(range: string): { startCol: number; startRow: number; endCol: number; endRow: number } | null {
  const match = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
  if (!match) return null;

  const colToNum = (col: string) => {
    let num = 0;
    for (let i = 0; i < col.length; i++) {
      num = num * 26 + col.toUpperCase().charCodeAt(i) - 64;
    }
    return num - 1;
  };

  return {
    startCol: colToNum(match[1]),
    startRow: parseInt(match[2]) - 1,
    endCol: colToNum(match[3]),
    endRow: parseInt(match[4]) - 1,
  };
}

// Create a new pivot table
export async function createPivotTable(input: PivotTableInput) {
  return prisma.pivotTable.create({
    data: {
      sheetId: input.sheetId,
      name: input.name,
      sourceRange: input.sourceRange,
      rowFields: JSON.stringify(input.rowFields),
      columnFields: input.columnFields ? JSON.stringify(input.columnFields) : null,
      valueFields: JSON.stringify(input.valueFields),
      filters: input.filters ? JSON.stringify(input.filters) : null,
      config: input.config ? JSON.stringify(input.config) : null,
    },
  });
}

// Get all pivot tables for a sheet
export async function getPivotTables(sheetId: string) {
  return prisma.pivotTable.findMany({
    where: { sheetId },
    orderBy: { createdAt: 'desc' },
  });
}

// Get a single pivot table
export async function getPivotTableById(pivotTableId: string) {
  return prisma.pivotTable.findUnique({
    where: { id: pivotTableId },
  });
}

// Update a pivot table
export async function updatePivotTable(pivotTableId: string, input: PivotTableUpdateInput) {
  const data: Record<string, unknown> = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.sourceRange !== undefined) data.sourceRange = input.sourceRange;
  if (input.rowFields !== undefined) data.rowFields = JSON.stringify(input.rowFields);
  if (input.columnFields !== undefined) data.columnFields = input.columnFields ? JSON.stringify(input.columnFields) : null;
  if (input.valueFields !== undefined) data.valueFields = JSON.stringify(input.valueFields);
  if (input.filters !== undefined) data.filters = input.filters ? JSON.stringify(input.filters) : null;
  if (input.config !== undefined) data.config = input.config ? JSON.stringify(input.config) : null;

  return prisma.pivotTable.update({
    where: { id: pivotTableId },
    data,
  });
}

// Delete a pivot table
export async function deletePivotTable(pivotTableId: string) {
  return prisma.pivotTable.delete({
    where: { id: pivotTableId },
  });
}

// Compute pivot table data
export async function computePivotTableData(pivotTableId: string) {
  const pivotTable = await prisma.pivotTable.findUnique({
    where: { id: pivotTableId },
    include: {
      sheet: {
        include: {
          columns: { orderBy: { position: 'asc' } },
          rows: {
            orderBy: { position: 'asc' },
            include: {
              cells: true,
            },
          },
        },
      },
    },
  });

  if (!pivotTable) {
    throw new Error('Pivot table not found');
  }

  const range = parseRange(pivotTable.sourceRange);
  if (!range) {
    throw new Error('Invalid source range');
  }

  const rowFields = JSON.parse(pivotTable.rowFields) as string[];
  const columnFields = pivotTable.columnFields ? JSON.parse(pivotTable.columnFields) as string[] : [];
  const valueFields = JSON.parse(pivotTable.valueFields) as { column: string; aggregation: string }[];
  const filters = pivotTable.filters ? JSON.parse(pivotTable.filters) as Record<string, string[]> : {};

  // Get column mapping (name to index)
  const columns = pivotTable.sheet.columns as Column[];
  const columnNameToIndex: Record<string, number> = {};
  const columnIndexToName: Record<number, string> = {};
  columns.forEach((col: Column, idx: number) => {
    columnNameToIndex[col.name] = idx;
    columnIndexToName[idx] = col.name;
  });

  // Extract data from range
  type RowWithCells = Row & { cells: Cell[] };
  const rows = (pivotTable.sheet.rows as RowWithCells[]).filter(
    (row: RowWithCells) => row.position >= range.startRow && row.position <= range.endRow
  );

  const data: Record<string, unknown>[] = [];
  for (const row of rows) {
    const rowData: Record<string, unknown> = {};
    for (let colIdx = range.startCol; colIdx <= range.endCol; colIdx++) {
      const column = columns[colIdx];
      if (!column) continue;

      const cell = row.cells?.find((c: Cell) => c.columnId === column.id);
      let value: unknown = null;

      if (cell?.value) {
        try {
          value = JSON.parse(cell.value);
        } catch {
          value = cell.value;
        }
      }

      rowData[column.name] = value;
    }
    data.push(rowData);
  }

  // Apply filters
  let filteredData = data;
  for (const [field, allowedValues] of Object.entries(filters)) {
    if (allowedValues && allowedValues.length > 0) {
      filteredData = filteredData.filter((row) =>
        allowedValues.includes(String(row[field] ?? ''))
      );
    }
  }

  // Group and aggregate data
  const result = computeAggregations(filteredData, rowFields, columnFields, valueFields);

  return {
    pivotTable,
    data: result,
    rowFields,
    columnFields,
    valueFields,
  };
}

function computeAggregations(
  data: Record<string, unknown>[],
  rowFields: string[],
  columnFields: string[],
  valueFields: { column: string; aggregation: string }[]
) {
  // Create groups based on row fields
  const groups: Record<string, Record<string, unknown>[]> = {};

  for (const row of data) {
    const rowKey = rowFields.map((f) => String(row[f] ?? '')).join('|||');
    if (!groups[rowKey]) {
      groups[rowKey] = [];
    }
    groups[rowKey].push(row);
  }

  // Compute aggregations for each group
  const result: Array<{
    rowValues: Record<string, string>;
    aggregations: Record<string, number | null>;
    columnAggregations?: Record<string, Record<string, number | null>>;
  }> = [];

  for (const [rowKey, groupRows] of Object.entries(groups)) {
    const rowValues: Record<string, string> = {};
    const rowParts = rowKey.split('|||');
    rowFields.forEach((field, idx) => {
      rowValues[field] = rowParts[idx];
    });

    const aggregations: Record<string, number | null> = {};

    for (const valueField of valueFields) {
      const key = `${valueField.column}_${valueField.aggregation}`;
      aggregations[key] = aggregate(groupRows, valueField.column, valueField.aggregation);
    }

    // If there are column fields, sub-group by those
    let columnAggregations: Record<string, Record<string, number | null>> | undefined;
    if (columnFields.length > 0) {
      columnAggregations = {};
      const subGroups: Record<string, Record<string, unknown>[]> = {};

      for (const row of groupRows) {
        const colKey = columnFields.map((f) => String(row[f] ?? '')).join('|||');
        if (!subGroups[colKey]) {
          subGroups[colKey] = [];
        }
        subGroups[colKey].push(row);
      }

      for (const [colKey, subGroupRows] of Object.entries(subGroups)) {
        columnAggregations[colKey] = {};
        for (const valueField of valueFields) {
          const key = `${valueField.column}_${valueField.aggregation}`;
          columnAggregations[colKey][key] = aggregate(subGroupRows, valueField.column, valueField.aggregation);
        }
      }
    }

    result.push({ rowValues, aggregations, columnAggregations });
  }

  // Sort result by row values
  result.sort((a, b) => {
    for (const field of rowFields) {
      const cmp = (a.rowValues[field] || '').localeCompare(b.rowValues[field] || '');
      if (cmp !== 0) return cmp;
    }
    return 0;
  });

  // Get unique column values
  const uniqueColumnValues: string[] = [];
  if (columnFields.length > 0) {
    const colValuesSet = new Set<string>();
    for (const row of data) {
      const colKey = columnFields.map((f) => String(row[f] ?? '')).join('|||');
      colValuesSet.add(colKey);
    }
    uniqueColumnValues.push(...Array.from(colValuesSet).sort());
  }

  return {
    rows: result,
    columnValues: uniqueColumnValues,
    grandTotals: computeGrandTotals(data, valueFields),
  };
}

function aggregate(rows: Record<string, unknown>[], column: string, aggregation: string): number | null {
  const values = rows
    .map((r) => r[column])
    .filter((v) => v !== null && v !== undefined && v !== '')
    .map((v) => {
      const num = typeof v === 'number' ? v : parseFloat(String(v));
      return isNaN(num) ? null : num;
    })
    .filter((v): v is number => v !== null);

  if (values.length === 0) return null;

  switch (aggregation) {
    case 'SUM':
      return values.reduce((sum, v) => sum + v, 0);
    case 'COUNT':
      return rows.filter((r) => r[column] !== null && r[column] !== undefined && r[column] !== '').length;
    case 'AVERAGE':
      return values.reduce((sum, v) => sum + v, 0) / values.length;
    case 'MIN':
      return Math.min(...values);
    case 'MAX':
      return Math.max(...values);
    case 'COUNT_DISTINCT':
      return new Set(rows.map((r) => String(r[column] ?? ''))).size;
    default:
      return null;
  }
}

function computeGrandTotals(data: Record<string, unknown>[], valueFields: { column: string; aggregation: string }[]): Record<string, number | null> {
  const totals: Record<string, number | null> = {};

  for (const valueField of valueFields) {
    const key = `${valueField.column}_${valueField.aggregation}`;
    totals[key] = aggregate(data, valueField.column, valueField.aggregation);
  }

  return totals;
}

// Get available columns for pivot table configuration
export async function getSheetColumns(sheetId: string) {
  const sheet = await prisma.sheet.findUnique({
    where: { id: sheetId },
    include: {
      columns: { orderBy: { position: 'asc' } },
    },
  });

  if (!sheet) {
    throw new Error('Sheet not found');
  }

  return sheet.columns.map((col: Column) => ({
    id: col.id,
    name: col.name,
    type: col.type,
  }));
}
