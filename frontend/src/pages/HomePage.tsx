import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, FileSpreadsheet } from 'lucide-react';
import { sheetApi } from '../services/api';
import type { Sheet, CreateSheetInput } from '../types';

export default function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');
  const [newSheetDescription, setNewSheetDescription] = useState('');

  const { data: sheets, isLoading } = useQuery({
    queryKey: ['sheets'],
    queryFn: sheetApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateSheetInput) => sheetApi.create(input),
    onSuccess: (sheet) => {
      queryClient.invalidateQueries({ queryKey: ['sheets'] });
      setIsCreating(false);
      setNewSheetName('');
      setNewSheetDescription('');
      navigate(`/sheets/${sheet.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sheetApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheets'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSheetName.trim()) {
      createMutation.mutate({
        name: newSheetName,
        description: newSheetDescription || undefined,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">My Sheets</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Sheet
        </button>
      </div>

      {isCreating && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Create New Sheet</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Sheet Name
              </label>
              <input
                type="text"
                id="name"
                value={newSheetName}
                onChange={(e) => setNewSheetName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                placeholder="e.g., Q1 Sales Data"
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description (optional)
              </label>
              <textarea
                id="description"
                value={newSheetDescription}
                onChange={(e) => setNewSheetDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                placeholder="Brief description of what this sheet is for"
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewSheetName('');
                  setNewSheetDescription('');
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading sheets...</p>
        </div>
      ) : sheets && sheets.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sheets.map((sheet: Sheet) => (
            <div
              key={sheet.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 cursor-pointer group"
              onClick={() => navigate(`/sheets/${sheet.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <FileSpreadsheet className="h-8 w-8 text-primary-600" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {sheet.name}
                    </h3>
                    {sheet.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                        {sheet.description}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this sheet?')) {
                      deleteMutation.mutate(sheet.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1 text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-4 text-xs text-gray-500">
                {sheet._count && (
                  <span>
                    {sheet._count.rows} rows × {sheet._count.columns} columns
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No sheets</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new sheet.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Sheet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
