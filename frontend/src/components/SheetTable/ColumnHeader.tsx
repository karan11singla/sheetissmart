import { useState } from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import type { ColumnHeaderProps } from './types';

export default function ColumnHeader({
  column,
  isViewOnly,
  onRename,
  onDelete,
}: ColumnHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(column.name);

  const handleSave = () => {
    if (name.trim() && name !== column.name) {
      onRename(column.id, name.trim());
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Delete column "${column.name}"? This will permanently delete all data in this column.`)) {
      onDelete(column.id);
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
        className="w-full font-bold bg-white border-b-2 border-blue-500 px-2 py-1 focus:outline-none rounded"
      />
    );
  }

  return (
    <div className="flex items-center justify-between w-full group">
      <div className="flex items-center space-x-1.5">
        <span
          className="truncate cursor-pointer hover:text-blue-600 font-bold transition-colors"
          onDoubleClick={() => !isViewOnly && setIsEditing(true)}
          title="Double-click to rename"
        >
          {column.name}
        </span>
        {!isViewOnly && (
          <button
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-blue-100 transition-all"
            title="Rename column"
          >
            <Edit3 className="h-3 w-3 text-blue-600" />
          </button>
        )}
      </div>
      {!isViewOnly && (
        <button
          onClick={handleDelete}
          className="p-0.5 rounded hover:bg-red-100 transition-colors text-gray-400 hover:text-red-600"
          title="Delete column"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
