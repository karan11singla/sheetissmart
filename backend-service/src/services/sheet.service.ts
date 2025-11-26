import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { FormulaEngine } from './formula.service';

interface CreateSheetInput {
  name: string;
  description?: string;
}

interface UpdateSheetInput {
  name?: string;
  description?: string;
}

interface CreateColumnInput {
  name: string;
  type: string;
  position: number;
  width?: number;
}

interface CreateRowInput {
  position: number;
  height?: number;
}

export async function createSheet(data: CreateSheetInput, userId: string) {
  // Create the sheet
  const sheet = await prisma.sheet.create({
    data: {
      name: data.name,
      description: data.description,
      userId,
    },
  });

  // Helper function to convert index to column letter (0 -> A, 1 -> B, etc.)
  const getColumnLetter = (index: number): string => {
    let letter = '';
    let idx = index;
    while (idx >= 0) {
      letter = String.fromCharCode(65 + (idx % 26)) + letter;
      idx = Math.floor(idx / 26) - 1;
    }
    return letter;
  };

  // Create 10 default columns (A, B, C, ..., J)
  const columns = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      prisma.column.create({
        data: {
          sheetId: sheet.id,
          name: getColumnLetter(i),
          type: 'TEXT',
          position: i,
          width: 150,
        },
      })
    )
  );

  // Create 10 default rows
  const rows = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      prisma.row.create({
        data: {
          sheetId: sheet.id,
          position: i,
          height: 35,
        },
      })
    )
  );

  // Create cells for all rows and columns (10x10 = 100 cells)
  const cellsData = rows.flatMap((row) =>
    columns.map((column) => ({
      sheetId: sheet.id,
      rowId: row.id,
      columnId: column.id,
      value: null,
    }))
  );

  await prisma.cell.createMany({
    data: cellsData,
  });

  return sheet;
}

export async function getSheetById(id: string, userId: string) {
  const sheet = await prisma.sheet.findUnique({
    where: { id },
    include: {
      columns: {
        orderBy: { position: 'asc' },
      },
      rows: {
        orderBy: { position: 'asc' },
        include: {
          cells: {
            include: {
              column: true,
            },
          },
        },
      },
      shares: true,
    },
  });

  if (!sheet) {
    return null;
  }

  // Get user's email to check shares
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if user is owner or has access via share
  const isOwner = sheet.userId === userId;
  const sharedAccess = sheet.shares.find((share) => share.sharedWithEmail === user.email);

  if (!isOwner && !sharedAccess) {
    throw new AppError('Access denied', 403);
  }

  // Evaluate formulas for all cells
  const rowsWithComputedValues = await Promise.all(
    sheet.rows.map(async (row) => {
      const cellsWithComputed = await Promise.all(
        row.cells.map(async (cell) => {
          if (cell.value) {
            try {
              const parsedValue = JSON.parse(cell.value);
              if (typeof parsedValue === 'string' && parsedValue.trim().startsWith('=')) {
                const computedValue = await FormulaEngine.evaluate(id, parsedValue);
                return { ...cell, computedValue };
              }
            } catch (error) {
              // If parsing fails, just return the cell as is
            }
          }
          return cell;
        })
      );
      return { ...row, cells: cellsWithComputed };
    })
  );

  // Add permission info to the response
  return {
    ...sheet,
    rows: rowsWithComputedValues,
    isOwner,
    permission: isOwner ? 'OWNER' : sharedAccess?.permission,
  };
}

export async function getAllSheets(userId: string) {
  // Get user's email to find shared sheets
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Get sheets owned by user and sheets shared with user
  const [ownedSheets, sharedSheets] = await Promise.all([
    prisma.sheet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            rows: true,
            columns: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.sheet.findMany({
      where: {
        shares: {
          some: {
            sharedWithEmail: user.email,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            rows: true,
            columns: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        shares: {
          where: {
            sharedWithEmail: user.email,
          },
          select: {
            permission: true,
          },
        },
      },
    }),
  ]);

  // Combine and mark which are shared
  const allSheets = [
    ...ownedSheets.map((sheet) => ({ ...sheet, isOwner: true, isShared: false })),
    ...sharedSheets.map((sheet) => ({
      ...sheet,
      isOwner: false,
      isShared: true,
      sharedPermission: sheet.shares[0]?.permission,
    })),
  ];

  return allSheets;
}

export async function updateSheet(id: string, data: UpdateSheetInput, userId: string) {
  // Check if sheet belongs to user
  const sheet = await prisma.sheet.findUnique({ where: { id } });
  if (!sheet) {
    throw new AppError('Sheet not found', 404);
  }
  if (sheet.userId !== userId) {
    throw new AppError('Access denied', 403);
  }

  return await prisma.sheet.update({
    where: { id },
    data,
  });
}

export async function toggleFavorite(id: string, userId: string) {
  // Check if sheet belongs to user
  const sheet = await prisma.sheet.findUnique({ where: { id } });
  if (!sheet) {
    throw new AppError('Sheet not found', 404);
  }
  if (sheet.userId !== userId) {
    throw new AppError('Access denied', 403);
  }

  // Toggle the favorite status
  return await prisma.sheet.update({
    where: { id },
    data: {
      isFavorite: !sheet.isFavorite,
    },
  });
}

export async function deleteSheet(id: string, userId: string) {
  // Check if sheet belongs to user
  const sheet = await prisma.sheet.findUnique({ where: { id } });
  if (!sheet) {
    throw new AppError('Sheet not found', 404);
  }
  if (sheet.userId !== userId) {
    throw new AppError('Access denied', 403);
  }

  return await prisma.sheet.delete({
    where: { id },
  });
}

export async function createColumn(sheetId: string, data: CreateColumnInput, userId: string) {
  // Check if sheet exists and get all rows
  const sheet = await prisma.sheet.findUnique({
    where: { id: sheetId },
    include: { rows: true },
  });

  if (!sheet) {
    throw new AppError('Sheet not found', 404);
  }

  if (sheet.userId !== userId) {
    throw new AppError('Access denied', 403);
  }

  // Create the column
  const column = await prisma.column.create({
    data: {
      sheetId,
      name: data.name,
      type: data.type as any,
      position: data.position,
      width: data.width,
    },
  });

  // Create cells for all existing rows
  const cellsData = sheet.rows.map((row) => ({
    sheetId,
    rowId: row.id,
    columnId: column.id,
    value: null,
  }));

  if (cellsData.length > 0) {
    await prisma.cell.createMany({
      data: cellsData,
    });
  }

  return column;
}

export async function createRow(sheetId: string, data: CreateRowInput, userId: string) {
  // Check if sheet exists
  const sheet = await prisma.sheet.findUnique({
    where: { id: sheetId },
    include: { columns: true },
  });

  if (!sheet) {
    throw new AppError('Sheet not found', 404);
  }

  if (sheet.userId !== userId) {
    throw new AppError('Access denied', 403);
  }

  // Create row
  const row = await prisma.row.create({
    data: {
      sheetId,
      position: data.position,
      height: data.height,
    },
  });

  // Create empty cells for all columns
  const cellsData = sheet.columns.map((column) => ({
    sheetId,
    rowId: row.id,
    columnId: column.id,
    value: null,
  }));

  if (cellsData.length > 0) {
    await prisma.cell.createMany({
      data: cellsData,
    });
  }

  return await prisma.row.findUnique({
    where: { id: row.id },
    include: { cells: true },
  });
}

export async function updateColumn(
  sheetId: string,
  columnId: string,
  userId: string,
  data: { width?: number; name?: string }
) {
  // Check if sheet exists and user has access
  const sheet = await prisma.sheet.findUnique({
    where: { id: sheetId },
  });

  if (!sheet) {
    throw new AppError('Sheet not found', 404);
  }

  if (sheet.userId !== userId) {
    throw new AppError('Access denied', 403);
  }

  // Update the column
  return await prisma.column.update({
    where: { id: columnId },
    data,
  });
}

export async function updateRow(
  sheetId: string,
  rowId: string,
  userId: string,
  data: { height?: number }
) {
  // Check if sheet exists and user has access
  const sheet = await prisma.sheet.findUnique({
    where: { id: sheetId },
  });

  if (!sheet) {
    throw new AppError('Sheet not found', 404);
  }

  if (sheet.userId !== userId) {
    throw new AppError('Access denied', 403);
  }

  // Update the row
  return await prisma.row.update({
    where: { id: rowId },
    data,
  });
}

export async function deleteColumn(sheetId: string, columnId: string, userId: string) {
  // Check if sheet exists and user has access
  const sheet = await prisma.sheet.findUnique({
    where: { id: sheetId },
  });

  if (!sheet) {
    throw new AppError('Sheet not found', 404);
  }

  if (sheet.userId !== userId) {
    throw new AppError('Access denied', 403);
  }

  // Delete all cells in this column first (cascade should handle this, but being explicit)
  await prisma.cell.deleteMany({
    where: { columnId },
  });

  // Delete the column
  return await prisma.column.delete({
    where: { id: columnId },
  });
}

export async function deleteRow(sheetId: string, rowId: string, userId: string) {
  // Check if sheet exists and user has access
  const sheet = await prisma.sheet.findUnique({
    where: { id: sheetId },
  });

  if (!sheet) {
    throw new AppError('Sheet not found', 404);
  }

  if (sheet.userId !== userId) {
    throw new AppError('Access denied', 403);
  }

  // Delete all cells in this row first (cascade should handle this, but being explicit)
  await prisma.cell.deleteMany({
    where: { rowId },
  });

  // Delete the row
  return await prisma.row.delete({
    where: { id: rowId },
  });
}

export async function updateCell(cellId: string, value: any, userId: string) {
  // Get cell with sheet info to check authorization
  const cell = await prisma.cell.findUnique({
    where: { id: cellId },
    include: {
      sheet: {
        include: {
          shares: true,
        },
      },
    },
  });

  if (!cell) {
    throw new AppError('Cell not found', 404);
  }

  // Get user's email to check shares
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if user is owner or has EDITOR permission
  const isOwner = cell.sheet.userId === userId;
  const sharedAccess = cell.sheet.shares.find((share) => share.sharedWithEmail === user.email);

  if (!isOwner && (!sharedAccess || sharedAccess.permission !== 'EDITOR')) {
    throw new AppError('Access denied. Editor permission required.', 403);
  }

  // Store the value (formula or plain value)
  const stringValue = value !== null ? value.toString() : null;

  // Check if it's a formula and evaluate it
  let computedValue = null;
  if (stringValue && stringValue.trim().startsWith('=')) {
    try {
      computedValue = await FormulaEngine.evaluate(cell.sheetId, stringValue);
    } catch (error) {
      console.error('Formula evaluation error:', error);
      // Store the formula anyway, but return null for computed value
    }
  }

  const updatedCell = await prisma.cell.update({
    where: { id: cellId },
    data: { value: stringValue !== null ? JSON.stringify(stringValue) : null },
  });

  // Return the cell with computed value if it's a formula
  return {
    ...updatedCell,
    computedValue: computedValue !== null ? computedValue : undefined,
  };
}

// Export sheet to CSV
export async function exportSheetToCSV(sheetId: string, userId: string): Promise<string> {
  const sheet = await getSheetById(sheetId, userId);

  if (!sheet || !sheet.columns || !sheet.rows) {
    return '';
  }

  // Build CSV header
  const headers = sheet.columns.map((col) => `"${col.name.replace(/"/g, '""')}"`);
  let csv = headers.join(',') + '\n';

  // Build CSV rows
  for (const row of sheet.rows) {
    const rowData = sheet.columns!.map((col) => {
      const cell = row.cells?.find((c) => c.columnId === col.id);
      if (!cell || !cell.value) return '""';

      try {
        const value = JSON.parse(cell.value);
        // Escape quotes and wrap in quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      } catch {
        return '""';
      }
    });
    csv += rowData.join(',') + '\n';
  }

  return csv;
}

export async function getCellComments(cellId: string, sheetId: string, userId: string) {
  // First verify user has access to this sheet
  await getUserPermission(sheetId, userId);

  // Verify cell belongs to this sheet
  const cell = await prisma.cell.findUnique({
    where: { id: cellId },
    select: { sheetId: true },
  });

  if (!cell) {
    throw new AppError('Cell not found', 404);
  }

  if (cell.sheetId !== sheetId) {
    throw new AppError('Cell does not belong to this sheet', 403);
  }

  // Get comments with user info
  const comments = await prisma.cellComment.findMany({
    where: { cellId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return comments;
}

export async function createCellComment(cellId: string, sheetId: string, userId: string, content: string) {
  // Verify user has EDITOR permission
  const permission = await getUserPermission(sheetId, userId);

  if (permission === 'VIEWER') {
    throw new AppError('Viewers cannot add comments. You need EDITOR permission.', 403);
  }

  // Verify cell belongs to this sheet
  const cell = await prisma.cell.findUnique({
    where: { id: cellId },
    select: { sheetId: true },
  });

  if (!cell) {
    throw new AppError('Cell not found', 404);
  }

  if (cell.sheetId !== sheetId) {
    throw new AppError('Cell does not belong to this sheet', 403);
  }

  // Create comment
  const comment = await prisma.cellComment.create({
    data: {
      cellId,
      userId,
      content,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return comment;
}
