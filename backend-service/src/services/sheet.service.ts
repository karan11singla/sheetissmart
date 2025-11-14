import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

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

  // Create 10 default columns
  const columns = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      prisma.column.create({
        data: {
          sheetId: sheet.id,
          name: `Column ${i + 1}`,
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

  // Add permission info to the response
  return {
    ...sheet,
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

  return await prisma.cell.update({
    where: { id: cellId },
    data: { value: value !== null ? JSON.stringify(value) : null },
  });
}
