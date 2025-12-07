import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { X, Star } from 'lucide-react';
import { sheetApi } from '../services/api';
import ShareModal from '../components/ShareModal';
import RightSidebar from '../components/RightSidebar';
import CommentsPanel from '../components/CommentsPanel';
import SheetTable from '../components/SheetTable/SheetTable';
import MenuBar from '../components/MenuBar';
import Toolbar from '../components/Toolbar';
import FilterPanel from '../components/FilterPanel';
import SearchPanel from '../components/SearchPanel';
import type { Cell } from '../types';
import { useUndoRedoStore } from '../store/undoRedoStore';
import { UpdateCellCommand, AddRowCommand, AddColumnCommand, DeleteRowCommand, DeleteColumnCommand } from '../store/commands';

export default function SheetPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { executeCommand, undo, redo, canUndo, canRedo, clear: clearUndoStack } = useUndoRedoStore();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCommentSidebarOpen, setIsCommentSidebarOpen] = useState(false);
  const [selectedRowForComment, setSelectedRowForComment] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [sheetName, setSheetName] = useState('');
  const [sortConfig, setSortConfig] = useState<{ columnId: string; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100); // Zoom percentage (50-200%)

  // Cell formatting state (stored per cell ID)
  type CellFormat = {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    align?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'middle' | 'bottom';
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    backgroundColor?: string;
    numberFormat?: 'general' | 'number' | 'currency' | 'percentage' | 'date';
    decimals?: number;
    borderStyle?: 'none' | 'solid';
    borderColor?: string;
    borderWidth?: string;
    wrap?: boolean;
  };
  const [cellFormats, setCellFormats] = useState<Record<string, CellFormat>>({});
  const [selectedCell, setSelectedCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);

  // Multi-cell selection range
  type CellRange = {
    start: { rowIndex: number; colIndex: number };
    end: { rowIndex: number; colIndex: number };
  };
  const [selectionRange, setSelectionRange] = useState<CellRange | null>(null);

  // Freeze panes state
  const [frozenRows, setFrozenRows] = useState(0);
  const [frozenColumns, setFrozenColumns] = useState(0);

  // Clipboard state for copy/paste
  type ClipboardData = {
    value: any;
    format: CellFormat;
    cellId: string;
    isCut: boolean;
  };
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);

  const { data: sheet, isLoading } = useQuery({
    queryKey: ['sheets', id],
    queryFn: () => sheetApi.getById(id!),
    enabled: !!id,
  });

  // Copy/Cut/Paste handlers
  const handleCopy = () => {
    if (!selectedCell || !sheet?.rows || !sheet?.columns) return;

    const row = sheet.rows[selectedCell.rowIndex];
    const column = sheet.columns[selectedCell.colIndex];
    const cell = row.cells?.find((c) => c.columnId === column.id);

    if (!cell) return;

    const value = cell.value ? JSON.parse(cell.value) : '';
    const format = cellFormats[cell.id] || {};

    setClipboard({
      value,
      format,
      cellId: cell.id,
      isCut: false,
    });
  };

  const handleCut = () => {
    if (!selectedCell || !sheet?.rows || !sheet?.columns) return;

    const row = sheet.rows[selectedCell.rowIndex];
    const column = sheet.columns[selectedCell.colIndex];
    const cell = row.cells?.find((c) => c.columnId === column.id);

    if (!cell) return;

    const value = cell.value ? JSON.parse(cell.value) : '';
    const format = cellFormats[cell.id] || {};

    setClipboard({
      value,
      format,
      cellId: cell.id,
      isCut: true,
    });
  };

  const handlePaste = async () => {
    if (!clipboard || !selectedCell || !sheet?.rows || !sheet?.columns || isViewOnly) return;

    const row = sheet.rows[selectedCell.rowIndex];
    const column = sheet.columns[selectedCell.colIndex];
    const targetCell = row.cells?.find((c) => c.columnId === column.id);

    if (!targetCell) return;

    // Paste value and formatting
    await sheetApi.updateCell(id!, targetCell.id, {
      value: clipboard.value,
      textColor: clipboard.format.color,
      backgroundColor: clipboard.format.backgroundColor,
      fontSize: clipboard.format.fontSize,
      bold: clipboard.format.bold,
      italic: clipboard.format.italic,
      underline: clipboard.format.underline,
      textAlign: clipboard.format.align,
      hasBorder: clipboard.format.borderStyle === 'solid',
      numberFormat: clipboard.format.numberFormat,
      decimalPlaces: clipboard.format.decimals,
    });

    // Update local format state
    setCellFormats((prev) => ({
      ...prev,
      [targetCell.id]: clipboard.format,
    }));

    // If it was a cut operation, clear the original cell
    if (clipboard.isCut) {
      await sheetApi.updateCell(id!, clipboard.cellId, { value: '' });
      setClipboard(null); // Clear clipboard after cut+paste
    }

    // Invalidate queries to refresh the UI
    queryClient.invalidateQueries({ queryKey: ['sheets', id] });
  };

  // Keyboard shortcuts for undo/redo and copy/paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      // Ctrl+C or Cmd+C for copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
        e.preventDefault();
        handleCopy();
      }
      // Ctrl+X or Cmd+X for cut
      if ((e.ctrlKey || e.metaKey) && e.key === 'x' && !e.shiftKey) {
        e.preventDefault();
        handleCut();
      }
      // Ctrl+V or Cmd+V for paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !e.shiftKey) {
        e.preventDefault();
        handlePaste();
      }
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl+Y or Cmd+Shift+Z or Ctrl+Shift+Z for redo
      if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault();
        redo();
      }
      // Ctrl+F or Cmd+F for find/search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchPanelOpen(true);
      }
      // Ctrl++ or Cmd++ for zoom in
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
      }
      // Ctrl+- or Cmd+- for zoom out
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      }
      // Delete or Backspace to clear cell contents
      const viewOnly = sheet && (sheet as any).permission === 'VIEWER';
      if ((e.key === 'Delete' || e.key === 'Backspace') && !viewOnly) {
        e.preventDefault();
        // Handle multi-cell delete
        if (selectionRange && sheet?.rows && sheet?.columns) {
          const startRow = Math.min(selectionRange.start.rowIndex, selectionRange.end.rowIndex);
          const endRow = Math.max(selectionRange.start.rowIndex, selectionRange.end.rowIndex);
          const startCol = Math.min(selectionRange.start.colIndex, selectionRange.end.colIndex);
          const endCol = Math.max(selectionRange.start.colIndex, selectionRange.end.colIndex);

          for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
              const row = sheet.rows[r];
              const column = sheet.columns[c];
              if (row && column) {
                const cell = row.cells?.find(cell => cell.columnId === column.id);
                if (cell && cell.value) {
                  const command = new UpdateCellCommand(
                    id!,
                    cell.id,
                    '',
                    JSON.parse(cell.value),
                    queryClient
                  );
                  executeCommand(command);
                }
              }
            }
          }
          setSelectionRange(null);
        } else if (selectedCell && sheet?.rows && sheet?.columns) {
          // Single cell delete
          const row = sheet.rows[selectedCell.rowIndex];
          const column = sheet.columns[selectedCell.colIndex];
          if (row && column) {
            const cell = row.cells?.find(c => c.columnId === column.id);
            if (cell && cell.value) {
              const command = new UpdateCellCommand(
                id!,
                cell.id,
                '',
                JSON.parse(cell.value),
                queryClient
              );
              executeCommand(command);
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, clipboard, sheet, cellFormats, id, queryClient, handleCopy, handleCut, handlePaste, undo, redo, selectionRange, executeCommand]);

  // Load cell formatting from database when sheet loads
  useEffect(() => {
    if (!sheet?.rows) return;

    const formats: Record<string, CellFormat> = {};
    sheet.rows.forEach((row) => {
      row.cells?.forEach((cell) => {
        // Only add formatting if at least one formatting field is set
        if (
          cell.textColor ||
          cell.backgroundColor ||
          cell.fontSize ||
          cell.bold ||
          cell.italic ||
          cell.underline ||
          cell.textAlign ||
          cell.hasBorder ||
          cell.numberFormat ||
          cell.decimalPlaces !== undefined
        ) {
          formats[cell.id] = {
            color: cell.textColor,
            backgroundColor: cell.backgroundColor,
            fontSize: cell.fontSize,
            bold: cell.bold,
            italic: cell.italic,
            underline: cell.underline,
            align: cell.textAlign as 'left' | 'center' | 'right',
            borderStyle: cell.hasBorder ? 'solid' : 'none',
            numberFormat: cell.numberFormat as 'general' | 'number' | 'currency' | 'percentage' | 'date',
            decimals: cell.decimalPlaces,
          };
        }
      });
    });

    setCellFormats(formats);
  }, [sheet]);

  // Clear undo stack when switching sheets
  useEffect(() => {
    clearUndoStack();
  }, [id, clearUndoStack]);

  // Check if user has edit permission
  const isViewOnly = sheet && (sheet as any).permission === 'VIEWER';

  const updateColumnMutation = useMutation({
    mutationFn: ({ columnId, width, name }: { columnId: string; width?: number; name?: string }) =>
      sheetApi.updateColumn(id!, columnId, { width, name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheets', id] });
    },
  });

  const updateRowMutation = useMutation({
    mutationFn: ({ rowId, height, name }: { rowId: string; height?: number; name?: string }) =>
      sheetApi.updateRow(id!, rowId, { height, name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheets', id] });
    },
  });

  // Merge cells mutation
  const mergeCellsMutation = useMutation({
    mutationFn: ({ startRow, endRow, startCol, endCol }: {
      startRow: number;
      endRow: number;
      startCol: number;
      endCol: number;
    }) => sheetApi.mergeCells(id!, startRow, endRow, startCol, endCol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheets', id] });
    },
  });

  // Unmerge cells mutation
  const unmergeCellsMutation = useMutation({
    mutationFn: (cellId: string) => sheetApi.unmergeCells(id!, cellId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheets', id] });
    },
  });

  const handleDeleteRow = (rowId: string) => {
    const row = sheet?.rows?.find(r => r.id === rowId);
    if (!row) return;
    const command = new DeleteRowCommand(id!, rowId, row, queryClient);
    executeCommand(command);
  };

  const handleDeleteColumn = (columnId: string) => {
    const column = sheet?.columns?.find(c => c.id === columnId);
    if (!column) return;
    const command = new DeleteColumnCommand(id!, columnId, column, sheet?.rows || [], queryClient);
    executeCommand(command);
  };

  const handleInsertRow = (position: number) => {
    const command = new AddRowCommand(id!, position, queryClient);
    executeCommand(command);
  };

  const handleInsertColumn = (position: number) => {
    const columnName = `Col ${position + 1}`;
    const command = new AddColumnCommand(id!, columnName, position, queryClient);
    executeCommand(command);
  };

  // Handle merge cells
  const handleMergeCells = () => {
    if (!selectionRange || isViewOnly) return;

    const startRow = Math.min(selectionRange.start.rowIndex, selectionRange.end.rowIndex);
    const endRow = Math.max(selectionRange.start.rowIndex, selectionRange.end.rowIndex);
    const startCol = Math.min(selectionRange.start.colIndex, selectionRange.end.colIndex);
    const endCol = Math.max(selectionRange.start.colIndex, selectionRange.end.colIndex);

    // Use row positions, not array indices
    const startRowPos = filteredAndSortedRows[startRow]?.position ?? startRow;
    const endRowPos = filteredAndSortedRows[endRow]?.position ?? endRow;
    const startColPos = sheet?.columns?.[startCol]?.position ?? startCol;
    const endColPos = sheet?.columns?.[endCol]?.position ?? endCol;

    mergeCellsMutation.mutate({
      startRow: startRowPos,
      endRow: endRowPos,
      startCol: startColPos,
      endCol: endColPos,
    });
  };

  // Handle unmerge cells
  const handleUnmergeCells = () => {
    const cell = getCurrentCell();
    if (!cell || isViewOnly) return;

    if ((cell.mergeRowSpan && cell.mergeRowSpan > 1) || (cell.mergeColSpan && cell.mergeColSpan > 1)) {
      unmergeCellsMutation.mutate(cell.id);
    }
  };

  // Check if current cell is merged
  const isCurrentCellMerged = (): boolean => {
    const cell = getCurrentCell();
    if (!cell) return false;
    return (cell.mergeRowSpan && cell.mergeRowSpan > 1) || (cell.mergeColSpan && cell.mergeColSpan > 1) || false;
  };

  const { data: shares = [] } = useQuery({
    queryKey: ['sheet-shares', id],
    queryFn: () => sheetApi.getSheetShares(id!),
    enabled: !!id && isShareModalOpen,
  });

  // Include owner in the shares list
  const sharesWithOwner = useMemo(() => {
    if (!sheet || !shares) return [];

    const ownerShare = sheet.user ? {
      id: 'owner',
      sharedWithEmail: sheet.user.email,
      permission: 'OWNER' as const,
      sharedWith: {
        name: sheet.user.name,
        email: sheet.user.email,
      },
    } : null;

    return ownerShare ? [ownerShare, ...shares] : shares;
  }, [sheet, shares]);

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

  const clearAllFilters = () => {
    setFilters({});
    setIsFilterPanelOpen(false);
  };

  const handleFilterChange = (columnId: string, value: string) => {
    setFilters(prev => {
      if (!value) {
        const newFilters = { ...prev };
        delete newFilters[columnId];
        return newFilters;
      }
      return { ...prev, [columnId]: value };
    });
  };

  const handleNavigateToCell = useCallback((rowIndex: number, colIndex: number) => {
    setSelectedCell({ rowIndex, colIndex });
  }, []);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(200, prev + 10));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(50, prev - 10));
  };

  // Get current cell for formatting
  const getCurrentCell = (): Cell | null => {
    if (!selectedCell || !sheet?.rows || !sheet?.columns) return null;
    const row = filteredAndSortedRows[selectedCell.rowIndex];
    const column = sheet.columns[selectedCell.colIndex];
    return row?.cells?.find((c) => c.columnId === column.id) || null;
  };

  // Apply formatting to current cell or selection range
  const applyFormat = async (format: Partial<CellFormat>) => {
    if (!sheet?.rows || !sheet?.columns) return;

    // Get cells to format - either the selection range or just the current cell
    const cellsToFormat: Cell[] = [];

    if (selectionRange) {
      // Apply to all cells in range
      const startRow = Math.min(selectionRange.start.rowIndex, selectionRange.end.rowIndex);
      const endRow = Math.max(selectionRange.start.rowIndex, selectionRange.end.rowIndex);
      const startCol = Math.min(selectionRange.start.colIndex, selectionRange.end.colIndex);
      const endCol = Math.max(selectionRange.start.colIndex, selectionRange.end.colIndex);

      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const row = filteredAndSortedRows[r];
          const column = sheet.columns[c];
          const cell = row?.cells?.find((cell) => cell.columnId === column.id);
          if (cell) {
            cellsToFormat.push(cell);
          }
        }
      }
    } else {
      // Apply to just the current cell
      const cell = getCurrentCell();
      if (cell) {
        cellsToFormat.push(cell);
      }
    }

    if (cellsToFormat.length === 0) return;

    // Update local state and backend for all cells
    const newFormats = { ...cellFormats };

    for (const cell of cellsToFormat) {
      // Update local state - merge with existing formatting
      const updatedFormat = {
        ...cellFormats[cell.id],
        ...format,
      };

      newFormats[cell.id] = updatedFormat;

      // Save formatting to backend - send all formatting fields merged
      const cellValue = cell.value ? JSON.parse(cell.value) : '';
      await sheetApi.updateCell(id!, cell.id, {
        value: cellValue,
        textColor: updatedFormat.color,
        backgroundColor: updatedFormat.backgroundColor,
        fontSize: updatedFormat.fontSize,
        bold: updatedFormat.bold,
        italic: updatedFormat.italic,
        underline: updatedFormat.underline,
        textAlign: updatedFormat.align,
        hasBorder: updatedFormat.borderStyle === 'solid',
        numberFormat: updatedFormat.numberFormat,
        decimalPlaces: updatedFormat.decimals,
      });
    }

    // Update all formats at once
    setCellFormats(newFormats);

    // Invalidate queries to refresh the UI
    queryClient.invalidateQueries({ queryKey: ['sheets', id] });
  };

  // Get current cell format
  const getCurrentFormat = (): CellFormat => {
    const cell = getCurrentCell();
    if (!cell) return {};
    return cellFormats[cell.id] || {};
  };

  // Apply formatting to selected cell(s)
  const applyFormatting = (format: Partial<CellFormat>) => {
    const cell = getCurrentCell();
    if (!cell) return;

    setCellFormats(prev => ({
      ...prev,
      [cell.id]: { ...prev[cell.id], ...format }
    }));
  };

  // Delete selection (cell content or multiple cells)
  const handleDeleteSelection = () => {
    if (isViewOnly || !sheet?.rows || !sheet?.columns) return;

    // If we have a selection range, delete all cells in range
    if (selectionRange) {
      const startRow = Math.min(selectionRange.start.rowIndex, selectionRange.end.rowIndex);
      const endRow = Math.max(selectionRange.start.rowIndex, selectionRange.end.rowIndex);
      const startCol = Math.min(selectionRange.start.colIndex, selectionRange.end.colIndex);
      const endCol = Math.max(selectionRange.start.colIndex, selectionRange.end.colIndex);

      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const row = sheet.rows[r];
          const column = sheet.columns[c];
          if (row && column) {
            const cell = row.cells?.find(cell => cell.columnId === column.id);
            if (cell && cell.value) {
              const command = new UpdateCellCommand(
                id!,
                cell.id,
                '',
                JSON.parse(cell.value),
                queryClient
              );
              executeCommand(command);
            }
          }
        }
      }
      // Clear selection after delete
      setSelectionRange(null);
    } else {
      // Delete single selected cell
      const cell = getCurrentCell();
      if (!cell) return;

      const command = new UpdateCellCommand(
        id!,
        cell.id,
        '',
        cell.value ? JSON.parse(cell.value) : '',
        queryClient
      );
      executeCommand(command);
    }
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
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Modern Header Bar */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center space-x-6">
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
                className="text-xl font-bold text-slate-900 border-b-2 border-blue-500 px-2 py-1 focus:outline-none bg-transparent"
              />
            ) : (
              <button
                onClick={() => {
                  setSheetName(sheet.name);
                  setIsEditingName(true);
                }}
                className="text-xl font-bold text-slate-900 hover:text-blue-600 flex items-center space-x-2 transition-colors group"
              >
                <span>{sheet.name}</span>
                <Star className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg font-medium text-sm"
            >
              {isViewOnly ? 'Access' : 'Share'}
            </button>
          </div>
        </div>
      </div>

      {/* Menu Bar */}
      <MenuBar
        onUndo={() => undo()}
        onRedo={() => redo()}
        canUndo={canUndo()}
        canRedo={canRedo()}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onCut={handleCut}
        onDelete={handleDeleteSelection}
        onInsertRowAbove={() => {
          if (selectedCell && filteredAndSortedRows[selectedCell.rowIndex]) {
            handleInsertRow(filteredAndSortedRows[selectedCell.rowIndex].position);
          }
        }}
        onInsertRowBelow={() => {
          if (selectedCell && filteredAndSortedRows[selectedCell.rowIndex]) {
            handleInsertRow(filteredAndSortedRows[selectedCell.rowIndex].position + 1);
          }
        }}
        onInsertColumnLeft={() => {
          if (selectedCell && sheet?.columns?.[selectedCell.colIndex]) {
            handleInsertColumn(sheet.columns[selectedCell.colIndex].position);
          }
        }}
        onInsertColumnRight={() => {
          if (selectedCell && sheet?.columns?.[selectedCell.colIndex]) {
            handleInsertColumn(sheet.columns[selectedCell.colIndex].position + 1);
          }
        }}
        onShare={() => setIsShareModalOpen(true)}
        onBold={() => applyFormatting({ bold: !getCurrentFormat().bold })}
        onItalic={() => applyFormatting({ italic: !getCurrentFormat().italic })}
        onUnderline={() => applyFormatting({ underline: !getCurrentFormat().underline })}
        onAlignLeft={() => applyFormatting({ align: 'left' })}
        onAlignCenter={() => applyFormatting({ align: 'center' })}
        onAlignRight={() => applyFormatting({ align: 'right' })}
        isViewOnly={isViewOnly}
        frozenRows={frozenRows}
        frozenColumns={frozenColumns}
        onFreezeRows={setFrozenRows}
        onFreezeColumns={setFrozenColumns}
        selectedRow={selectedCell?.rowIndex ?? null}
        selectedColumn={selectedCell?.colIndex ?? null}
        onExport={async () => {
          if (!id) return;
          try {
            const csv = await sheetApi.exportToCsv(id);
            // Create blob and download
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${sheet?.name || 'sheet'}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          } catch (error) {
            console.error('Export failed:', error);
          }
        }}
        onPrint={() => {
          window.print();
        }}
        onSortAsc={() => {
          if (selectedCell && sheet?.columns?.[selectedCell.colIndex]) {
            setSortConfig({
              columnId: sheet.columns[selectedCell.colIndex].id,
              direction: 'asc',
            });
          }
        }}
        onSortDesc={() => {
          if (selectedCell && sheet?.columns?.[selectedCell.colIndex]) {
            setSortConfig({
              columnId: sheet.columns[selectedCell.colIndex].id,
              direction: 'desc',
            });
          }
        }}
        onFilter={() => setIsFilterPanelOpen(prev => !prev)}
        onSearch={() => setIsSearchPanelOpen(prev => !prev)}
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />

      {/* View Only Banner */}
      {isViewOnly && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
          <span className="text-sm text-amber-800 font-medium">
            View Only: You don't have permission to edit this sheet
          </span>
        </div>
      )}

      {/* Google Sheets-style Toolbar */}
      <Toolbar
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo()}
        canRedo={canRedo()}
        currentFormat={getCurrentFormat()}
        onFormatChange={(format) => applyFormat(format)}
        hasSelection={!!selectedCell}
        hasRangeSelection={!!selectionRange}
        onMergeCells={handleMergeCells}
        onUnmergeCells={handleUnmergeCells}
        isMerged={isCurrentCellMerged()}
        isViewOnly={isViewOnly}
        onInsertComment={() => {
          if (selectedCell && filteredAndSortedRows[selectedCell.rowIndex]) {
            setSelectedRowForComment(filteredAndSortedRows[selectedCell.rowIndex].id);
            setIsCommentSidebarOpen(true);
          }
        }}
      />

      {/* Filter Panel */}
      {isFilterPanelOpen && (
        <FilterPanel
          columns={sheet.columns || []}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearAll={clearAllFilters}
          onClose={() => setIsFilterPanelOpen(false)}
        />
      )}

      {/* Search Panel */}
      {isSearchPanelOpen && (
        <SearchPanel
          rows={filteredAndSortedRows}
          columns={sheet.columns || []}
          onClose={() => setIsSearchPanelOpen(false)}
          onNavigateToCell={handleNavigateToCell}
        />
      )}

      {/* Active Filters and Sort */}
      {(Object.keys(filters).length > 0 || sortConfig) && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {Object.keys(filters).length > 0 && (
              <span className="text-xs text-blue-700">
                {Object.keys(filters).length} filter{Object.keys(filters).length > 1 ? 's' : ''} active
              </span>
            )}
            {sortConfig && (
              <span className="text-xs text-blue-700">
                Sorted by {sheet?.columns?.find(c => c.id === sortConfig.columnId)?.name || 'column'} ({sortConfig.direction === 'asc' ? 'A→Z' : 'Z→A'})
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {sortConfig && (
              <button
                onClick={() => setSortConfig(null)}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
              >
                <X className="h-3 w-3 mr-1" />
                Clear sort
              </button>
            )}
            {Object.keys(filters).length > 0 && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
              >
                <X className="h-3 w-3 mr-1" />
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modern Sheet Grid with Zoom */}
      <div
        className="flex-1 overflow-auto"
        style={{
          transform: `scale(${zoomLevel / 100})`,
          transformOrigin: 'top left',
          width: `${10000 / zoomLevel}%`,
          height: `${10000 / zoomLevel}%`,
        }}
      >
        <SheetTable
          columns={sheet.columns || []}
          rows={filteredAndSortedRows}
          isViewOnly={isViewOnly}
          frozenRows={frozenRows}
          frozenColumns={frozenColumns}
        onCellSelect={(position) => setSelectedCell(position)}
        onCellUpdate={(cellId: string, value: any) => {
          // Find the current cell value for undo
          const cell = sheet.rows
            ?.flatMap((r) => r.cells || [])
            .find((c) => c.id === cellId);

          const oldValue = cell?.value ? JSON.parse(cell.value) : '';

          // Get current cell formatting
          const format = cellFormats[cellId];
          const formatting = format ? {
            textColor: format.color,
            backgroundColor: format.backgroundColor,
            fontSize: format.fontSize,
            bold: format.bold,
            italic: format.italic,
            underline: format.underline,
            textAlign: format.align,
            hasBorder: format.borderStyle === 'solid',
            numberFormat: format.numberFormat,
            decimalPlaces: format.decimals,
          } : undefined;

          // Create and execute command for undo/redo support
          const command = new UpdateCellCommand(
            id!,
            cellId,
            oldValue,
            value,
            queryClient,
            formatting
          );

          executeCommand(command);
        }}
        onColumnUpdate={(columnId: string, name: string) => {
          updateColumnMutation.mutate({ columnId, name });
        }}
        onColumnDelete={handleDeleteColumn}
        onColumnResize={(columnId: string, width: number) => {
          updateColumnMutation.mutate({ columnId, width });
        }}
        onRowUpdate={(rowId: string, name?: string) => {
          const row = sheet.rows?.find(r => r.id === rowId);
          updateRowMutation.mutate({ rowId, height: row?.height, name });
        }}
        onRowDelete={handleDeleteRow}
        onCommentClick={(rowId: string) => {
          setSelectedRowForComment(rowId);
          setIsCommentSidebarOpen(true);
        }}
        onInsertRowAbove={handleInsertRow}
        onInsertRowBelow={handleInsertRow}
        onInsertColumnLeft={handleInsertColumn}
        onInsertColumnRight={handleInsertColumn}
        copiedCellId={clipboard?.cellId}
        selectionRange={selectionRange}
        onSelectionRangeChange={setSelectionRange}
        />
      </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        sheetId={id!}
        shares={sharesWithOwner}
        onShare={async (email, permission) => {
          // Map permission to API format (EDIT/EDIT_CAN_SHARE -> EDITOR)
          const apiPermission: 'VIEWER' | 'EDITOR' = permission === 'VIEWER' ? 'VIEWER' : 'EDITOR';
          await shareMutation.mutateAsync({ email, permission: apiPermission });
        }}
        onRemoveShare={async (shareId) => {
          await removeShareMutation.mutateAsync(shareId);
        }}
        isViewOnly={isViewOnly}
      />

      <RightSidebar
        isOpen={isCommentSidebarOpen}
        onClose={() => {
          setIsCommentSidebarOpen(false);
          setSelectedRowForComment(null);
        }}
        title="Comments"
      >
        <CommentsPanel
          sheetId={id!}
          rowId={selectedRowForComment}
          isViewOnly={isViewOnly}
        />
      </RightSidebar>
    </div>
  );
}
