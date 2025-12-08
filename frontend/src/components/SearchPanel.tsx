import { useState, useEffect, useCallback } from 'react';
import { X, Search, ChevronUp, ChevronDown, Replace } from 'lucide-react';
import type { Row, Column } from '../types';

interface SearchMatch {
  rowIndex: number;
  colIndex: number;
  cellId: string;
  value: string;
}

interface SearchPanelProps {
  rows: Row[];
  columns: Column[];
  onClose: () => void;
  onNavigateToCell: (rowIndex: number, colIndex: number) => void;
  onReplace?: (cellId: string, oldValue: string, newValue: string) => void;
  isViewOnly?: boolean;
}

export default function SearchPanel({
  rows,
  columns,
  onClose,
  onNavigateToCell,
  onReplace,
  isViewOnly = false,
}: SearchPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeCell, setWholeCell] = useState(false);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Check if a value matches the search term
  const checkMatch = useCallback((value: string): boolean => {
    if (!searchTerm.trim()) return false;

    const searchStr = caseSensitive ? searchTerm : searchTerm.toLowerCase();
    const valueStr = caseSensitive ? value : value.toLowerCase();

    if (wholeCell) {
      return valueStr === searchStr;
    }
    return valueStr.includes(searchStr);
  }, [searchTerm, caseSensitive, wholeCell]);

  // Search when search term or options change
  useEffect(() => {
    if (!searchTerm.trim()) {
      setMatches([]);
      setCurrentMatchIndex(0);
      return;
    }

    const newMatches: SearchMatch[] = [];

    rows.forEach((row, rowIndex) => {
      columns.forEach((column, colIndex) => {
        const cell = row.cells?.find((c) => c.columnId === column.id);
        if (cell?.value) {
          try {
            const value = String(JSON.parse(cell.value));
            if (checkMatch(value)) {
              newMatches.push({ rowIndex, colIndex, cellId: cell.id, value });
            }
          } catch {
            if (checkMatch(cell.value)) {
              newMatches.push({ rowIndex, colIndex, cellId: cell.id, value: cell.value });
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
  }, [searchTerm, rows, columns, onNavigateToCell, checkMatch, caseSensitive, wholeCell]);

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

  // Replace current match
  const handleReplace = useCallback(() => {
    if (matches.length === 0 || !onReplace || isViewOnly) return;

    const currentMatch = matches[currentMatchIndex];
    const oldValue = currentMatch.value;
    let newValue: string;

    if (wholeCell) {
      // Replace entire cell
      newValue = replaceTerm;
    } else {
      // Replace only the matched text
      if (caseSensitive) {
        newValue = oldValue.replace(searchTerm, replaceTerm);
      } else {
        const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        newValue = oldValue.replace(regex, replaceTerm);
      }
    }

    onReplace(currentMatch.cellId, oldValue, newValue);

    // Move to next match after replace
    if (matches.length > 1) {
      goToNextMatch();
    }
  }, [matches, currentMatchIndex, onReplace, isViewOnly, wholeCell, caseSensitive, searchTerm, replaceTerm, goToNextMatch]);

  // Replace all matches
  const handleReplaceAll = useCallback(() => {
    if (matches.length === 0 || !onReplace || isViewOnly) return;

    // Process all matches
    matches.forEach((match) => {
      const oldValue = match.value;
      let newValue: string;

      if (wholeCell) {
        newValue = replaceTerm;
      } else {
        if (caseSensitive) {
          // Replace all occurrences
          newValue = oldValue.split(searchTerm).join(replaceTerm);
        } else {
          const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          newValue = oldValue.replace(regex, replaceTerm);
        }
      }

      onReplace(match.cellId, oldValue, newValue);
    });
  }, [matches, onReplace, isViewOnly, wholeCell, caseSensitive, searchTerm, replaceTerm]);

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
      <div className="px-4 py-2 space-y-2">
        {/* Find row */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 flex-1 max-w-md">
            <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
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
              <span className="text-xs text-slate-500 min-w-[70px] text-right">
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

            {!isViewOnly && (
              <button
                onClick={() => setShowReplace(!showReplace)}
                className={`p-1 rounded hover:bg-slate-100 ${showReplace ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                title="Toggle replace"
              >
                <Replace className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={() => {
                setCaseSensitive(!caseSensitive);
              }}
              className={`p-1 rounded hover:bg-slate-100 text-xs font-bold ${caseSensitive ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              title="Match case"
            >
              Aa
            </button>

            <button
              onClick={() => {
                setWholeCell(!wholeCell);
              }}
              className={`p-1 rounded hover:bg-slate-100 text-xs font-semibold ${wholeCell ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              title="Match whole cell"
            >
              [ab]
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

        {/* Replace row */}
        {showReplace && !isViewOnly && (
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 flex-1 max-w-md">
              <Replace className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                placeholder="Replace with..."
                className="flex-1 text-sm border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleReplace}
                disabled={matches.length === 0}
                className="px-3 py-1 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="Replace current match"
              >
                Replace
              </button>

              <button
                onClick={handleReplaceAll}
                disabled={matches.length === 0}
                className="px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="Replace all matches"
              >
                Replace all
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
