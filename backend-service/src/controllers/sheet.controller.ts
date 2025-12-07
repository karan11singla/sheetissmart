import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import * as sheetService from '../services/sheet.service';

export const createSheet = asyncHandler(async (req: Request, res: Response) => {
  const { name, description } = req.body;

  if (!name) {
    throw new AppError('Sheet name is required', 400);
  }

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const sheet = await sheetService.createSheet({ name, description }, req.user.userId);

  res.status(201).json({
    status: 'success',
    data: { sheet },
  });
});

export const getSheet = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const sheet = await sheetService.getSheetById(id, req.user.userId);

  if (!sheet) {
    throw new AppError('Sheet not found', 404);
  }

  res.status(200).json({
    status: 'success',
    data: { sheet },
  });
});

export const getAllSheets = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const sheets = await sheetService.getAllSheets(req.user.userId);

  res.status(200).json({
    status: 'success',
    data: { sheets },
  });
});

export const updateSheet = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const sheet = await sheetService.updateSheet(id, { name, description }, req.user.userId);

  res.status(200).json({
    status: 'success',
    data: { sheet },
  });
});

export const deleteSheet = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  await sheetService.deleteSheet(id, req.user.userId);

  res.status(204).send();
});

export const createColumn = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, type, position, width } = req.body;

  if (!name || position === undefined) {
    throw new AppError('Column name and position are required', 400);
  }

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const column = await sheetService.createColumn(id, {
    name,
    type: type || 'TEXT',
    position,
    width,
  }, req.user.userId);

  res.status(201).json({
    status: 'success',
    data: { column },
  });
});

export const createRow = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { position, height } = req.body;

  if (position === undefined) {
    throw new AppError('Row position is required', 400);
  }

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const row = await sheetService.createRow(id, { position, height }, req.user.userId);

  res.status(201).json({
    status: 'success',
    data: { row },
  });
});

export const updateCell = asyncHandler(async (req: Request, res: Response) => {
  const { id, cellId } = req.params;
  const {
    value,
    textColor,
    backgroundColor,
    fontSize,
    bold,
    italic,
    underline,
    textAlign,
    hasBorder,
    numberFormat,
    decimalPlaces
  } = req.body;

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const cell = await sheetService.updateCell(cellId, {
    value,
    textColor,
    backgroundColor,
    fontSize,
    bold,
    italic,
    underline,
    textAlign,
    hasBorder,
    numberFormat,
    decimalPlaces,
  }, req.user.userId);

  res.status(200).json({
    status: 'success',
    data: { cell },
  });
});

export const updateColumn = asyncHandler(async (req: Request, res: Response) => {
  const { id, columnId } = req.params;
  const { width, name } = req.body;

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const column = await sheetService.updateColumn(id, columnId, req.user.userId, { width, name });

  res.status(200).json({
    status: 'success',
    data: { column },
  });
});

export const deleteColumn = asyncHandler(async (req: Request, res: Response) => {
  const { id, columnId } = req.params;

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  await sheetService.deleteColumn(id, columnId, req.user.userId);

  res.status(204).send();
});

export const updateRow = asyncHandler(async (req: Request, res: Response) => {
  const { id, rowId } = req.params;
  const { height } = req.body;

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const row = await sheetService.updateRow(id, rowId, req.user.userId, { height });

  res.status(200).json({
    status: 'success',
    data: { row },
  });
});

export const deleteRow = asyncHandler(async (req: Request, res: Response) => {
  const { id, rowId } = req.params;

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  await sheetService.deleteRow(id, rowId, req.user.userId);

  res.status(204).send();
});

export const exportSheet = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const sheet = await sheetService.getSheetById(id, req.user.userId);
  const csv = await sheetService.exportSheetToCSV(id, req.user.userId);

  // Get sheet name for filename
  const filename = sheet
    ? `${sheet.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.csv`
    : 'sheet_export.csv';

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csv);
});

export const toggleFavorite = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const sheet = await sheetService.toggleFavorite(id, req.user.userId);

  res.status(200).json({
    status: 'success',
    data: { sheet },
  });
});

export const getRowComments = asyncHandler(async (req: Request, res: Response) => {
  const { id, rowId } = req.params;

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const comments = await sheetService.getRowComments(rowId, id, req.user.userId);

  res.status(200).json({
    status: 'success',
    data: { comments },
  });
});

export const createRowComment = asyncHandler(async (req: Request, res: Response) => {
  const { id, rowId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    throw new AppError('Comment content is required', 400);
  }

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const comment = await sheetService.createRowComment(rowId, id, req.user.userId, content.trim());

  res.status(201).json({
    status: 'success',
    data: { comment },
  });
});

// Generate share token for a sheet
export const generateShareToken = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const result = await sheetService.generateShareToken(id, req.user.userId);

  res.json({
    status: 'success',
    data: result,
  });
});

// Get sheet by share token (public access, no authentication required)
export const getSheetByToken = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;

  const sheet = await sheetService.getSheetByToken(token);

  res.json({
    status: 'success',
    data: { sheet },
  });
});

// Merge cells in a sheet
export const mergeCells = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { startRow, endRow, startCol, endCol } = req.body;

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  if (startRow === undefined || endRow === undefined || startCol === undefined || endCol === undefined) {
    throw new AppError('startRow, endRow, startCol, and endCol are required', 400);
  }

  const cell = await sheetService.mergeCells(id, { startRow, endRow, startCol, endCol }, req.user.userId);

  res.json({
    status: 'success',
    data: { cell },
  });
});

// Unmerge cells in a sheet
export const unmergeCells = asyncHandler(async (req: Request, res: Response) => {
  const { id, cellId } = req.params;

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const cell = await sheetService.unmergeCells(id, cellId, req.user.userId);

  res.json({
    status: 'success',
    data: { cell },
  });
});
