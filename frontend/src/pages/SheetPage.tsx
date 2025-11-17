import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Share2, Download, Edit2, ArrowUp, ArrowDown, Filter, X } from 'lucide-react';
import { sheetApi } from '../services/api';
import ShareModal from '../components/ShareModal';
import type { Column, Row, Cell } from '../types';
import api from '../services/api';

export default function SheetPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  const { data: sheet, isLoading } = useQuery({
    queryKey: ['sheets', id],
    queryFn: () => sheetApi.getById(id!),
    enabled: !!id,
  });

  const updateCellMutation = useMutation({
    mutationFn: ({ cellId, value }: { cellId: string; value: any }) =>
      sheetApi.updateCell(id!, cellId, { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheets', id] });
      setEditingCell(null);
      setCellValue('');
    },
  });

  const addColumnMutation = useMutation({
    mutationFn: () =>
      sheetApi.createColumn(id!, {
        name: `Column ${(sheet?.columns?.length || 0) + 1}`,
        position: sheet?.columns?.length || 0,
      }),
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

  const handleCellClick = (cell: Cell, rowIndex?: number, colIndex?: number) => {
    // If we're in formula mode and clicking a different cell, insert its reference
    if (isInFormulaMode() && editingCell !== cell.id && rowIndex !== undefined && colIndex !== undefined) {
      const cellRef = getCellReference(rowIndex, colIndex);
      setCellValue(cellValue + cellRef);
      // Keep focus on the input
      setTimeout(() => cellInputRef.current?.focus(), 0);
      return;
    }

    setEditingCell(cell.id);
    setCellValue(cell.value ? JSON.parse(cell.value) : '');
    if (rowIndex !== undefined && colIndex !== undefined) {
      setSelectedCell({ rowIndex, colIndex });
    }
  };

  const handleCellBlur = (cellId: string) => {
    updateCellMutation.mutate({ cellId, value: cellValue });
  };

  const getCellValue = (row: Row, column: Column): Cell | undefined => {
    return row.cells?.find((cell) => cell.columnId === column.id);
  };

  const handleDownloadCSV = async () => {
    try {
      const response = await api.get(`/api/v1/sheets/${id}/export`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${sheet?.name || 'sheet'}_export.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download CSV:', error);
    }
  };

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
            // Enter: move down or start editing
            const row = filteredAndSortedRows[rowIndex];
            const column = sheet.columns[colIndex];
            const cell = row.cells?.find((c) => c.columnId === column.id);
            if (cell) {
              handleCellClick(cell);
              return;
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          setSelectedCell(null);
          return;
        default:
          // Start editing on alphanumeric keys
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const row = filteredAndSortedRows[rowIndex];
            const column = sheet.columns[colIndex];
            const cell = row.cells?.find((c) => c.columnId === column.id);
            if (cell) {
              setCellValue(e.key);
              handleCellClick(cell);
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
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
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
                  className="text-2xl font-semibold text-gray-900 border-b-2 border-blue-500 px-2 py-1 focus:outline-none"
                />
              ) : (
                <div className="flex items-center space-x-2 group">
                  <h1 className="text-2xl font-semibold text-gray-900">{sheet.name}</h1>
                  {(sheet as any).isOwner !== false && (
                    <button
                      onClick={() => {
                        setSheetName(sheet.name);
                        setIsEditingName(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-opacity"
                    >
                      <Edit2 className="h-4 w-4 text-gray-500" />
                    </button>
                  )}
                </div>
              )}
              {sheet.description && (
                <p className="text-sm text-gray-500 mt-0.5">{sheet.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadCSV}
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            {(sheet as any).isOwner !== false && (
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          {isInFormulaMode() && (
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-green-100 text-green-800 px-4 py-1.5 rounded-full text-xs font-medium shadow-sm border border-green-200 z-30">
              <span className="font-semibold">Formula Mode:</span> Click cells to add references
            </div>
          )}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => addColumnMutation.mutate()}
              disabled={addColumnMutation.isPending}
              className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Column
            </button>
            <button
              onClick={() => addRowMutation.mutate()}
              disabled={addRowMutation.isPending}
              className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Row
            </button>
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
                  <th className="sticky top-0 left-0 z-20 w-12 px-3 py-2.5 text-center text-xs font-semibold text-gray-600 bg-gray-50 border-b-2 border-r border-gray-300">
                    #
                  </th>
                  {sheet.columns?.map((column: Column, index: number) => (
                    <th
                      key={column.id}
                      style={{ minWidth: column.width || 180, maxWidth: column.width || 180 }}
                      className={`sticky top-0 z-10 px-4 py-2.5 text-left text-xs font-semibold text-gray-700 bg-gray-50 border-b-2 border-gray-300 ${
                        index !== 0 ? 'border-l border-gray-200' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <span
                            className="truncate cursor-pointer hover:text-gray-900"
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
                        </div>
                        <span className="text-[10px] text-gray-400 ml-2 uppercase tracking-wider">
                          {column.type}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedRows && filteredAndSortedRows.length > 0 ? (
                  filteredAndSortedRows.map((row: Row, rowIndex: number) => (
                    <tr
                      key={row.id}
                      className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                    >
                      <td className="sticky left-0 z-10 px-3 py-0 text-center text-xs font-medium text-gray-500 bg-gray-50 border-r border-b border-gray-200">
                        <div className="h-10 flex items-center justify-center">
                          {rowIndex + 1}
                        </div>
                      </td>
                      {sheet.columns?.map((column: Column, colIndex: number) => {
                        const cell = getCellValue(row, column);
                        const isEditing = editingCell === cell?.id;
                        const isSelected = selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === colIndex;
                        const inFormulaMode = isInFormulaMode() && !isEditing;

                        return (
                          <td
                            key={`${row.id}-${column.id}`}
                            className={`px-4 py-0 text-sm text-gray-900 border-b border-gray-200 ${
                              colIndex !== 0 ? 'border-l border-gray-200' : ''
                            } ${
                              inFormulaMode
                                ? 'cursor-crosshair hover:bg-green-100 hover:ring-2 hover:ring-inset hover:ring-green-400'
                                : !isEditing
                                ? 'cursor-pointer hover:bg-blue-50/50'
                                : ''
                            } ${isSelected && !isEditing ? 'ring-2 ring-inset ring-blue-500 bg-blue-50/30' : ''}`}
                            onClick={() => {
                              if (cell) {
                                setSelectedCell({ rowIndex, colIndex });
                                handleCellClick(cell, rowIndex, colIndex);
                              }
                            }}
                          >
                            {isEditing ? (
                              <input
                                ref={cellInputRef}
                                type="text"
                                value={cellValue}
                                onChange={(e) => setCellValue(e.target.value)}
                                onBlur={() => cell && handleCellBlur(cell.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    cell && handleCellBlur(cell.id);
                                  } else if (e.key === 'Escape') {
                                    setEditingCell(null);
                                    setCellValue('');
                                  }
                                }}
                                autoFocus
                                className={`w-full h-10 px-2 py-2 border-2 rounded focus:outline-none focus:ring-2 bg-white shadow-sm ${
                                  isInFormulaMode()
                                    ? 'border-green-500 ring-green-500'
                                    : 'border-blue-500 ring-blue-500'
                                }`}
                              />
                            ) : (
                              <div className="h-10 flex items-center py-2 truncate">
                                {cell?.value ? (() => {
                                  const parsedValue = JSON.parse(cell.value);
                                  // If it's a formula and we have a computed value, show that
                                  if (typeof parsedValue === 'string' && parsedValue.startsWith('=')) {
                                    return (cell as any).computedValue !== undefined
                                      ? (cell as any).computedValue
                                      : parsedValue;
                                  }
                                  return parsedValue;
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
