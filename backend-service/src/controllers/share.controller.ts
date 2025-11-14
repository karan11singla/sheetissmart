import { Request, Response, NextFunction } from 'express';
import * as shareService from '../services/share.service';
import { AppError } from '../middleware/errorHandler';

export async function shareSheet(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { email, permission } = req.body;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required',
      });
      return;
    }

    if (!permission || !['VIEWER', 'EDITOR'].includes(permission)) {
      res.status(400).json({
        success: false,
        message: 'Valid permission (VIEWER or EDITOR) is required',
      });
      return;
    }

    const share = await shareService.shareSheet({
      sheetId: id,
      sharedWithEmail: email,
      permission,
      sharedById: req.user.userId,
    });

    res.status(201).json({
      success: true,
      data: share,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSheetShares(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const shares = await shareService.getSheetShares(id, req.user.userId);

    res.status(200).json({
      success: true,
      data: shares,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeShare(req: Request, res: Response, next: NextFunction) {
  try {
    const { shareId } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    await shareService.removeShare(shareId, req.user.userId);

    res.status(200).json({
      success: true,
      message: 'Share removed successfully',
    });
  } catch (error) {
    next(error);
  }
}
