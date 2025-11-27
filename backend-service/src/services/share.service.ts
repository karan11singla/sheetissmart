import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

interface ShareSheetInput {
  sheetId: string;
  sharedWithEmail: string;
  permission: 'VIEWER' | 'EDITOR';
  sharedById: string;
}

export async function shareSheet(input: ShareSheetInput) {
  const { sheetId, sharedWithEmail, permission, sharedById } = input;

  // Check if sheet exists and user has edit access
  const sheet = await prisma.sheet.findUnique({
    where: { id: sheetId },
  });

  if (!sheet) {
    throw new AppError('Sheet not found', 404);
  }

  // Check if user is owner or has editor permission
  const isOwner = sheet.userId === sharedById;

  // Check if user has editor access (sharedWithId should match the user)
  const shareAccess = await prisma.sheetShare.findFirst({
    where: {
      sheetId,
      sharedWithId: sharedById,
      permission: 'EDITOR',
    },
  });

  if (!isOwner && !shareAccess) {
    throw new AppError('You need edit access to share this sheet', 403);
  }

  // Check if user is trying to share with themselves
  const sharedByUser = await prisma.user.findUnique({
    where: { id: sharedById },
  });

  if (sharedByUser?.email === sharedWithEmail) {
    throw new AppError('Cannot share sheet with yourself', 400);
  }

  // Find the user being shared with (if they exist)
  const sharedWithUser = await prisma.user.findUnique({
    where: { email: sharedWithEmail },
  });

  // Create or update the share
  const share = await prisma.sheetShare.upsert({
    where: {
      sheetId_sharedWithEmail: {
        sheetId,
        sharedWithEmail,
      },
    },
    update: {
      permission,
    },
    create: {
      sheetId,
      sharedById,
      sharedWithId: sharedWithUser?.id,
      sharedWithEmail,
      permission,
    },
    include: {
      sharedWith: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return share;
}

export async function getSheetShares(sheetId: string, userId: string) {
  // Check if user has access to this sheet
  const sheet = await prisma.sheet.findUnique({
    where: { id: sheetId },
  });

  if (!sheet) {
    throw new AppError('Sheet not found', 404);
  }

  // Check if user is owner or has editor permission
  const isOwner = sheet.userId === userId;
  const shareAccess = await prisma.sheetShare.findFirst({
    where: {
      sheetId,
      sharedWithId: userId,
      permission: 'EDITOR',
    },
  });

  if (!isOwner && !shareAccess) {
    throw new AppError('You need edit access to view shares', 403);
  }

  return await prisma.sheetShare.findMany({
    where: { sheetId },
    include: {
      sharedWith: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function removeShare(shareId: string, userId: string) {
  const share = await prisma.sheetShare.findUnique({
    where: { id: shareId },
    include: {
      sheet: true,
    },
  });

  if (!share) {
    throw new AppError('Share not found', 404);
  }

  // Only the sheet owner can remove shares
  if (share.sheet.userId !== userId) {
    throw new AppError('Only the sheet owner can remove shares', 403);
  }

  await prisma.sheetShare.delete({
    where: { id: shareId },
  });

  return { success: true };
}
