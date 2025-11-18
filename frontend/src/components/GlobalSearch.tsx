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
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-start justify-center p-4 pt-20">
        <div className="relative w-full max-w-2xl rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl border border-slate-700">
          {/* Search Header */}
          <div className="border-b border-slate-700 p-4">
            <div className="flex items-center space-x-3">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search sheets, columns, or data..."
                className="flex-1 text-lg bg-transparent text-white placeholder-slate-400 focus:outline-none"
                autoFocus
              />
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filters */}
            <div className="mt-3 flex items-center space-x-2">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as SearchType)}
                className="text-xs px-3 py-1.5 bg-slate-800 border border-slate-600 text-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Type: All</option>
                <option value="sheets">Type: Sheets</option>
                <option value="rows">Type: Rows</option>
                <option value="columns">Type: Columns</option>
              </select>

              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {query.length < 2 ? (
              <div className="p-8 text-center text-slate-400">
                <Search className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                <p className="text-sm">Type at least 2 characters to search</p>
                <p className="text-xs text-slate-500 mt-1">
                  Search for sheets, columns, or data
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <div className="text-6xl mb-3">🏜️</div>
                <p className="text-sm font-medium">No results found for "{query}"</p>
                <p className="text-xs text-slate-500 mt-1">
                  Try searching for another term or adjusting your filters
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.sheetId}-${index}`}
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-start space-x-3 p-4 hover:bg-slate-800 transition-colors text-left"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {result.type === 'sheet' && (
                        <div className="p-2 bg-blue-900/50 rounded-lg border border-blue-700">
                          <FileText className="h-4 w-4 text-blue-400" />
                        </div>
                      )}
                      {result.type === 'column' && (
                        <div className="p-2 bg-purple-900/50 rounded-lg border border-purple-700">
                          <Columns className="h-4 w-4 text-purple-400" />
                        </div>
                      )}
                      {result.type === 'row' && (
                        <div className="p-2 bg-green-900/50 rounded-lg border border-green-700">
                          <Table className="h-4 w-4 text-green-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {result.title}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {result.subtitle}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300 capitalize">
                        {result.type}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-700 px-4 py-2 bg-slate-900/50 text-xs text-slate-400 flex items-center justify-between rounded-b-xl">
            <span>Press Esc to close</span>
            <span>{results.length > 0 ? `${results.length} results` : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
