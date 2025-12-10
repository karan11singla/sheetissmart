import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

interface LoginInput {
  email: string;
  password: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

export async function register(data: RegisterInput) {
  // Normalize email to lowercase
  const normalizedEmail = data.email.toLowerCase().trim();

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new AppError('User with this email already exists', 400);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: hashedPassword,
      name: data.name,
    },
  });

  // Link any pending shares that were created before this user registered
  await prisma.sheetShare.updateMany({
    where: {
      sharedWithEmail: normalizedEmail,
      sharedWithId: null,
    },
    data: {
      sharedWithId: user.id,
    },
  });

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token,
  };
}

export async function login(data: LoginInput) {
  // Normalize email to lowercase
  const normalizedEmail = data.email.toLowerCase().trim();

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(data.password, user.password);

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token,
  };
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
}

export async function getAllUsers(search?: string) {
  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    select: {
      id: true,
      email: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
    take: 50, // Limit to 50 users
  });

  return users;
}

export async function updateProfile(userId: string, data: { name?: string; email?: string }) {
  // Normalize email if it's being updated
  const updateData = { ...data };
  if (updateData.email) {
    updateData.email = updateData.email.toLowerCase().trim();

    // Check if it's already taken
    const existingUser = await prisma.user.findFirst({
      where: {
        email: updateData.email,
        NOT: { id: userId },
      },
    });

    if (existingUser) {
      throw new AppError('Email already in use', 400);
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!isPasswordValid) {
    throw new AppError('Current password is incorrect', 401);
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return { message: 'Password changed successfully' };
}

export async function getUserStats(userId: string) {
  const [ownedSheets, sharedWithMe] = await Promise.all([
    prisma.sheet.count({
      where: { userId },
    }),
    prisma.sheetShare.count({
      where: { sharedWithId: userId },
    }),
  ]);

  return {
    ownedSheets,
    sharedWithMe,
  };
}
