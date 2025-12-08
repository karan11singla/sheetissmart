import { Request, Response, NextFunction } from 'express';
import * as dataValidationService from '../services/dataValidation.service';

// Create a new data validation rule
export async function createDataValidation(req: Request, res: Response, next: NextFunction) {
  try {
    const { sheetId } = req.params;
    const {
      range,
      type,
      criteria,
      allowBlank,
      showDropdown,
      errorTitle,
      errorMessage,
      inputTitle,
      inputMessage,
    } = req.body;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    if (!range || !type || !criteria) {
      res.status(400).json({
        success: false,
        message: 'Range, type, and criteria are required',
      });
      return;
    }

    const validation = await dataValidationService.createDataValidation({
      sheetId,
      range,
      type,
      criteria: typeof criteria === 'string' ? criteria : JSON.stringify(criteria),
      allowBlank,
      showDropdown,
      errorTitle,
      errorMessage,
      inputTitle,
      inputMessage,
    });

    res.status(201).json({
      success: true,
      data: { validation },
    });
  } catch (error) {
    next(error);
  }
}

// Get all data validation rules for a sheet
export async function getDataValidations(req: Request, res: Response, next: NextFunction) {
  try {
    const { sheetId } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const validations = await dataValidationService.getDataValidations(sheetId);

    res.status(200).json({
      success: true,
      data: { validations },
    });
  } catch (error) {
    next(error);
  }
}

// Get a single data validation
export async function getDataValidation(req: Request, res: Response, next: NextFunction) {
  try {
    const { validationId } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const validation = await dataValidationService.getDataValidationById(validationId);

    if (!validation) {
      res.status(404).json({
        success: false,
        message: 'Data validation not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { validation },
    });
  } catch (error) {
    next(error);
  }
}

// Update a data validation rule
export async function updateDataValidation(req: Request, res: Response, next: NextFunction) {
  try {
    const { validationId } = req.params;
    const updates = req.body;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    // Convert criteria to JSON string if needed
    if (updates.criteria && typeof updates.criteria !== 'string') {
      updates.criteria = JSON.stringify(updates.criteria);
    }

    const validation = await dataValidationService.updateDataValidation(validationId, updates);

    res.status(200).json({
      success: true,
      data: { validation },
    });
  } catch (error) {
    next(error);
  }
}

// Delete a data validation rule
export async function deleteDataValidation(req: Request, res: Response, next: NextFunction) {
  try {
    const { validationId } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    await dataValidationService.deleteDataValidation(validationId);

    res.status(200).json({
      success: true,
      message: 'Data validation deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

// Validate a cell value
export async function validateCell(req: Request, res: Response, next: NextFunction) {
  try {
    const { sheetId } = req.params;
    const { cellRef, value } = req.body;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    if (!cellRef) {
      res.status(400).json({
        success: false,
        message: 'cellRef is required',
      });
      return;
    }

    const result = await dataValidationService.validateCellValue(sheetId, cellRef, value);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// Get validation for a specific cell
export async function getCellValidation(req: Request, res: Response, next: NextFunction) {
  try {
    const { sheetId, cellRef } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const validation = await dataValidationService.getValidationForCell(sheetId, cellRef);

    res.status(200).json({
      success: true,
      data: { validation },
    });
  } catch (error) {
    next(error);
  }
}
