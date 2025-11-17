import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, FileText, Table, Columns } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { sheetApi } from '../services/api';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

type SearchType = 'all' | 'sheets' | 'rows' | 'columns';

interface SearchResult {
  type: 'sheet' | 'row' | 'column';
  sheetId: string;
  sheetName: string;
  title: string;
  subtitle?: string;
  rowIndex?: number;
  columnId?: string;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('all');
  const [results, setResults] = useState<SearchResult[]>([]);

  // Fetch all sheets for searching
  const { data: sheets } = useQuery({
    queryKey: ['sheets'],
    queryFn: sheetApi.getAll,
    enabled: isOpen,
  });

  // Perform search when query changes (debounced)
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(() => {
      performSearch();
    }, 300); // Debounce 300ms

    return () => clearTimeout(searchTimeout);
  }, [query, searchType, sheets]);

  const performSearch = () => {
    if (!sheets || query.length < 2) {
      setResults([]);
      return;
    }

    const searchResults: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    sheets.forEach((sheet: any) => {
      // Search in sheet names
      if ((searchType === 'all' || searchType === 'sheets') &&
          sheet.name.toLowerCase().includes(lowerQuery)) {
        searchResults.push({
          type: 'sheet',
          sheetId: sheet.id,
          sheetName: sheet.name,
          title: sheet.name,
          subtitle: sheet.description || 'Sheet',
        });
      }

      // Search in columns (if sheet has columns data)
      if ((searchType === 'all' || searchType === 'columns') && sheet.columns) {
        sheet.columns.forEach((column: any) => {
          if (column.name.toLowerCase().includes(lowerQuery)) {
            searchResults.push({
              type: 'column',
              sheetId: sheet.id,
              sheetName: sheet.name,
              columnId: column.id,
              title: column.name,
              subtitle: `Column in ${sheet.name}`,
            });
          }
        });
      }

      // Search in row data (if sheet has rows with cells)
      if ((searchType === 'all' || searchType === 'rows') && sheet.rows) {
        sheet.rows.forEach((row: any, rowIndex: number) => {
          if (row.cells) {
            row.cells.forEach((cell: any) => {
              if (cell.value) {
                try {
                  const cellValue = JSON.parse(cell.value);
                  if (typeof cellValue === 'string' && cellValue.toLowerCase().includes(lowerQuery)) {
                    searchResults.push({
                      type: 'row',
                      sheetId: sheet.id,
                      sheetName: sheet.name,
                      rowIndex: rowIndex,
                      title: cellValue.substring(0, 50) + (cellValue.length > 50 ? '...' : ''),
                      subtitle: `Row ${rowIndex + 1} in ${sheet.name}`,
                    });
                  }
                } catch {}
              }
            });
          }
        });
      }
    });

    setResults(searchResults.slice(0, 20)); // Limit to 20 results
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(`/sheet/${result.sheetId}`);
    onClose();
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      setQuery('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-start justify-center p-4 pt-20">
        <div className="relative w-full max-w-2xl rounded-lg bg-white shadow-2xl">
          {/* Search Header */}
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <Search className="h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search sheets, columns, or data..."
                className="flex-1 text-lg focus:outline-none"
                autoFocus
              />
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filters */}
            <div className="mt-3 flex items-center space-x-2">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as SearchType)}
                className="text-xs px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Type: All</option>
                <option value="sheets">Type: Sheets</option>
                <option value="rows">Type: Rows</option>
                <option value="columns">Type: Columns</option>
              </select>

              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {query.length < 2 ? (
              <div className="p-8 text-center text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Type at least 2 characters to search</p>
                <p className="text-xs text-gray-400 mt-1">
                  Search for sheets, columns, or data
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-6xl mb-3">🏜️</div>
                <p className="text-sm font-medium">No results found for "{query}"</p>
                <p className="text-xs text-gray-400 mt-1">
                  Try searching for another term or adjusting your filters
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.sheetId}-${index}`}
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-start space-x-3 p-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {result.type === 'sheet' && (
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                      )}
                      {result.type === 'column' && (
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Columns className="h-4 w-4 text-purple-600" />
                        </div>
                      )}
                      {result.type === 'row' && (
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Table className="h-4 w-4 text-green-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {result.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {result.subtitle}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                        {result.type}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
            <span>Press Esc to close</span>
            <span>{results.length > 0 ? `${results.length} results` : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
