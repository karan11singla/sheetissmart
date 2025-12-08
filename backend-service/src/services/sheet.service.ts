import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { FormulaEngine } from './formula.service';
import crypto from 'crypto';

interface CreateSheetInput {
  name: string;
  description?: string;
  template?: {
    columns: string[];  // Column names for template
    rows?: number;      // Number of initial rows (default 10)
  };
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
  // Generate unique name only for templates (not user-created sheets)
  let uniqueName = data.name;
  if (data.template) {
    const existingSheets = await prisma.sheet.findMany({
      where: {
        userId,
        name: {
          startsWith: data.name,
        },
      },
      select: { name: true },
    });

    if (existingSheets.length > 0) {
      const existingNames = new Set(existingSheets.map(s => s.name));
      if (existingNames.has(data.name)) {
        let counter = 1;
        while (existingNames.has(`${data.name} (${counter})`)) {
          counter++;
        }
        uniqueName = `${data.name} (${counter})`;
      }
    }
  }

  // Create the sheet
  const sheet = await prisma.sheet.create({
    data: {
      name: uniqueName,
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

  // Determine column names: use template columns if provided, otherwise default A-J
  const columnNames = data.template?.columns || Array.from({ length: 10 }, (_, i) => getColumnLetter(i));
  const numRows = data.template?.rows || 10;

  // Create columns with template or default names
  const columns = await Promise.all(
    columnNames.map((name, i) =>
      prisma.column.create({
        data: {
          sheetId: sheet.id,
          name: name,
          type: 'TEXT',
          position: i,
          width: 150,
        },
      })
    )
  );

  // Create rows
  const rows = await Promise.all(
    Array.from({ length: numRows }, (_, i) =>
      prisma.row.create({
        data: {
          sheetId: sheet.id,
          position: i,
          height: 35,
        },
      })
    )
  );

  // Create cells for all rows and columns
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
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
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
          _count: {
            select: {
              comments: true,
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

  // Check if this sheet is favorited by the user
  const userFavorite = await prisma.userFavorite.findUnique({
    where: {
      userId_sheetId: {
        userId,
        sheetId: id,
      },
    },
  });

  // Add permission info to the response
  return {
    ...sheet,
    rows: rowsWithComputedValues,
    isOwner,
    permission: isOwner ? 'OWNER' : sharedAccess?.permission,
    isFavorite: !!userFavorite,
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

  // Get user's favorites
  const userFavorites = await prisma.userFavorite.findMany({
    where: { userId },
    select: { sheetId: true },
  });
  const favoriteSheetIds = new Set(userFavorites.map((f) => f.sheetId));

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

  // Combine and mark which are shared, with user-specific favorites
  const allSheets = [
    ...ownedSheets.map((sheet) => ({
      ...sheet,
      isOwner: true,
      isShared: false,
      isFavorite: favoriteSheetIds.has(sheet.id),
    })),
    ...sharedSheets.map((sheet) => ({
      ...sheet,
      isOwner: false,
      isShared: true,
      sharedPermission: sheet.shares[0]?.permission,
      isFavorite: favoriteSheetIds.has(sheet.id),
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
  // Check if user has access to the sheet (owner or shared)
  const sheet = await prisma.sheet.findUnique({
    where: { id },
    include: { shares: true }
  });

  if (!sheet) {
    throw new AppError('Sheet not found', 404);
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
  const hasSharedAccess = sheet.shares.some((share) => share.sharedWithEmail === user.email);

  if (!isOwner && !hasSharedAccess) {
    throw new AppError('Access denied', 403);
  }

  // Check if favorite already exists
  const existingFavorite = await prisma.userFavorite.findUnique({
    where: {
      userId_sheetId: {
        userId,
        sheetId: id,
      },
    },
  });

  if (existingFavorite) {
    // Remove favorite
    await prisma.userFavorite.delete({
      where: { id: existingFavorite.id },
    });
    return { ...sheet, isFavorite: false };
  } else {
    // Add favorite
    await prisma.userFavorite.create({
      data: {
        userId,
        sheetId: id,
      },
    });
    return { ...sheet, isFavorite: true };
  }
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
    include: { rows: true, columns: true, shares: true },
  });

  if (!sheet) {
    throw new AppError('Sheet not found', 404);
  }

  // Get user's email to check shares
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if user is owner or has edit permission
  const isOwner = sheet.userId === userId;
  const sharedAccess = sheet.shares.find((share) => share.sharedWithEmail === user.email);

  if (!isOwner && (!sharedAccess || sharedAccess.permission === 'VIEWER')) {
    throw new AppError('Access denied. Edit permission required.', 403);
  }

  // Shift positions of existing columns at or after the insertion position
  // Must update in reverse order (highest position first) to avoid unique constraint violations
  const columnsToShift = await prisma.column.findMany({
    where: {
      sheetId,
      position: {
        gte: data.position,
      },
    },
    orderBy: {
      position: 'desc',
    },
  });

  // Update each column's position one at a time in reverse order
  for (const columnToShift of columnsToShift) {
    await prisma.column.update({
      where: { id: columnToShift.id },
      data: { position: columnToShift.position + 1 },
    });
  }

  // Create the column at the specified position
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
    include: { columns: true, rows: true, shares: true },
  });

  if (!sheet) {
    throw new AppError('Sheet not found', 404);
  }

  // Get user's email to check shares
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if user is owner or has edit permission
  const isOwner = sheet.userId === userId;
  const sharedAccess = sheet.shares.find((share) => share.sharedWithEmail === user.email);

  if (!isOwner && (!sharedAccess || sharedAccess.permission === 'VIEWER')) {
    throw new AppError('Access denied. Edit permission required.', 403);
  }

  // Shift positions of existing rows at or after the insertion position
  // Must update in reverse order (highest position first) to avoid unique constraint violations
  const rowsToShift = await prisma.row.findMany({
    where: {
      sheetId,
      position: {
        gte: data.position,
      },
    },
    orderBy: {
      position: 'desc',
    },
  });

  // Update each row's position one at a time in reverse order
  for (const rowToShift of rowsToShift) {
    await prisma.row.update({
      where: { id: rowToShift.id },
      data: { position: rowToShift.position + 1 },
    });
  }

  // Create row at the specified position
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
    include: { shares: true },
  });

  if (!sheet) {
    throw new AppError('Sheet not found', 404);
  }

  // Get user's email to check shares
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if user is owner or has edit permission
  const isOwner = sheet.userId === userId;
  const sharedAccess = sheet.shares.find((share) => share.sharedWithEmail === user.email);

  if (!isOwner && (!sharedAccess || sharedAccess.permission === 'VIEWER')) {
    throw new AppError('Access denied. Edit permission required.', 403);
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
    include: { shares: true },
  });

  if (!sheet) {
    throw new AppError('Sheet not found', 404);
  }

  // Get user's email to check shares
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if user is owner or has edit permission
  const isOwner = sheet.userId === userId;
  const sharedAccess = sheet.shares.find((share) => share.sharedWithEmail === user.email);

  if (!isOwner && (!sharedAccess || sharedAccess.permission === 'VIEWER')) {
    throw new AppError('Access denied. Edit permission required.', 403);
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
    include: { shares: true },
  });

  if (!sheet) {
    throw new AppError('Sheet not found', 404);
  }

  // Get user's email to check shares
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if user is owner or has edit permission
  const isOwner = sheet.userId === userId;
  const sharedAccess = sheet.shares.find((share) => share.sharedWithEmail === user.email);

  if (!isOwner && (!sharedAccess || sharedAccess.permission === 'VIEWER')) {
    throw new AppError('Access denied. Edit permission required.', 403);
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
    include: { shares: true },
  });

  if (!sheet) {
    throw new AppError('Sheet not found', 404);
  }

  // Get user's email to check shares
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if user is owner or has edit permission
  const isOwner = sheet.userId === userId;
  const sharedAccess = sheet.shares.find((share) => share.sharedWithEmail === user.email);

  if (!isOwner && (!sharedAccess || sharedAccess.permission === 'VIEWER')) {
    throw new AppError('Access denied. Edit permission required.', 403);
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

export async function updateCell(
  cellId: string,
  data: {
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
  },
  userId: string
) {
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

  // Check if user is owner or has edit permission (EDIT or EDIT_CAN_SHARE)
  const isOwner = cell.sheet.userId === userId;
  const sharedAccess = cell.sheet.shares.find((share) => share.sharedWithEmail === user.email);

  if (!isOwner && (!sharedAccess || sharedAccess.permission === 'VIEWER')) {
    throw new AppError('Access denied. Edit permission required.', 403);
  }

  // Store the value (formula or plain value)
  const stringValue = data.value !== null && data.value !== undefined ? data.value.toString() : null;

  // Check if it's a formula and evaluate it
  let computedValue = null;
  let formula = null;
  if (stringValue && stringValue.trim().startsWith('=')) {
    formula = stringValue;
    try {
      const result = await FormulaEngine.evaluate(cell.sheetId, stringValue);
      computedValue = result !== null ? JSON.stringify(result) : null;
    } catch (error) {
      console.error('Formula evaluation error:', error);
      // Store the formula anyway, but set computed value to error
      computedValue = JSON.stringify('#ERROR!');
    }
  }

  const updatedCell = await prisma.cell.update({
    where: { id: cellId },
    data: {
      value: stringValue !== null && !formula ? JSON.stringify(stringValue) : null,
      formula: formula,
      computedValue: computedValue,
      // Cell formatting fields
      textColor: data.textColor,
      backgroundColor: data.backgroundColor,
      fontSize: data.fontSize,
      fontFamily: data.fontFamily,
      bold: data.bold,
      italic: data.italic,
      underline: data.underline,
      strikethrough: data.strikethrough,
      textAlign: data.textAlign,
      verticalAlign: data.verticalAlign,
      wrapText: data.wrapText,
      hasBorder: data.hasBorder,
      borderTop: data.borderTop,
      borderBottom: data.borderBottom,
      borderLeft: data.borderLeft,
      borderRight: data.borderRight,
      textRotation: data.textRotation,
      numberFormat: data.numberFormat,
      decimalPlaces: data.decimalPlaces,
    },
  });

  // Return the cell with computed value if it's a formula
  return {
    ...updatedCell,
    computedValue: computedValue !== null ? JSON.parse(computedValue) : undefined,
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

// Helper function to get user's permission for a sheet
async function getUserPermission(sheetId: string, userId: string): Promise<'OWNER' | 'EDIT' | 'EDIT_CAN_SHARE' | 'VIEWER'> {
  const sheet = await prisma.sheet.findUnique({
    where: { id: sheetId },
    include: {
      shares: true,
    },
  });

  if (!sheet) {
    throw new AppError('Sheet not found', 404);
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
  if (isOwner) {
    return 'OWNER';
  }

  const sharedAccess = sheet.shares.find((share) => share.sharedWithEmail === user.email);
  if (!sharedAccess) {
    throw new AppError('Access denied', 403);
  }

  return sharedAccess.permission;
}

export async function getRowComments(rowId: string, sheetId: string, userId: string) {
  // First verify user has access to this sheet
  await getUserPermission(sheetId, userId);

  // Verify row belongs to this sheet
  const row = await prisma.row.findUnique({
    where: { id: rowId },
    select: { sheetId: true },
  });

  if (!row) {
    throw new AppError('Row not found', 404);
  }

  if (row.sheetId !== sheetId) {
    throw new AppError('Row does not belong to this sheet', 403);
  }

  // Get comments with user info
  const comments = await prisma.rowComment.findMany({
    where: { rowId },
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

export async function createRowComment(rowId: string, sheetId: string, userId: string, content: string) {
  // Verify user has edit permission (EDIT or EDIT_CAN_SHARE)
  const permission = await getUserPermission(sheetId, userId);

  if (permission === 'VIEWER') {
    throw new AppError('Viewers cannot add comments. You need edit permission.', 403);
  }

  // Verify row belongs to this sheet
  const row = await prisma.row.findUnique({
    where: { id: rowId },
    select: { sheetId: true },
  });

  if (!row) {
    throw new AppError('Row not found', 404);
  }

  if (row.sheetId !== sheetId) {
    throw new AppError('Row does not belong to this sheet', 403);
  }

  // Create comment
  const comment = await prisma.rowComment.create({
    data: {
      rowId,
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

  // Create notifications for mentioned users
  const { createMentionNotifications } = await import('./notification.service');
  await createMentionNotifications(content, comment.id, sheetId, rowId, userId);

  return comment;
}

// Generate a unique share token for a sheet
export async function generateShareToken(sheetId: string, userId: string) {
  // Check if user is owner or has EDIT_CAN_SHARE permission
  const sheet = await prisma.sheet.findUnique({
    where: { id: sheetId },
  });

  if (!sheet) {
    throw new AppError('Sheet not found', 404);
  }

  const isOwner = sheet.userId === userId;
  const shareAccess = await prisma.sheetShare.findFirst({
    where: {
      sheetId,
      sharedWithId: userId,
      permission: 'EDIT_CAN_SHARE',
    },
  });

  if (!isOwner && !shareAccess) {
    throw new AppError('You need EDIT_CAN_SHARE permission to generate a share link', 403);
  }

  // Generate a unique token
  const token = crypto.randomBytes(32).toString('hex');

  // Update sheet with the new token
  const updatedSheet = await prisma.sheet.update({
    where: { id: sheetId },
    data: { shareToken: token },
  });

  return { shareToken: token };
}

// Get sheet by share token (public access)
export async function getSheetByToken(token: string) {
  const sheet = await prisma.sheet.findUnique({
    where: { shareToken: token },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      columns: {
        orderBy: { position: 'asc' },
      },
      rows: {
        orderBy: { position: 'asc' },
      },
      cells: true,
      shares: {
        include: {
          sharedWith: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!sheet) {
    throw new AppError('Sheet not found or link is invalid', 404);
  }

  return sheet;
}

// Cell Merge functionality
interface MergeCellsInput {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

export async function mergeCells(sheetId: string, data: MergeCellsInput, userId: string) {
  // Get sheet to verify permission
  const sheet = await prisma.sheet.findUnique({
    where: { id: sheetId },
    include: {
      shares: true,
      rows: { orderBy: { position: 'asc' } },
      columns: { orderBy: { position: 'asc' } },
    },
  });

  if (!sheet) {
    throw new AppError('Sheet not found', 404);
  }

  // Check permission
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);

  const isOwner = sheet.userId === userId;
  const sharedAccess = sheet.shares.find((share) => share.sharedWithEmail === user.email);
  if (!isOwner && (!sharedAccess || sharedAccess.permission === 'VIEWER')) {
    throw new AppError('Access denied. Edit permission required.', 403);
  }

  const { startRow, endRow, startCol, endCol } = data;

  // Validate range
  if (startRow > endRow || startCol > endCol) {
    throw new AppError('Invalid range: start must be before end', 400);
  }

  if (startRow === endRow && startCol === endCol) {
    throw new AppError('Cannot merge a single cell', 400);
  }

  // Find all cells in the range
  const rowsInRange = sheet.rows.filter(r => r.position >= startRow && r.position <= endRow);
  const colsInRange = sheet.columns.filter(c => c.position >= startCol && c.position <= endCol);

  if (rowsInRange.length === 0 || colsInRange.length === 0) {
    throw new AppError('Invalid row or column range', 400);
  }

  // Get the top-left cell (main cell)
  const mainRow = rowsInRange[0];
  const mainCol = colsInRange[0];

  const mainCell = await prisma.cell.findFirst({
    where: {
      sheetId,
      rowId: mainRow.id,
      columnId: mainCol.id,
    },
  });

  if (!mainCell) {
    throw new AppError('Main cell not found', 404);
  }

  // Check if any cell in range is already merged
  const cellsInRange = await prisma.cell.findMany({
    where: {
      sheetId,
      rowId: { in: rowsInRange.map(r => r.id) },
      columnId: { in: colsInRange.map(c => c.id) },
    },
  });

  const alreadyMerged = cellsInRange.some(c => c.mergedIntoId !== null || c.mergeRowSpan > 1 || c.mergeColSpan > 1);
  if (alreadyMerged) {
    throw new AppError('Cannot merge: some cells are already merged. Unmerge them first.', 400);
  }

  const rowSpan = endRow - startRow + 1;
  const colSpan = endCol - startCol + 1;

  // Update main cell with span information
  const updatedMainCell = await prisma.cell.update({
    where: { id: mainCell.id },
    data: {
      mergeRowSpan: rowSpan,
      mergeColSpan: colSpan,
    },
  });

  // Mark all other cells as merged into the main cell
  const otherCellIds = cellsInRange.filter(c => c.id !== mainCell.id).map(c => c.id);
  await prisma.cell.updateMany({
    where: { id: { in: otherCellIds } },
    data: {
      mergedIntoId: mainCell.id,
      value: null, // Clear values from merged cells
    },
  });

  return updatedMainCell;
}

export async function unmergeCells(sheetId: string, cellId: string, userId: string) {
  // Get sheet to verify permission
  const sheet = await prisma.sheet.findUnique({
    where: { id: sheetId },
    include: { shares: true },
  });

  if (!sheet) {
    throw new AppError('Sheet not found', 404);
  }

  // Check permission
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);

  const isOwner = sheet.userId === userId;
  const sharedAccess = sheet.shares.find((share) => share.sharedWithEmail === user.email);
  if (!isOwner && (!sharedAccess || sharedAccess.permission === 'VIEWER')) {
    throw new AppError('Access denied. Edit permission required.', 403);
  }

  // Get the main cell
  const mainCell = await prisma.cell.findFirst({
    where: {
      id: cellId,
      sheetId,
    },
  });

  if (!mainCell) {
    throw new AppError('Cell not found', 404);
  }

  if (mainCell.mergeRowSpan === 1 && mainCell.mergeColSpan === 1) {
    throw new AppError('Cell is not merged', 400);
  }

  // Reset the main cell
  const updatedMainCell = await prisma.cell.update({
    where: { id: mainCell.id },
    data: {
      mergeRowSpan: 1,
      mergeColSpan: 1,
    },
  });

  // Reset all cells merged into this one
  await prisma.cell.updateMany({
    where: {
      sheetId,
      mergedIntoId: mainCell.id,
    },
    data: {
      mergedIntoId: null,
    },
  });

  return updatedMainCell;
}
