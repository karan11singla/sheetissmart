import { Request, Response, NextFunction } from 'express';
import * as pivotTableService from '../services/pivotTable.service';

// Create a new pivot table
export async function createPivotTable(req: Request, res: Response, next: NextFunction) {
  try {
    const { sheetId } = req.params;
    const { name, sourceRange, rowFields, columnFields, valueFields, filters, config } = req.body;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    if (!name || !sourceRange || !rowFields || !valueFields) {
      res.status(400).json({
        success: false,
        message: 'Name, sourceRange, rowFields, and valueFields are required',
      });
      return;
    }

    const pivotTable = await pivotTableService.createPivotTable({
      sheetId,
      name,
      sourceRange,
      rowFields,
      columnFields,
      valueFields,
      filters,
      config,
    });

    res.status(201).json({
      success: true,
      data: { pivotTable },
    });
  } catch (error) {
    next(error);
  }
}

// Get all pivot tables for a sheet
export async function getPivotTables(req: Request, res: Response, next: NextFunction) {
  try {
    const { sheetId } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const pivotTables = await pivotTableService.getPivotTables(sheetId);

    res.status(200).json({
      success: true,
      data: { pivotTables },
    });
  } catch (error) {
    next(error);
  }
}

// Get a single pivot table
export async function getPivotTable(req: Request, res: Response, next: NextFunction) {
  try {
    const { pivotTableId } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const pivotTable = await pivotTableService.getPivotTableById(pivotTableId);

    if (!pivotTable) {
      res.status(404).json({
        success: false,
        message: 'Pivot table not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { pivotTable },
    });
  } catch (error) {
    next(error);
  }
}

// Update a pivot table
export async function updatePivotTable(req: Request, res: Response, next: NextFunction) {
  try {
    const { pivotTableId } = req.params;
    const updates = req.body;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const pivotTable = await pivotTableService.updatePivotTable(pivotTableId, updates);

    res.status(200).json({
      success: true,
      data: { pivotTable },
    });
  } catch (error) {
    next(error);
  }
}

// Delete a pivot table
export async function deletePivotTable(req: Request, res: Response, next: NextFunction) {
  try {
    const { pivotTableId } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    await pivotTableService.deletePivotTable(pivotTableId);

    res.status(200).json({
      success: true,
      message: 'Pivot table deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

// Compute pivot table data
export async function computePivotData(req: Request, res: Response, next: NextFunction) {
  try {
    const { pivotTableId } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const result = await pivotTableService.computePivotTableData(pivotTableId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// Get available columns for pivot table configuration
export async function getSheetColumns(req: Request, res: Response, next: NextFunction) {
  try {
    const { sheetId } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const columns = await pivotTableService.getSheetColumns(sheetId);

    res.status(200).json({
      success: true,
      data: { columns },
    });
  } catch (error) {
    next(error);
  }
}
