import { Request, Response, NextFunction } from 'express';
import * as conditionalFormatService from '../services/conditionalFormat.service';
import { AppError } from '../middleware/errorHandler';

// Create a new conditional formatting rule
export async function createConditionalFormat(req: Request, res: Response, next: NextFunction) {
  try {
    const { sheetId } = req.params;
    const { name, ruleType, condition, backgroundColor, textColor, bold, italic, priority, range } = req.body;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    if (!name || !ruleType || !condition || !range) {
      res.status(400).json({
        success: false,
        message: 'Name, ruleType, condition, and range are required',
      });
      return;
    }

    const format = await conditionalFormatService.createConditionalFormat({
      sheetId,
      name,
      ruleType,
      condition,
      backgroundColor,
      textColor,
      bold,
      italic,
      priority,
      range,
    });

    res.status(201).json({
      success: true,
      data: format,
    });
  } catch (error) {
    next(error);
  }
}

// Get all conditional formatting rules for a sheet
export async function getConditionalFormats(req: Request, res: Response, next: NextFunction) {
  try {
    const { sheetId } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const formats = await conditionalFormatService.getConditionalFormats(sheetId);

    res.status(200).json({
      success: true,
      data: formats,
    });
  } catch (error) {
    next(error);
  }
}

// Update a conditional formatting rule
export async function updateConditionalFormat(req: Request, res: Response, next: NextFunction) {
  try {
    const { formatId } = req.params;
    const updates = req.body;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const format = await conditionalFormatService.updateConditionalFormat(formatId, updates);

    res.status(200).json({
      success: true,
      data: format,
    });
  } catch (error) {
    next(error);
  }
}

// Delete a conditional formatting rule
export async function deleteConditionalFormat(req: Request, res: Response, next: NextFunction) {
  try {
    const { formatId } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    await conditionalFormatService.deleteConditionalFormat(formatId);

    res.status(200).json({
      success: true,
      message: 'Conditional format deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
