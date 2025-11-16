import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Share2 } from 'lucide-react';
import { sheetApi } from '../services/api';
import ShareModal from '../components/ShareModal';
import type { Column, Row, Cell } from '../types';

export default function SheetPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [cellValue, setCellValue] = useState<string>('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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

  const handleCellClick = (cell: Cell) => {
    setEditingCell(cell.id);
    setCellValue(cell.value ? JSON.parse(cell.value) : '');
  };

  const handleCellBlur = (cellId: string) => {
    updateCellMutation.mutate({ cellId, value: cellValue });
  };

  const getCellValue = (row: Row, column: Column): Cell | undefined => {
    return row.cells?.find((cell) => cell.columnId === column.id);
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
              <h1 className="text-2xl font-semibold text-gray-900">{sheet.name}</h1>
              {sheet.description && (
                <p className="text-sm text-gray-500 mt-0.5">{sheet.description}</p>
              )}
            </div>
          </div>
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

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
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
      </div>

      {/* Sheet Grid */}
      <div className="flex-1 overflow-auto bg-gray-50 p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-auto">
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
                        <span className="truncate">{column.name}</span>
                        <span className="text-[10px] text-gray-400 ml-2 uppercase tracking-wider">
                          {column.type}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheet.rows && sheet.rows.length > 0 ? (
                  sheet.rows.map((row: Row, rowIndex: number) => (
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

                        return (
                          <td
                            key={`${row.id}-${column.id}`}
                            className={`px-4 py-0 text-sm text-gray-900 border-b border-gray-200 ${
                              colIndex !== 0 ? 'border-l border-gray-200' : ''
                            } ${!isEditing ? 'cursor-pointer hover:bg-blue-50/50' : ''}`}
                            onClick={() => !isEditing && cell && handleCellClick(cell)}
                          >
                            {isEditing ? (
                              <input
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
                                className="w-full h-10 px-2 py-2 border-2 border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                              />
                            ) : (
                              <div className="h-10 flex items-center py-2 truncate">
                                {cell?.value ? JSON.parse(cell.value) : ''}
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
