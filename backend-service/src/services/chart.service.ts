import prisma from '../config/database';
import type { ChartType } from '@prisma/client';

export interface ChartData {
  id?: string;
  sheetId: string;
  name: string;
  type: ChartType;
  dataRange: string;
  labelRange?: string | null;
  config: string; // JSON string
  position: string; // JSON string
}

// Create a new chart
export async function createChart(data: ChartData) {
  return await prisma.chart.create({
    data: {
      sheetId: data.sheetId,
      name: data.name,
      type: data.type,
      dataRange: data.dataRange,
      labelRange: data.labelRange,
      config: data.config,
      position: data.position,
    },
  });
}

// Get all charts for a sheet
export async function getCharts(sheetId: string) {
  return await prisma.chart.findMany({
    where: { sheetId },
    orderBy: { createdAt: 'asc' },
  });
}

// Get a single chart by ID
export async function getChartById(id: string) {
  return await prisma.chart.findUnique({
    where: { id },
  });
}

// Update a chart
export async function updateChart(id: string, data: Partial<ChartData>) {
  return await prisma.chart.update({
    where: { id },
    data: {
      name: data.name,
      type: data.type,
      dataRange: data.dataRange,
      labelRange: data.labelRange,
      config: data.config,
      position: data.position,
    },
  });
}

// Delete a chart
export async function deleteChart(id: string) {
  return await prisma.chart.delete({
    where: { id },
  });
}

// Helper function to parse range and get cell data
export function parseRange(range: string): { startCol: number; startRow: number; endCol: number; endRow: number } | null {
  const match = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  if (!match) return null;

  const startCol = columnLetterToIndex(match[1]);
  const startRow = parseInt(match[2]) - 1;
  const endCol = columnLetterToIndex(match[3]);
  const endRow = parseInt(match[4]) - 1;

  return { startCol, startRow, endCol, endRow };
}

function columnLetterToIndex(letters: string): number {
  let index = 0;
  for (let i = 0; i < letters.length; i++) {
    index = index * 26 + (letters.charCodeAt(i) - 64);
  }
  return index - 1; // 0-based
}
