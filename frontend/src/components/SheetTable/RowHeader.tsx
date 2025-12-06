import { useState } from 'react';
import { Edit3, Trash2, MessageSquare, ArrowUp, ArrowDown } from 'lucide-react';
import type { RowHeaderProps } from './types';

export default function RowHeader({
  row,
  rowIndex,
  isViewOnly,
  onRename,
  onDelete,
  onCommentClick,
  onInsertAbove,
  onInsertBelow,
}: RowHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(row.name || '');

  const handleSave = () => {
    if (name.trim() && name !== row.name) {
      onRename(row.id, name.trim());
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Delete row ${row.name || rowIndex + 1}? This will permanently delete all data in this row.`)) {
      onDelete(row.id);
    }
  };

  if (isEditing) {
    return (
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') setIsEditing(false);
        }}
        autoFocus
        placeholder={`${rowIndex + 1}`}
        className="w-20 text-center font-semibold bg-white border-b-2 border-blue-500 px-2 py-1 focus:outline-none rounded"
      />
    );
  }

  const hasComments = !!(row?._count?.comments && row._count.comments > 0);

  return (
    <div className="flex items-center justify-center space-x-1.5 group h-full">
      <span
        className="cursor-pointer hover:text-blue-600 transition-colors"
        onDoubleClick={() => !isViewOnly && setIsEditing(true)}
        title="Double-click to rename row"
      >
        {row.name || `${rowIndex + 1}`}
      </span>

      {/* Comment icon */}
      {onCommentClick && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCommentClick(row.id);
          }}
          className={`p-0.5 rounded hover:bg-indigo-100 transition-all ${
            hasComments ? 'opacity-100 text-indigo-600' : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600'
          }`}
          title={hasComments ? `${row._count?.comments} comment${row._count?.comments !== 1 ? 's' : ''}` : 'Add comment'}
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </button>
      )}

      {!isViewOnly && (
        <>
          {onInsertAbove && (
            <button
              onClick={() => onInsertAbove(row.position)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-green-100 transition-all"
              title="Insert row above"
            >
              <ArrowUp className="h-3 w-3 text-green-600" />
            </button>
          )}
          {onInsertBelow && (
            <button
              onClick={() => onInsertBelow(row.position + 1)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-green-100 transition-all"
              title="Insert row below"
            >
              <ArrowDown className="h-3 w-3 text-green-600" />
            </button>
          )}
          <button
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-blue-100 transition-all"
            title="Rename row"
          >
            <Edit3 className="h-3 w-3 text-blue-600" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 rounded-md hover:bg-red-100 transition-colors text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
            title="Delete row"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}
