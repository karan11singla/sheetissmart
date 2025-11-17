import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Plus, ArrowUp, ArrowDown, Filter, X, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Trash2, Star } from 'lucide-react';
import { sheetApi } from '../services/api';
import ShareModal from '../components/ShareModal';
import type { Column, Row, Cell } from '../types';

export default function SheetPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [cellValue, setCellValue] = useState<string>('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [sheetName, setSheetName] = useState('');
  const [sortConfig, setSortConfig] = useState<{ columnId: string; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);
  const filterPopupRef = useRef<HTMLDivElement>(null);
  const [selectedCell, setSelectedCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const cellInputRef = useRef<HTMLInputElement>(null);
  const [showFormulaAutocomplete, setShowFormulaAutocomplete] = useState(false);
  const [formulaSuggestions, setFormulaSuggestions] = useState<string[]>([]);
  const [rangeStartCell, setRangeStartCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);
  const [resizingColumn, setResizingColumn] = useState<{ id: string; startX: number; startWidth: number } | null>(null);
  const [resizingRow, setResizingRow] = useState<{ id: string; startY: number; startHeight: number } | null>(null);
  const [copiedCell, setCopiedCell] = useState<{ cellId: string; value: string; format: CellFormat } | null>(null);

  // Cell formatting state (stored per cell ID)
  type CellFormat = {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    align?: 'left' | 'center' | 'right';
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    numberFormat?: 'general' | 'number' | 'currency' | 'percentage' | 'date';
    decimals?: number;
    borderStyle?: 'none' | 'solid';
    borderColor?: string;
    borderWidth?: string;
  };
  const [cellFormats, setCellFormats] = useState<Record<string, CellFormat>>({});

  // Available formula functions
  const FORMULA_FUNCTIONS = [
    { name: 'SUM', description: 'Sum of values' },
    { name: 'AVG', description: 'Average of values' },
    { name: 'COUNT', description: 'Count of values' },
    { name: 'MIN', description: 'Minimum value' },
    { name: 'MAX', description: 'Maximum value' },
    { name: 'PRODUCT', description: 'Multiply all values' },
    { name: 'CONCAT', description: 'Concatenate text' },
    { name: 'IF', description: 'Conditional: IF(condition,true,false)' },
  ];

  const { data: sheet, isLoading } = useQuery({
    queryKey: ['sheets', id],
    queryFn: () => sheetApi.getById(id!),
    enabled: !!id,
  });

  const updateCellMutation = useMutation({
    mutationFn: ({ cellId, value }: { cellId: string; value: any }) =>
      sheetApi.updateCell(id!, cellId, { value }),
    onSuccess: () => {
      // Refetch to get updated computed values for all formulas
      queryClient.invalidateQueries({ queryKey: ['sheets', id] });
      setEditingCell(null);
      setCellValue('');
    },
  });

  const addColumnMutation = useMutation({
    mutationFn: () => {
      const columnIndex = sheet?.columns?.length || 0;
      const columnName = getColumnLetter(columnIndex);
      return sheetApi.createColumn(id!, {
        name: columnName,
        position: columnIndex,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheets', id] });
    },
  });

  const addRowMutation = useMutation({
    mutationFn: () =>
      sheetApi.createRow(id!, {
        position: sheet?.rows?.length || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheets', id] });
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: (columnId: string) => sheetApi.deleteColumn(id!, columnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheets', id] });
    },
  });

  const deleteRowMutation = useMutation({
    mutationFn: (rowId: string) => sheetApi.deleteRow(id!, rowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheets', id] });
    },
  });

  const updateColumnMutation = useMutation({
    mutationFn: ({ columnId, width }: { columnId: string; width: number }) =>
      sheetApi.updateColumn(id!, columnId, { width }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheets', id] });
    },
  });

  const updateRowMutation = useMutation({
    mutationFn: ({ rowId, height }: { rowId: string; height: number }) =>
      sheetApi.updateRow(id!, rowId, { height }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheets', id] });
    },
  });

  const { data: shares = [] } = useQuery({
    queryKey: ['sheet-shares', id],
    queryFn: () => sheetApi.getSheetShares(id!),
    enabled: !!id && isShareModalOpen,
  });

  const shareMutation = useMutation({
    mutationFn: ({ email, permission }: { email: string; permission: 'VIEWER' | 'EDITOR' }) =>
      sheetApi.shareSheet(id!, email, permission),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheet-shares', id] });
    },
  });

  const removeShareMutation = useMutation({
    mutationFn: (shareId: string) => sheetApi.removeShare(shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheet-shares', id] });
    },
  });

  // Helper function to convert column index to letter (0 -> A, 1 -> B, 25 -> Z, 26 -> AA)
  const getColumnLetter = (colIndex: number): string => {
    let letter = '';
    let index = colIndex;
    while (index >= 0) {
      letter = String.fromCharCode(65 + (index % 26)) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  };

  // Helper function to get cell reference (e.g., A1, B2)
  const getCellReference = (rowIndex: number, colIndex: number): string => {
    return `${getColumnLetter(colIndex)}${rowIndex + 1}`;
  };

  // Check if we're in formula mode (editing and value starts with =)
  const isInFormulaMode = (): boolean => {
    return editingCell !== null && cellValue.trim().startsWith('=');
  };

  const handleCellClick = (cell: Cell, rowIndex?: number, colIndex?: number, shiftKey?: boolean) => {
    // If we're in formula mode and clicking a different cell, insert its reference
    if (isInFormulaMode() && editingCell !== cell.id && rowIndex !== undefined && colIndex !== undefined) {
      let newValue = cellValue;

      // Handle shift-click for range selection
      if (shiftKey && rangeStartCell) {
        const startRef = getCellReference(rangeStartCell.rowIndex, rangeStartCell.colIndex);
        const endRef = getCellReference(rowIndex, colIndex);
        const rangeRef = `${startRef}:${endRef}`;

        // Remove the last cell reference and replace with range
        // Find the last cell reference pattern (e.g., "B2" at the end)
        const lastCellRefMatch = cellValue.match(/([A-Z]+\d+)$/);
        if (lastCellRefMatch) {
          newValue = cellValue.substring(0, cellValue.lastIndexOf(lastCellRefMatch[0])) + rangeRef;
        } else {
          // If no cell ref at end, just append the range
          const isFirstReference = cellValue.endsWith('(');
          const separator = isFirstReference ? '' : ',';
          newValue = cellValue + separator + rangeRef;
        }

        setRangeStartCell(null); // Reset range start after completing range
      } else {
        // Regular click - add cell reference
        const cellRef = getCellReference(rowIndex, colIndex);
        const isFirstReference = cellValue.endsWith('(');
        const separator = isFirstReference ? '' : ',';
        newValue = cellValue + separator + cellRef;
        setRangeStartCell({ rowIndex, colIndex }); // Store as potential range start
      }

      setCellValue(newValue);

      // Keep focus on the input
      setTimeout(() => {
        cellInputRef.current?.focus();
      }, 0);
      return;
    }

    // Reset range start when not in formula mode
    setRangeStartCell(null);

    // Single click just selects the cell (doesn't start editing)
    if (rowIndex !== undefined && colIndex !== undefined) {
      setSelectedCell({ rowIndex, colIndex });
    }
  };

  const handleCellDoubleClick = (cell: Cell) => {
    // Double click starts editing
    setEditingCell(cell.id);
    setCellValue(cell.value ? JSON.parse(cell.value) : '');
    setShowFormulaAutocomplete(false);
  };

  const handleCellBlur = (cellId: string) => {
    setShowFormulaAutocomplete(false);

    // Auto-close unclosed parentheses in formulas
    let finalValue = cellValue;
    if (finalValue.startsWith('=')) {
      const openParens = (finalValue.match(/\(/g) || []).length;
      const closeParens = (finalValue.match(/\)/g) || []).length;
      if (openParens > closeParens) {
        finalValue += ')'.repeat(openParens - closeParens);
      }
    }

    updateCellMutation.mutate({ cellId, value: finalValue });
  };

  const handleCellValueChange = (value: string) => {
    setCellValue(value);

    // Check if we're typing a formula and show autocomplete
    if (value.startsWith('=')) {
      // Extract the function name being typed (after = and before ()
      const match = value.match(/=([A-Z]*)$/i);
      if (match) {
        const searchTerm = match[1].toUpperCase();

        if (searchTerm === '') {
          // Show all functions when just "=" is typed
          setFormulaSuggestions(FORMULA_FUNCTIONS.map(f => f.name));
          setShowFormulaAutocomplete(true);
        } else {
          // Filter functions as user types
          const suggestions = FORMULA_FUNCTIONS
            .filter(f => f.name.startsWith(searchTerm))
            .map(f => f.name);

          if (suggestions.length > 0) {
            setFormulaSuggestions(suggestions);
            setShowFormulaAutocomplete(true);
          } else {
            setShowFormulaAutocomplete(false);
          }
        }
      } else {
        // Hide autocomplete once function is complete (has parenthesis)
        setShowFormulaAutocomplete(false);
      }
    } else {
      setShowFormulaAutocomplete(false);
    }
  };

  const insertFormula = (functionName: string) => {
    // Replace the partial function name with the complete one
    const newValue = cellValue.replace(/=([A-Z]*)$/i, `=${functionName}(`);
    setCellValue(newValue);
    setShowFormulaAutocomplete(false);
    setTimeout(() => cellInputRef.current?.focus(), 0);
  };

  const getCellValue = (row: Row, column: Column): Cell | undefined => {
    return row.cells?.find((cell) => cell.columnId === column.id);
  };

  // Export functionality - can be added to File menu later
  // const handleDownloadCSV = async () => {
  //   try {
  //     const response = await api.get(`/api/v1/sheets/${id}/export`, {
  //       responseType: 'blob',
  //     });
  //     const url = window.URL.createObjectURL(new Blob([response.data]));
  //     const link = document.createElement('a');
  //     link.href = url;
  //     link.setAttribute('download', `${sheet?.name || 'sheet'}_export.csv`);
  //     document.body.appendChild(link);
  //     link.click();
  //     link.remove();
  //     window.URL.revokeObjectURL(url);
  //   } catch (error) {
  //     console.error('Failed to download CSV:', error);
  //   }
  // };

  const updateSheetMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => sheetApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheets', id] });
      setIsEditingName(false);
    },
  });

  const handleSaveName = () => {
    if (sheetName.trim() && sheetName !== sheet?.name) {
      updateSheetMutation.mutate({ name: sheetName });
    } else {
      setIsEditingName(false);
    }
  };

  // Close filter popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPopupRef.current && !filterPopupRef.current.contains(event.target as Node)) {
        setActiveFilterColumn(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle column resizing
  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizingColumn.startX;
      const newWidth = Math.max(60, resizingColumn.startWidth + delta); // Min width 60px

      // Update column width optimistically
      queryClient.setQueryData(['sheets', id], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          columns: oldData.columns?.map((col: any) =>
            col.id === resizingColumn.id ? { ...col, width: newWidth } : col
          ),
        };
      });
    };

    const handleMouseUp = () => {
      if (resizingColumn) {
        const column = sheet?.columns?.find(col => col.id === resizingColumn.id);
        if (column) {
          updateColumnMutation.mutate({ columnId: resizingColumn.id, width: column.width || 120 });
        }
      }
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, id, queryClient, sheet?.columns, updateColumnMutation]);

  // Handle row resizing
  useEffect(() => {
    if (!resizingRow) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientY - resizingRow.startY;
      const newHeight = Math.max(25, resizingRow.startHeight + delta); // Min height 25px

      // Update row height optimistically
      queryClient.setQueryData(['sheets', id], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          rows: oldData.rows?.map((row: any) =>
            row.id === resizingRow.id ? { ...row, height: newHeight } : row
          ),
        };
      });
    };

    const handleMouseUp = () => {
      if (resizingRow) {
        const row = sheet?.rows?.find(r => r.id === resizingRow.id);
        if (row) {
          updateRowMutation.mutate({ rowId: resizingRow.id, height: row.height || 35 });
        }
      }
      setResizingRow(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingRow, id, queryClient, sheet?.rows, updateRowMutation]);

  const handleFilterChange = (columnId: string, value: string) => {
    if (value === '') {
      const newFilters = { ...filters };
      delete newFilters[columnId];
      setFilters(newFilters);
    } else {
      setFilters({ ...filters, [columnId]: value });
    }
  };

  const clearFilter = (columnId: string) => {
    const newFilters = { ...filters };
    delete newFilters[columnId];
    setFilters(newFilters);
  };

  const clearAllFilters = () => {
    setFilters({});
  };

  // Get current cell for formatting
  const getCurrentCell = (): Cell | null => {
    if (!selectedCell || !sheet?.rows || !sheet?.columns) return null;
    const row = filteredAndSortedRows[selectedCell.rowIndex];
    const column = sheet.columns[selectedCell.colIndex];
    return row?.cells?.find((c) => c.columnId === column.id) || null;
  };

  // Apply formatting to current cell
  const applyFormat = (format: Partial<CellFormat>) => {
    const cell = getCurrentCell();
    if (!cell) return;

    setCellFormats((prev) => ({
      ...prev,
      [cell.id]: {
        ...prev[cell.id],
        ...format,
      },
    }));
  };

  // Toggle formatting
  const toggleBold = () => {
    const cell = getCurrentCell();
    if (!cell) return;
    const current = cellFormats[cell.id]?.bold || false;
    applyFormat({ bold: !current });
  };

  const toggleItalic = () => {
    const cell = getCurrentCell();
    if (!cell) return;
    const current = cellFormats[cell.id]?.italic || false;
    applyFormat({ italic: !current });
  };

  const toggleUnderline = () => {
    const cell = getCurrentCell();
    if (!cell) return;
    const current = cellFormats[cell.id]?.underline || false;
    applyFormat({ underline: !current });
  };

  const setAlignment = (align: 'left' | 'center' | 'right') => {
    const cell = getCurrentCell();
    if (!cell) return;
    applyFormat({ align });
  };

  const setFontSize = (fontSize: number) => {
    const cell = getCurrentCell();
    if (!cell) return;
    applyFormat({ fontSize });
  };

  const setTextColor = (color: string) => {
    const cell = getCurrentCell();
    if (!cell) return;
    applyFormat({ color });
  };

  const setBackgroundColor = (backgroundColor: string) => {
    const cell = getCurrentCell();
    if (!cell) return;
    applyFormat({ backgroundColor });
  };

  const setNumberFormat = (numberFormat: 'general' | 'number' | 'currency' | 'percentage' | 'date') => {
    const cell = getCurrentCell();
    if (!cell) return;
    applyFormat({ numberFormat, decimals: numberFormat === 'general' ? undefined : 2 });
  };

  const toggleBorder = () => {
    const cell = getCurrentCell();
    if (!cell) return;
    const currentBorder = cellFormats[cell.id]?.borderStyle;
    applyFormat({
      borderStyle: currentBorder === 'solid' ? 'none' : 'solid',
      borderColor: '#000000',
      borderWidth: '2px',
    });
  };

  // Format a cell value based on its number format
  const formatCellValue = (value: any, format?: CellFormat): string => {
    if (!format?.numberFormat || format.numberFormat === 'general') {
      return String(value);
    }

    const num = parseFloat(value);
    if (isNaN(num)) return String(value);

    const decimals = format.decimals ?? 2;

    switch (format.numberFormat) {
      case 'number':
        return num.toFixed(decimals);
      case 'currency':
        return `$${num.toFixed(decimals)}`;
      case 'percentage':
        return `${(num * 100).toFixed(decimals)}%`;
      case 'date':
        try {
          return new Date(value).toLocaleDateString();
        } catch {
          return String(value);
        }
      default:
        return String(value);
    }
  };

  // Get current cell format
  const getCurrentFormat = (): CellFormat => {
    const cell = getCurrentCell();
    if (!cell) return {};
    return cellFormats[cell.id] || {};
  };

  // Filter and sort rows based on filters and sortConfig
  const filteredAndSortedRows = useMemo(() => {
    if (!sheet?.rows) return [];

    // First apply filters
    let filtered = sheet.rows;
    if (Object.keys(filters).length > 0) {
      filtered = sheet.rows.filter((row) => {
        return Object.entries(filters).every(([columnId, filterValue]) => {
          const cell = row.cells?.find((c) => c.columnId === columnId);
          if (!cell || !cell.value) return filterValue === '';

          try {
            const value = JSON.parse(cell.value);
            return String(value).toLowerCase().includes(filterValue.toLowerCase());
          } catch {
            return false;
          }
        });
      });
    }

    // Then apply sorting
    if (!sortConfig) return filtered;

    const sorted = [...filtered].sort((a, b) => {
      const cellA = a.cells?.find((c) => c.columnId === sortConfig.columnId);
      const cellB = b.cells?.find((c) => c.columnId === sortConfig.columnId);

      let valueA: string | number = '';
      let valueB: string | number = '';

      try {
        valueA = cellA?.value ? JSON.parse(cellA.value) : '';
        valueB = cellB?.value ? JSON.parse(cellB.value) : '';
      } catch {
        valueA = cellA?.value || '';
        valueB = cellB?.value || '';
      }

      // Try to parse as numbers
      const numA = typeof valueA === 'string' ? parseFloat(valueA) : valueA;
      const numB = typeof valueB === 'string' ? parseFloat(valueB) : valueB;

      // If both are valid numbers, compare numerically
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      }

      // Otherwise compare as strings
      const strA = String(valueA).toLowerCase();
      const strB = String(valueB).toLowerCase();

      if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [sheet?.rows, sortConfig, filters]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell || !sheet?.columns || !filteredAndSortedRows.length) return;
      if (editingCell) return; // Don't navigate while editing

      const { rowIndex, colIndex } = selectedCell;
      const numRows = filteredAndSortedRows.length;
      const numCols = sheet.columns.length;

      let newRowIndex = rowIndex;
      let newColIndex = colIndex;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          newRowIndex = Math.max(0, rowIndex - 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          newRowIndex = Math.min(numRows - 1, rowIndex + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          newColIndex = Math.max(0, colIndex - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          newColIndex = Math.min(numCols - 1, colIndex + 1);
          break;
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            // Shift+Tab: move left
            newColIndex = colIndex - 1;
            if (newColIndex < 0) {
              newColIndex = numCols - 1;
              newRowIndex = Math.max(0, rowIndex - 1);
            }
          } else {
            // Tab: move right
            newColIndex = colIndex + 1;
            if (newColIndex >= numCols) {
              newColIndex = 0;
              newRowIndex = Math.min(numRows - 1, rowIndex + 1);
            }
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (e.shiftKey) {
            // Shift+Enter: move up
            newRowIndex = Math.max(0, rowIndex - 1);
          } else {
            // Enter: start editing the selected cell
            const row = filteredAndSortedRows[rowIndex];
            const column = sheet.columns[colIndex];
            const cell = row.cells?.find((c) => c.columnId === column.id);
            if (cell) {
              handleCellDoubleClick(cell);
              return;
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          setSelectedCell(null);
          return;
        default:
          // Handle copy (Ctrl+C or Cmd+C)
          if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault();
            const row = filteredAndSortedRows[rowIndex];
            const column = sheet.columns[colIndex];
            const cell = row.cells?.find((c) => c.columnId === column.id);
            if (cell) {
              setCopiedCell({
                cellId: cell.id,
                value: cell.value ? JSON.parse(cell.value) : '',
                format: cellFormats[cell.id] || {},
              });
            }
            return;
          }

          // Handle paste (Ctrl+V or Cmd+V)
          if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            e.preventDefault();
            if (copiedCell) {
              const row = filteredAndSortedRows[rowIndex];
              const column = sheet.columns[colIndex];
              const cell = row.cells?.find((c) => c.columnId === column.id);
              if (cell) {
                // Paste value
                updateCellMutation.mutate({ cellId: cell.id, value: copiedCell.value });
                // Paste formatting
                if (Object.keys(copiedCell.format).length > 0) {
                  setCellFormats((prev) => ({
                    ...prev,
                    [cell.id]: copiedCell.format,
                  }));
                }
              }
            }
            return;
          }

          // Start editing on alphanumeric keys and clear existing content
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const row = filteredAndSortedRows[rowIndex];
            const column = sheet.columns[colIndex];
            const cell = row.cells?.find((c) => c.columnId === column.id);
            if (cell) {
              setEditingCell(cell.id);
              setCellValue(e.key); // Start with the typed key, clearing old content
              setShowFormulaAutocomplete(false);
            }
          }
          return;
      }

      setSelectedCell({ rowIndex: newRowIndex, colIndex: newColIndex });
    };

    if (tableRef.current) {
      tableRef.current.addEventListener('keydown', handleKeyDown as any);
      return () => tableRef.current?.removeEventListener('keydown', handleKeyDown as any);
    }
  }, [selectedCell, sheet, filteredAndSortedRows, editingCell]);

  const handleSort = (columnId: string) => {
    setSortConfig((current) => {
      if (current?.columnId === columnId) {
        // Toggle direction or clear sort
        if (current.direction === 'asc') {
          return { columnId, direction: 'desc' };
        } else {
          return null; // Clear sort
        }
      } else {
        // New column, start with ascending
        return { columnId, direction: 'asc' };
      }
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p className="mt-2 text-gray-600">Loading sheet...</p>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Sheet not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Smartsheet-style Menu Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center space-x-4">
            <button className="text-sm text-gray-700 hover:text-gray-900 px-2 py-1 hover:bg-gray-100 rounded transition-colors">
              File
            </button>
            <button className="text-sm text-gray-700 hover:text-gray-900 px-2 py-1 hover:bg-gray-100 rounded transition-colors">
              Automation
            </button>
            <button className="text-sm text-gray-700 hover:text-gray-900 px-2 py-1 hover:bg-gray-100 rounded transition-colors">
              Forms
            </button>
            <button className="text-sm text-gray-700 hover:text-gray-900 px-2 py-1 hover:bg-gray-100 rounded transition-colors">
              Connections
            </button>
            <button className="text-sm text-gray-700 hover:text-gray-900 px-2 py-1 hover:bg-gray-100 rounded transition-colors">
              Dynamic View
            </button>
          </div>
          <div className="flex items-center space-x-2">
            {isEditingName ? (
              <input
                type="text"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                autoFocus
                className="text-sm font-medium text-gray-900 border-b border-blue-500 px-2 py-1 focus:outline-none"
              />
            ) : (
              <button
                onClick={() => {
                  setSheetName(sheet.name);
                  setIsEditingName(true);
                }}
                className="text-sm font-medium text-gray-900 hover:text-blue-600 flex items-center space-x-1"
              >
                <span>{sheet.name}</span>
                <Star className="h-4 w-4 text-gray-400" />
              </button>
            )}
            {(sheet as any).isOwner !== false && (
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="inline-flex items-center px-4 py-1.5 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors text-sm font-medium"
              >
                Share
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          {isInFormulaMode() && (
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-green-100 text-green-800 px-4 py-1.5 rounded-full text-xs font-medium shadow-sm border border-green-200 z-30">
              <span className="font-semibold">Formula Mode:</span> Click cells to add references
            </div>
          )}
          <div className="flex items-center space-x-4">
            {/* Add Row/Column */}
            <div className="flex items-center space-x-1 border-r border-gray-300 pr-4">
              <button
                onClick={() => addColumnMutation.mutate()}
                disabled={addColumnMutation.isPending}
                className="inline-flex items-center px-2 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Add Column"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Col
              </button>
              <button
                onClick={() => addRowMutation.mutate()}
                disabled={addRowMutation.isPending}
                className="inline-flex items-center px-2 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Add Row"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Row
              </button>
            </div>

            {/* Text Formatting */}
            <div className="flex items-center space-x-1">
              <button
                onClick={toggleBold}
                disabled={!selectedCell}
                className={`p-1.5 rounded border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  getCurrentFormat().bold
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                }`}
                title="Bold (Ctrl+B)"
              >
                <Bold className="h-4 w-4" />
              </button>
              <button
                onClick={toggleItalic}
                disabled={!selectedCell}
                className={`p-1.5 rounded border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  getCurrentFormat().italic
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                }`}
                title="Italic (Ctrl+I)"
              >
                <Italic className="h-4 w-4" />
              </button>
              <button
                onClick={toggleUnderline}
                disabled={!selectedCell}
                className={`p-1.5 rounded border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  getCurrentFormat().underline
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                }`}
                title="Underline (Ctrl+U)"
              >
                <Underline className="h-4 w-4" />
              </button>
            </div>

            {/* Text Alignment */}
            <div className="flex items-center space-x-1 border-l border-gray-300 pl-4">
              <button
                onClick={() => setAlignment('left')}
                disabled={!selectedCell}
                className={`p-1.5 rounded border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  getCurrentFormat().align === 'left'
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                }`}
                title="Align Left"
              >
                <AlignLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setAlignment('center')}
                disabled={!selectedCell}
                className={`p-1.5 rounded border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  getCurrentFormat().align === 'center'
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                }`}
                title="Align Center"
              >
                <AlignCenter className="h-4 w-4" />
              </button>
              <button
                onClick={() => setAlignment('right')}
                disabled={!selectedCell}
                className={`p-1.5 rounded border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  getCurrentFormat().align === 'right'
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                }`}
                title="Align Right"
              >
                <AlignRight className="h-4 w-4" />
              </button>
            </div>

            {/* Font Size and Color */}
            <div className="flex items-center space-x-1 border-l border-gray-300 pl-4">
              <select
                value={getCurrentFormat().fontSize || 14}
                onChange={(e) => setFontSize(Number(e.target.value))}
                disabled={!selectedCell}
                className="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Font Size"
              >
                <option value={10}>10</option>
                <option value={12}>12</option>
                <option value={14}>14</option>
                <option value={16}>16</option>
                <option value={18}>18</option>
                <option value={20}>20</option>
                <option value={24}>24</option>
              </select>
              <div className="relative" title="Text Color">
                <input
                  type="color"
                  value={getCurrentFormat().color || '#000000'}
                  onChange={(e) => setTextColor(e.target.value)}
                  disabled={!selectedCell}
                  className="w-8 h-8 rounded border border-gray-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                />
              </div>
              <div className="relative" title="Background Color">
                <input
                  type="color"
                  value={getCurrentFormat().backgroundColor || '#ffffff'}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  disabled={!selectedCell}
                  className="w-8 h-8 rounded border border-gray-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Number Format */}
            <div className="flex items-center space-x-1 border-l border-gray-300 pl-4">
              <select
                value={getCurrentFormat().numberFormat || 'general'}
                onChange={(e) => setNumberFormat(e.target.value as any)}
                disabled={!selectedCell}
                className="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Number Format"
              >
                <option value="general">General</option>
                <option value="number">Number</option>
                <option value="currency">Currency</option>
                <option value="percentage">Percentage</option>
                <option value="date">Date</option>
              </select>
            </div>

            {/* Borders */}
            <div className="flex items-center space-x-1 border-l border-gray-300 pl-4">
              <button
                onClick={toggleBorder}
                disabled={!selectedCell}
                className={`px-2 py-1.5 rounded border text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  getCurrentFormat().borderStyle === 'solid'
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                }`}
                title="Toggle Border"
              >
                Border
              </button>
            </div>
          </div>
          {Object.keys(filters).length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-600">
                {Object.keys(filters).length} filter{Object.keys(filters).length > 1 ? 's' : ''} active
              </span>
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
              >
                <X className="h-3 w-3 mr-1" />
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sheet Grid */}
      <div className="flex-1 overflow-auto bg-gray-50 p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div
            ref={tableRef}
            className="overflow-auto outline-none"
            tabIndex={0}
            onFocus={() => {
              // Auto-select first cell if none selected
              if (!selectedCell && filteredAndSortedRows.length > 0 && sheet?.columns?.length) {
                setSelectedCell({ rowIndex: 0, colIndex: 0 });
              }
            }}
          >
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky top-0 left-0 z-20 w-12 px-3 py-2 text-center text-xs font-medium text-gray-700 bg-gray-100 border-b border-r border-gray-300">

                  </th>
                  {sheet.columns?.map((column: Column, index: number) => (
                    <th
                      key={column.id}
                      style={{ minWidth: column.width || 120, maxWidth: column.width || 120, position: 'relative' }}
                      className={`sticky top-0 z-10 px-3 py-2 text-left text-xs font-medium text-gray-700 bg-gray-100 border-b border-gray-300 ${
                        index !== 0 ? 'border-l border-gray-200' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className="truncate cursor-pointer hover:text-gray-900 font-semibold"
                            onClick={() => handleSort(column.id)}
                          >
                            {column.name}
                          </span>
                          {sortConfig?.columnId === column.id && (
                            <span className="text-blue-600">
                              {sortConfig.direction === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )}
                            </span>
                          )}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveFilterColumn(activeFilterColumn === column.id ? null : column.id);
                              }}
                              className={`p-0.5 rounded hover:bg-gray-200 transition-colors ${
                                filters[column.id] ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                              }`}
                            >
                              <Filter className="h-3 w-3" />
                            </button>
                            {activeFilterColumn === column.id && (
                              <div
                                ref={filterPopupRef}
                                className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50 w-64"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold text-gray-700">Filter by {column.name}</span>
                                  <button
                                    onClick={() => setActiveFilterColumn(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={filters[column.id] || ''}
                                  onChange={(e) => handleFilterChange(column.id, e.target.value)}
                                  placeholder="Type to filter..."
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                                {filters[column.id] && (
                                  <button
                                    onClick={() => clearFilter(column.id)}
                                    className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                                  >
                                    Clear filter
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete column "${column.name}"? This will permanently delete all data in this column.`)) {
                                deleteColumnMutation.mutate(column.id);
                              }
                            }}
                            className="p-0.5 rounded hover:bg-red-100 transition-colors text-gray-400 hover:text-red-600"
                            title="Delete column"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      {/* Resize handle */}
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 hover:w-1.5"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setResizingColumn({
                            id: column.id,
                            startX: e.clientX,
                            startWidth: column.width || 120,
                          });
                        }}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedRows && filteredAndSortedRows.length > 0 ? (
                  filteredAndSortedRows.map((row: Row, rowIndex: number) => (
                    <tr
                      key={row.id}
                      className="bg-white hover:bg-gray-50/50"
                    >
                      <td className="sticky left-0 z-10 px-3 py-0 text-center text-xs font-medium text-gray-600 bg-gray-100 border-r border-b border-gray-200 group relative" style={{ height: row.height || 35 }}>
                        <div className="flex items-center justify-center space-x-1" style={{ height: row.height || 35 }}>
                          <span>{rowIndex + 1}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete row ${rowIndex + 1}? This will permanently delete all data in this row.`)) {
                                deleteRowMutation.mutate(row.id);
                              }
                            }}
                            className="p-0.5 rounded hover:bg-red-100 transition-colors text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
                            title="Delete row"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        {/* Resize handle */}
                        <div
                          className="absolute bottom-0 left-0 w-full h-1 cursor-row-resize hover:bg-blue-500 hover:h-1.5"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setResizingRow({
                              id: row.id,
                              startY: e.clientY,
                              startHeight: row.height || 35,
                            });
                          }}
                        />
                      </td>
                      {sheet.columns?.map((column: Column, colIndex: number) => {
                        const cell = getCellValue(row, column);
                        const isEditing = editingCell === cell?.id;
                        const isSelected = selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === colIndex;
                        const inFormulaMode = isInFormulaMode() && !isEditing;
                        const isCopied = copiedCell?.cellId === cell?.id;

                        return (
                          <td
                            key={`${row.id}-${column.id}`}
                            className={`px-2 py-0 text-sm text-gray-900 border-b border-gray-200 ${
                              colIndex !== 0 ? 'border-l border-gray-200' : ''
                            } ${
                              inFormulaMode
                                ? 'cursor-crosshair hover:bg-green-100 hover:ring-2 hover:ring-inset hover:ring-green-400'
                                : !isEditing
                                ? 'cursor-pointer hover:bg-blue-50'
                                : ''
                            } ${isSelected && !isEditing ? 'ring-2 ring-inset ring-blue-600 bg-blue-50/50' : ''} ${isCopied ? 'ring-2 ring-inset ring-dashed ring-green-600' : ''}`}
                            style={{ height: row.height || 35 }}
                            onMouseDown={(e) => {
                              // Prevent blur on input when clicking cells in formula mode
                              if (inFormulaMode) {
                                e.preventDefault();
                              }
                            }}
                            onClick={(e) => {
                              if (cell) {
                                setSelectedCell({ rowIndex, colIndex });
                                handleCellClick(cell, rowIndex, colIndex, e.shiftKey);
                              }
                            }}
                            onDoubleClick={() => {
                              if (cell) {
                                handleCellDoubleClick(cell);
                              }
                            }}
                          >
                            {isEditing ? (
                              <div className="relative">
                                <input
                                  ref={cellInputRef}
                                  type="text"
                                  value={cellValue}
                                  onChange={(e) => handleCellValueChange(e.target.value)}
                                  onBlur={() => cell && handleCellBlur(cell.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      if (showFormulaAutocomplete && formulaSuggestions.length > 0) {
                                        insertFormula(formulaSuggestions[0]);
                                        e.preventDefault();
                                      } else {
                                        cell && handleCellBlur(cell.id);
                                      }
                                    } else if (e.key === 'Escape') {
                                      setEditingCell(null);
                                      setCellValue('');
                                      setShowFormulaAutocomplete(false);
                                    } else if (e.key === 'Tab' && showFormulaAutocomplete && formulaSuggestions.length > 0) {
                                      insertFormula(formulaSuggestions[0]);
                                      e.preventDefault();
                                    }
                                  }}
                                  autoFocus
                                  className={`w-full h-9 px-2 py-1.5 border-2 focus:outline-none bg-white ${
                                    isInFormulaMode()
                                      ? 'border-green-500 focus:ring-1 focus:ring-green-500'
                                      : 'border-blue-600 focus:ring-1 focus:ring-blue-600'
                                  }`}
                                />
                                {showFormulaAutocomplete && formulaSuggestions.length > 0 && (
                                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 min-w-[200px]">
                                    {formulaSuggestions.map((suggestion) => {
                                      const func = FORMULA_FUNCTIONS.find(f => f.name === suggestion);
                                      return (
                                        <button
                                          key={suggestion}
                                          type="button"
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            insertFormula(suggestion);
                                          }}
                                          className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                                        >
                                          <div className="font-medium text-sm text-gray-900">{suggestion}</div>
                                          {func && <div className="text-xs text-gray-500">{func.description}</div>}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div
                                className="h-9 flex items-center px-1 truncate"
                                style={{
                                  fontWeight: cell && cellFormats[cell.id]?.bold ? 'bold' : 'normal',
                                  fontStyle: cell && cellFormats[cell.id]?.italic ? 'italic' : 'normal',
                                  textDecoration: cell && cellFormats[cell.id]?.underline ? 'underline' : 'none',
                                  justifyContent: cell && cellFormats[cell.id]?.align
                                    ? cellFormats[cell.id]!.align === 'left'
                                      ? 'flex-start'
                                      : cellFormats[cell.id]!.align === 'right'
                                      ? 'flex-end'
                                      : 'center'
                                    : 'flex-start',
                                  fontSize: cell && cellFormats[cell.id]?.fontSize ? `${cellFormats[cell.id]!.fontSize}px` : '14px',
                                  color: cell && cellFormats[cell.id]?.color ? cellFormats[cell.id]!.color : '#000000',
                                  backgroundColor: cell && cellFormats[cell.id]?.backgroundColor ? cellFormats[cell.id]!.backgroundColor : 'transparent',
                                  border: cell && cellFormats[cell.id]?.borderStyle === 'solid'
                                    ? `${cellFormats[cell.id]!.borderWidth || '2px'} ${cellFormats[cell.id]!.borderStyle} ${cellFormats[cell.id]!.borderColor || '#000000'}`
                                    : 'none',
                                  width: '100%',
                                }}
                              >
                                {cell?.value ? (() => {
                                  const parsedValue = JSON.parse(cell.value);
                                  let displayValue;
                                  // If it's a formula and we have a computed value, show that
                                  if (typeof parsedValue === 'string' && parsedValue.startsWith('=')) {
                                    displayValue = (cell as any).computedValue !== undefined
                                      ? (cell as any).computedValue
                                      : parsedValue;
                                  } else {
                                    displayValue = parsedValue;
                                  }
                                  // Apply number formatting
                                  return formatCellValue(displayValue, cell ? cellFormats[cell.id] : undefined);
                                })() : ''}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={(sheet.columns?.length || 0) + 1}
                      className="px-6 py-16 text-center"
                    >
                      <div className="text-gray-400">
                        <p className="text-sm font-medium">No rows yet</p>
                        <p className="text-xs mt-1">Click "Add Row" to get started</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        sheetId={id!}
        shares={shares}
        onShare={async (email, permission) => {
          await shareMutation.mutateAsync({ email, permission });
        }}
        onRemoveShare={async (shareId) => {
          await removeShareMutation.mutateAsync(shareId);
        }}
      />
    </div>
  );
}
