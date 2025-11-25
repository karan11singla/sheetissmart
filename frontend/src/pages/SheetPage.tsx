import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Plus, X, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Star } from 'lucide-react';
import { sheetApi } from '../services/api';
import ShareModal from '../components/ShareModal';
import SheetTable from '../components/SheetTable/SheetTable';
import type { Cell } from '../types';

export default function SheetPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [sheetName, setSheetName] = useState('');
  const [sortConfig] = useState<{ columnId: string; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

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
  const [selectedCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);

  const { data: sheet, isLoading } = useQuery({
    queryKey: ['sheets', id],
    queryFn: () => sheetApi.getById(id!),
    enabled: !!id,
  });

  // Check if user has edit permission
  const isViewOnly = sheet && (sheet as any).permission === 'VIEWER';

  const updateCellMutation = useMutation({
    mutationFn: ({ cellId, value }: { cellId: string; value: any }) =>
      sheetApi.updateCell(id!, cellId, { value }),
    onSuccess: () => {
      // Refetch to get updated computed values for all formulas
      queryClient.invalidateQueries({ queryKey: ['sheets', id] });
    },
    onError: (error: any) => {
      console.error('Failed to update cell:', error);
      alert(`Failed to update cell: ${error.response?.data?.message || error.message}`);
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
            {(sheet as any).isOwner !== false && (
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg font-medium text-sm"
              >
                Share
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modern Formatting Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 overflow-x-auto shadow-sm">
        <div className="flex items-center justify-between min-w-max sm:min-w-0">
          {isViewOnly && (
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-5 py-2 rounded-full text-sm font-medium shadow-lg border-2 border-amber-400 z-30">
              <span className="font-bold">View Only:</span> You don't have permission to edit this sheet
            </div>
          )}
          <div className="flex items-center space-x-4">
            {/* Add Row/Column */}
            {!isViewOnly && (
              <div className="flex items-center space-x-2 border-r border-slate-200 pr-4">
                <button
                  onClick={() => addColumnMutation.mutate()}
                  disabled={addColumnMutation.isPending}
                  className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg text-sm font-medium text-blue-700 hover:from-blue-100 hover:to-blue-200 hover:border-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
                  title="Add Column"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Column
                </button>
                <button
                  onClick={() => addRowMutation.mutate()}
                  disabled={addRowMutation.isPending}
                  className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg text-sm font-medium text-blue-700 hover:from-blue-100 hover:to-blue-200 hover:border-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
                  title="Add Row"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Row
                </button>
              </div>
            )}

            {/* Text Formatting */}
            {!isViewOnly && (
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
            )}

            {/* Text Alignment */}
            {!isViewOnly && (
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
            )}

            {/* Font Size and Color */}
            {!isViewOnly && (
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
            )}

            {/* Number Format */}
            {!isViewOnly && (
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
            )}

            {/* Borders */}
            {!isViewOnly && (
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
            )}
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

      {/* Modern Sheet Grid */}
      <SheetTable
        columns={sheet.columns || []}
        rows={filteredAndSortedRows}
        isViewOnly={isViewOnly}
        onCellUpdate={(cellId: string, value: any) => {
          updateCellMutation.mutate({ cellId, value });
        }}
        onColumnUpdate={(columnId: string, name: string) => {
          updateColumnMutation.mutate({ columnId, name });
        }}
        onColumnDelete={(columnId: string) => {
          deleteColumnMutation.mutate(columnId);
        }}
        onRowUpdate={(rowId: string, name?: string) => {
          const row = sheet.rows?.find(r => r.id === rowId);
          updateRowMutation.mutate({ rowId, height: row?.height, name });
        }}
        onRowDelete={(rowId: string) => {
          deleteRowMutation.mutate(rowId);
        }}
      />


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
