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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{sheet.name}</h1>
            {sheet.description && (
              <p className="text-gray-600 mt-1">{sheet.description}</p>
            )}
          </div>
        </div>
        {(sheet as any).isOwner !== false && (
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex space-x-2">
            <button
              onClick={() => addColumnMutation.mutate()}
              disabled={addColumnMutation.isPending}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Column
            </button>
            <button
              onClick={() => addRowMutation.mutate()}
              disabled={addRowMutation.isPending}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Row
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                {sheet.columns?.map((column: Column) => (
                  <th
                    key={column.id}
                    style={{ width: column.width || 150 }}
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-l"
                  >
                    <div className="flex items-center justify-between">
                      <span>{column.name}</span>
                      <span className="text-xs text-gray-400 ml-2">
                        {column.type}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sheet.rows && sheet.rows.length > 0 ? (
                sheet.rows.map((row: Row, rowIndex: number) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-500 bg-gray-50 font-medium">
                      {rowIndex + 1}
                    </td>
                    {sheet.columns?.map((column: Column) => {
                      const cell = getCellValue(row, column);
                      const isEditing = editingCell === cell?.id;

                      return (
                        <td
                          key={`${row.id}-${column.id}`}
                          className="px-3 py-2 text-sm text-gray-900 border-l cursor-pointer hover:bg-blue-50"
                          onClick={() => cell && handleCellClick(cell)}
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
                              className="w-full px-2 py-1 border border-primary-500 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          ) : (
                            <div className="min-h-[24px]">
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
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    No rows yet. Click "Add Row" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
