import prisma from '../config/database';
import type { ValidationType } from '@prisma/client';

export interface DataValidationData {
  id?: string;
  sheetId: string;
  range: string;
  type: ValidationType;
  criteria: string; // JSON string
  allowBlank?: boolean;
  showDropdown?: boolean;
  errorTitle?: string | null;
  errorMessage?: string | null;
  inputTitle?: string | null;
  inputMessage?: string | null;
}

// Create a new data validation rule
export async function createDataValidation(data: DataValidationData) {
  return await prisma.dataValidation.create({
    data: {
      sheetId: data.sheetId,
      range: data.range,
      type: data.type,
      criteria: data.criteria,
      allowBlank: data.allowBlank ?? true,
      showDropdown: data.showDropdown ?? true,
      errorTitle: data.errorTitle,
      errorMessage: data.errorMessage,
      inputTitle: data.inputTitle,
      inputMessage: data.inputMessage,
    },
  });
}

// Get all data validation rules for a sheet
export async function getDataValidations(sheetId: string) {
  return await prisma.dataValidation.findMany({
    where: { sheetId },
    orderBy: { createdAt: 'asc' },
  });
}

// Get a single data validation by ID
export async function getDataValidationById(id: string) {
  return await prisma.dataValidation.findUnique({
    where: { id },
  });
}

// Update a data validation rule
export async function updateDataValidation(id: string, data: Partial<DataValidationData>) {
  return await prisma.dataValidation.update({
    where: { id },
    data: {
      range: data.range,
      type: data.type,
      criteria: data.criteria,
      allowBlank: data.allowBlank,
      showDropdown: data.showDropdown,
      errorTitle: data.errorTitle,
      errorMessage: data.errorMessage,
      inputTitle: data.inputTitle,
      inputMessage: data.inputMessage,
    },
  });
}

// Delete a data validation rule
export async function deleteDataValidation(id: string) {
  return await prisma.dataValidation.delete({
    where: { id },
  });
}

// Get validation rules for a specific cell
export async function getValidationForCell(sheetId: string, cellRef: string) {
  const validations = await getDataValidations(sheetId);

  for (const validation of validations) {
    if (cellInRange(cellRef, validation.range)) {
      return validation;
    }
  }

  return null;
}

// Validate a cell value against its validation rules
export async function validateCellValue(
  sheetId: string,
  cellRef: string,
  value: any
): Promise<{ valid: boolean; message?: string }> {
  const validation = await getValidationForCell(sheetId, cellRef);

  if (!validation) {
    return { valid: true };
  }

  // Allow blank if configured
  if (validation.allowBlank && (value === '' || value === null || value === undefined)) {
    return { valid: true };
  }

  try {
    const criteria = JSON.parse(validation.criteria);

    switch (validation.type) {
      case 'LIST': {
        const validValues: string[] = criteria.values || [];
        const isValid = validValues.includes(String(value));
        return {
          valid: isValid,
          message: isValid ? undefined : validation.errorMessage || `Value must be one of: ${validValues.join(', ')}`,
        };
      }

      case 'NUMBER': {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          return {
            valid: false,
            message: validation.errorMessage || 'Value must be a number',
          };
        }

        const { min, max, integer } = criteria;

        if (integer && !Number.isInteger(numValue)) {
          return {
            valid: false,
            message: validation.errorMessage || 'Value must be a whole number',
          };
        }

        if (min !== undefined && numValue < min) {
          return {
            valid: false,
            message: validation.errorMessage || `Value must be at least ${min}`,
          };
        }

        if (max !== undefined && numValue > max) {
          return {
            valid: false,
            message: validation.errorMessage || `Value must be at most ${max}`,
          };
        }

        return { valid: true };
      }

      case 'TEXT_LENGTH': {
        const textValue = String(value);
        const { min, max } = criteria;

        if (min !== undefined && textValue.length < min) {
          return {
            valid: false,
            message: validation.errorMessage || `Text must be at least ${min} characters`,
          };
        }

        if (max !== undefined && textValue.length > max) {
          return {
            valid: false,
            message: validation.errorMessage || `Text must be at most ${max} characters`,
          };
        }

        return { valid: true };
      }

      case 'DATE': {
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          return {
            valid: false,
            message: validation.errorMessage || 'Value must be a valid date',
          };
        }

        const { minDate, maxDate } = criteria;

        if (minDate && dateValue < new Date(minDate)) {
          return {
            valid: false,
            message: validation.errorMessage || `Date must be on or after ${minDate}`,
          };
        }

        if (maxDate && dateValue > new Date(maxDate)) {
          return {
            valid: false,
            message: validation.errorMessage || `Date must be on or before ${maxDate}`,
          };
        }

        return { valid: true };
      }

      case 'CUSTOM_FORMULA': {
        // Custom formula validation would require formula evaluation
        // For now, just return valid
        return { valid: true };
      }

      default:
        return { valid: true };
    }
  } catch (error) {
    console.error('Error validating cell value:', error);
    return { valid: true }; // Fail open on error
  }
}

// Helper: Check if a cell is in a range
function cellInRange(cellRef: string, range: string): boolean {
  if (range.includes(':')) {
    const [start, end] = range.split(':');
    const cell = parseCellRef(cellRef);
    const startCell = parseCellRef(start);
    const endCell = parseCellRef(end);

    if (!cell || !startCell || !endCell) return false;

    return (
      cell.row >= startCell.row &&
      cell.row <= endCell.row &&
      cell.col >= startCell.col &&
      cell.col <= endCell.col
    );
  } else {
    return cellRef === range;
  }
}

function parseCellRef(ref: string): { col: number; row: number } | null {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;

  const colLetters = match[1];
  const rowNum = parseInt(match[2]) - 1;

  let col = 0;
  for (let i = 0; i < colLetters.length; i++) {
    col = col * 26 + (colLetters.charCodeAt(i) - 64);
  }
  col -= 1;

  return { col, row: rowNum };
}
