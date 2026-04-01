import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Trash2, Clock, Share2, Star, ClipboardList, DollarSign, Calendar, Package, X } from 'lucide-react';
import { sheetApi } from '../services/api';
import type { Sheet, CreateSheetInput } from '../types';
import { useAuth } from '../contexts/AuthContext';

const TEMPLATES = [
  {
    id: 'project-tracker',
    name: 'Project Tracker',
    description: 'Track tasks, assignees, and deadlines',
    icon: ClipboardList,
    color: 'from-emerald-500 to-green-600',
    bgLight: 'bg-emerald-50',
    columns: ['Task', 'Status', 'Priority', 'Assignee', 'Due Date', 'Notes'],
    rows: 15,
  },
  {
    id: 'budget',
    name: 'Budget Tracker',
    description: 'Manage income and expenses',
    icon: DollarSign,
    color: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
    columns: ['Category', 'Description', 'Amount', 'Date', 'Type', 'Notes'],
    rows: 20,
  },
  {
    id: 'content-calendar',
    name: 'Content Calendar',
    description: 'Plan and schedule content',
    icon: Calendar,
    color: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-50',
    columns: ['Title', 'Platform', 'Publish Date', 'Status', 'Author', 'Notes'],
    rows: 15,
  },
  {
    id: 'inventory',
    name: 'Inventory',
    description: 'Track stock and supplies',
    icon: Package,
    color: 'from-sky-500 to-blue-600',
    bgLight: 'bg-sky-50',
    columns: ['Item Name', 'SKU', 'Quantity', 'Price', 'Category', 'Supplier'],
    rows: 25,
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
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
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
          <p className="mt-3 text-sm text-neutral-500">Loading your sheets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Create, manage, and collaborate on your spreadsheets.
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm text-sm font-medium"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Sheet
          </button>
        </div>

        {/* Templates */}
        <div>
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-3">Start from template</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <button
              onClick={() => setIsCreating(true)}
              className="group p-4 rounded-xl border-2 border-dashed border-neutral-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all text-left"
            >
              <div className="p-2 bg-neutral-100 rounded-lg group-hover:bg-primary-100 transition-colors w-fit mb-3">
                <Plus className="h-5 w-5 text-neutral-400 group-hover:text-primary-600" />
              </div>
              <h3 className="text-sm font-medium text-neutral-700">Blank Sheet</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Start fresh</p>
            </button>

            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleCreateFromTemplate(template)}
                disabled={createMutation.isPending}
                className="group p-4 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-soft transition-all text-left bg-white disabled:opacity-50"
              >
                <div className={`p-2 bg-gradient-to-br ${template.color} rounded-lg w-fit mb-3`}>
                  <template.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-sm font-medium text-neutral-700">{template.name}</h3>
                <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">{template.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* My Sheets */}
        <div>
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-3">My Sheets</h2>
          {ownedSheets.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-neutral-200">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-100 mb-4">
                <FileText className="h-6 w-6 text-neutral-400" />
              </div>
              <h3 className="text-sm font-medium text-neutral-700">No sheets yet</h3>
              <p className="mt-1 text-sm text-neutral-400">
                Create your first spreadsheet to get started.
              </p>
              <button
                onClick={() => setIsCreating(true)}
                className="mt-4 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Create Sheet
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {ownedSheets.map((sheet: Sheet) => (
                <div
                  key={sheet.id}
                  className="group bg-white p-4 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-soft transition-all cursor-pointer"
                  onClick={() => navigate(`/sheet/${sheet.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-primary-50 rounded-lg">
                      <FileText className="h-4 w-4 text-primary-600" />
                    </div>
                    <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteMutation.mutate(sheet.id);
                        }}
                        className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        <Star
                          className={`h-3.5 w-3.5 ${
                            sheet.isFavorite
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-neutral-400'
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
                        className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-neutral-800 mb-0.5 truncate">
                    {sheet.name}
                  </h3>
                  {sheet.description && (
                    <p className="text-xs text-neutral-400 mb-2 line-clamp-2">
                      {sheet.description}
                    </p>
                  )}
                  <div className="flex items-center text-xs text-neutral-400 mt-2 pt-2 border-t border-neutral-100">
                    {sheet._count && (
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {sheet._count.rows} rows, {sheet._count.columns} cols
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
            <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-3">Shared with me</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sharedSheets.map((sheet: any) => (
                <div
                  key={sheet.id}
                  className="group bg-white p-4 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-soft transition-all cursor-pointer"
                  onClick={() => navigate(`/sheet/${sheet.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-violet-50 rounded-lg">
                      <Share2 className="h-4 w-4 text-violet-600" />
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded-full font-medium">
                      {sheet.sharedPermission === 'VIEWER' ? 'View' : 'Edit'}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-neutral-800 mb-0.5 truncate">
                    {sheet.name}
                  </h3>
                  {sheet.description && (
                    <p className="text-xs text-neutral-400 mb-2 line-clamp-2">
                      {sheet.description}
                    </p>
                  )}
                  <div className="flex items-center text-xs text-neutral-400 mt-2 pt-2 border-t border-neutral-100">
                    {sheet._count && (
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {sheet._count.rows} rows, {sheet._count.columns} cols
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
              className="fixed inset-0 bg-neutral-900/20 backdrop-blur-sm transition-opacity"
              onClick={() => setIsCreating(false)}
            />
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-neutral-200">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-neutral-900">
                  Create New Sheet
                </h2>
                <button
                  onClick={() => setIsCreating(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-neutral-700 mb-1.5"
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={newSheetName}
                    onChange={(e) => setNewSheetName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-neutral-900 text-sm placeholder:text-neutral-400"
                    placeholder="My Spreadsheet"
                    autoFocus
                  />
                </div>
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-neutral-700 mb-1.5"
                  >
                    Description
                    <span className="text-neutral-400 font-normal ml-1">optional</span>
                  </label>
                  <textarea
                    id="description"
                    value={newSheetDescription}
                    onChange={(e) => setNewSheetDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-neutral-900 text-sm placeholder:text-neutral-400 resize-none"
                    placeholder="What's this sheet for?"
                    rows={3}
                  />
                </div>
                <div className="flex space-x-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 px-4 py-2.5 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-600 bg-white hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
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
