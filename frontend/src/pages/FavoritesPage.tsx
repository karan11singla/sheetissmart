import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText, Star, Trash2, Clock } from 'lucide-react';
import { sheetApi } from '../services/api';
import type { Sheet } from '../types';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: sheets, isLoading } = useQuery({
    queryKey: ['sheets'],
    queryFn: sheetApi.getAll,
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

  const favoriteSheets = sheets?.filter((s: Sheet) => s.isFavorite) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading favorites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Favorites</h1>
          <p className="mt-1 text-sm text-gray-600">
            Quick access to your favorite spreadsheets.
          </p>
        </div>

        {/* Favorite Sheets */}
        <div>
          {favoriteSheets.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <Star className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-sm font-medium text-gray-900">No favorites yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Star your favorite sheets to see them here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {favoriteSheets.map((sheet: Sheet) => (
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
      </div>
    </div>
  );
}
