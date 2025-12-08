import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Trash2, Clock, Share2, Star, ClipboardList, DollarSign, Calendar, Package } from 'lucide-react';
import { sheetApi } from '../services/api';
import type { Sheet, CreateSheetInput } from '../types';

// Sheet templates
const TEMPLATES = [
  {
    id: 'project-tracker',
    name: 'Project Tracker',
    description: 'Track tasks, assignees, and deadlines',
    icon: ClipboardList,
    color: 'bg-blue-500',
    columns: ['Task', 'Status', 'Priority', 'Assignee', 'Due Date', 'Notes'],
    rows: 15,
  },
  {
    id: 'budget',
    name: 'Budget Tracker',
    description: 'Manage income and expenses',
    icon: DollarSign,
    color: 'bg-green-500',
    columns: ['Category', 'Description', 'Amount', 'Date', 'Type', 'Notes'],
    rows: 20,
  },
  {
    id: 'content-calendar',
    name: 'Content Calendar',
    description: 'Plan and schedule content',
    icon: Calendar,
    color: 'bg-purple-500',
    columns: ['Title', 'Platform', 'Publish Date', 'Status', 'Author', 'Notes'],
    rows: 15,
  },
  {
    id: 'inventory',
    name: 'Inventory',
    description: 'Track stock and supplies',
    icon: Package,
    color: 'bg-orange-500',
    columns: ['Item Name', 'SKU', 'Quantity', 'Price', 'Category', 'Supplier'],
    rows: 25,
  },
];

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
      navigate(`/sheet/${sheet.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sheetApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheets'] });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: (id: string) => sheetApi.toggleFavorite(id),
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

  const handleCreateFromTemplate = (template: typeof TEMPLATES[0]) => {
    createMutation.mutate({
      name: template.name,
      description: template.description,
      template: {
        columns: template.columns,
        rows: template.rows,
      },
    });
  };

  const ownedSheets = sheets?.filter((s: any) => s.isOwner !== false) || [];
  const sharedSheets = sheets?.filter((s: any) => s.isShared) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading sheets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Home</h1>
            <p className="mt-1 text-sm text-gray-600">
              Welcome back! Manage your spreadsheets and collaborate with your team.
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Sheet
          </button>
        </div>

        {/* Templates Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Start from a template</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {/* Blank sheet option */}
            <button
              onClick={() => setIsCreating(true)}
              className="relative group p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <Plus className="h-5 w-5 text-gray-600 group-hover:text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Blank Sheet</h3>
                  <p className="text-xs text-gray-500">Start fresh</p>
                </div>
              </div>
            </button>

            {/* Template cards */}
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleCreateFromTemplate(template)}
                disabled={createMutation.isPending}
                className="relative group p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all text-left bg-white disabled:opacity-50"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 ${template.color} rounded-lg`}>
                    <template.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{template.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-1">{template.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* My Sheets */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Sheets</h2>
          {ownedSheets.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-sm font-medium text-gray-900">No sheets yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first spreadsheet.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setIsCreating(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Sheet
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {ownedSheets.map((sheet: Sheet) => (
                <div
                  key={sheet.id}
                  className="relative group bg-white p-5 rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate(`/sheet/${sheet.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteMutation.mutate(sheet.id);
                        }}
                        className="p-1.5 hover:bg-yellow-50 rounded transition-colors"
                      >
                        <Star
                          className={`h-4 w-4 ${
                            sheet.isFavorite
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-400'
                          }`}
                        />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to delete this sheet?')) {
                            deleteMutation.mutate(sheet.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-red-600 hover:bg-red-50 rounded transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1 truncate">
                    {sheet.name}
                  </h3>
                  {sheet.description && (
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2 h-8">
                      {sheet.description}
                    </p>
                  )}
                  <div className="flex items-center text-xs text-gray-500 space-x-3">
                    {sheet._count && (
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {sheet._count.rows}×{sheet._count.columns}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Shared with me */}
        {sharedSheets.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Shared with me</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sharedSheets.map((sheet: any) => (
                <div
                  key={sheet.id}
                  className="relative group bg-white p-5 rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate(`/sheet/${sheet.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <Share2 className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                      {sheet.sharedPermission === 'VIEWER' ? 'View only' : 'Can edit'}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1 truncate">
                    {sheet.name}
                  </h3>
                  {sheet.description && (
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2 h-8">
                      {sheet.description}
                    </p>
                  )}
                  <div className="flex items-center text-xs text-gray-500 space-x-3">
                    {sheet._count && (
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {sheet._count.rows}×{sheet._count.columns}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Sheet Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setIsCreating(false)}
            />
            <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Create New Sheet
              </h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={newSheetName}
                    onChange={(e) => setNewSheetName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="My Spreadsheet"
                    autoFocus
                  />
                </div>
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Description (optional)
                  </label>
                  <textarea
                    id="description"
                    value={newSheetDescription}
                    onChange={(e) => setNewSheetDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="What's this sheet for?"
                    rows={3}
                  />
                </div>
                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
