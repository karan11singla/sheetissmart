import { Request, Response, NextFunction } from 'express';
import * as chartService from '../services/chart.service';

// Create a new chart
export async function createChart(req: Request, res: Response, next: NextFunction) {
  try {
    const { sheetId } = req.params;
    const { name, type, dataRange, labelRange, config, position } = req.body;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    if (!name || !type || !dataRange || !config || !position) {
      res.status(400).json({
        success: false,
        message: 'Name, type, dataRange, config, and position are required',
      });
      return;
    }

    const chart = await chartService.createChart({
      sheetId,
      name,
      type,
      dataRange,
      labelRange,
      config: typeof config === 'string' ? config : JSON.stringify(config),
      position: typeof position === 'string' ? position : JSON.stringify(position),
    });

    res.status(201).json({
      success: true,
      data: { chart },
    });
  } catch (error) {
    next(error);
  }
}

// Get all charts for a sheet
export async function getCharts(req: Request, res: Response, next: NextFunction) {
  try {
    const { sheetId } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const charts = await chartService.getCharts(sheetId);

    res.status(200).json({
      success: true,
      data: { charts },
    });
  } catch (error) {
    next(error);
  }
}

// Get a single chart
export async function getChart(req: Request, res: Response, next: NextFunction) {
  try {
    const { chartId } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const chart = await chartService.getChartById(chartId);

    if (!chart) {
      res.status(404).json({
        success: false,
        message: 'Chart not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { chart },
    });
  } catch (error) {
    next(error);
  }
}

// Update a chart
export async function updateChart(req: Request, res: Response, next: NextFunction) {
  try {
    const { chartId } = req.params;
    const updates = req.body;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    // Convert objects to JSON strings if needed
    if (updates.config && typeof updates.config !== 'string') {
      updates.config = JSON.stringify(updates.config);
    }
    if (updates.position && typeof updates.position !== 'string') {
      updates.position = JSON.stringify(updates.position);
    }

    const chart = await chartService.updateChart(chartId, updates);

    res.status(200).json({
      success: true,
      data: { chart },
    });
  } catch (error) {
    next(error);
  }
}

// Delete a chart
export async function deleteChart(req: Request, res: Response, next: NextFunction) {
  try {
    const { chartId } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    await chartService.deleteChart(chartId);

    res.status(200).json({
      success: true,
      message: 'Chart deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
