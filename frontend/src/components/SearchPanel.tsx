import { useState, useEffect, useCallback } from 'react';
import { X, Search, ChevronUp, ChevronDown } from 'lucide-react';
import type { Row, Column } from '../types';

interface SearchMatch {
  rowIndex: number;
  colIndex: number;
  cellId: string;
}

interface SearchPanelProps {
  rows: Row[];
  columns: Column[];
  onClose: () => void;
  onNavigateToCell: (rowIndex: number, colIndex: number) => void;
}

export default function SearchPanel({
  rows,
  columns,
  onClose,
  onNavigateToCell,
}: SearchPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Search when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setMatches([]);
      setCurrentMatchIndex(0);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const newMatches: SearchMatch[] = [];

    rows.forEach((row, rowIndex) => {
      columns.forEach((column, colIndex) => {
        const cell = row.cells?.find((c) => c.columnId === column.id);
        if (cell?.value) {
          try {
            const value = JSON.parse(cell.value);
            if (String(value).toLowerCase().includes(searchLower)) {
              newMatches.push({ rowIndex, colIndex, cellId: cell.id });
            }
          } catch {
            if (cell.value.toLowerCase().includes(searchLower)) {
              newMatches.push({ rowIndex, colIndex, cellId: cell.id });
            }
          }
        }
      });
    });

    setMatches(newMatches);
    setCurrentMatchIndex(0);

    // Navigate to first match
    if (newMatches.length > 0) {
      onNavigateToCell(newMatches[0].rowIndex, newMatches[0].colIndex);
    }
  }, [searchTerm, rows, columns, onNavigateToCell]);

  const goToNextMatch = useCallback(() => {
    if (matches.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIndex);
    onNavigateToCell(matches[nextIndex].rowIndex, matches[nextIndex].colIndex);
  }, [matches, currentMatchIndex, onNavigateToCell]);

  const goToPrevMatch = useCallback(() => {
    if (matches.length === 0) return;
    const prevIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIndex);
    onNavigateToCell(matches[prevIndex].rowIndex, matches[prevIndex].colIndex);
  }, [matches, currentMatchIndex, onNavigateToCell]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        if (e.shiftKey) {
          goToPrevMatch();
        } else {
          goToNextMatch();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goToNextMatch, goToPrevMatch]);

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm">
      <div className="px-4 py-2 flex items-center space-x-3">
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Find in sheet..."
            autoFocus
            className="flex-1 text-sm border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          {searchTerm && (
            <span className="text-xs text-slate-500">
              {matches.length === 0
                ? 'No matches'
                : `${currentMatchIndex + 1} of ${matches.length}`}
            </span>
          )}

          <button
            onClick={goToPrevMatch}
            disabled={matches.length === 0}
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous match (Shift+Enter)"
          >
            <ChevronUp className="h-4 w-4 text-slate-600" />
          </button>

          <button
            onClick={goToNextMatch}
            disabled={matches.length === 0}
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next match (Enter)"
          >
            <ChevronDown className="h-4 w-4 text-slate-600" />
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            title="Close (Escape)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
