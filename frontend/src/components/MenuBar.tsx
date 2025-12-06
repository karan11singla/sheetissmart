import { useState, useRef, useEffect } from 'react';
import {
  Undo2,
  Redo2,
  Copy,
  Clipboard,
  Scissors,
  Trash2,
  ArrowUpFromLine,
  ArrowDownFromLine,
  ArrowLeftFromLine,
  ArrowRightFromLine,
  Share2,
  Download,
  Printer,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  SortAsc,
  SortDesc,
  Filter,
  Search,
  Grid3X3,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface MenuBarProps {
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onCopy?: () => void;
  onPaste?: () => void;
  onCut?: () => void;
  onDelete?: () => void;
  onInsertRowAbove?: () => void;
  onInsertRowBelow?: () => void;
  onInsertColumnLeft?: () => void;
  onInsertColumnRight?: () => void;
  onShare?: () => void;
  onExport?: () => void;
  onPrint?: () => void;
  onBold?: () => void;
  onItalic?: () => void;
  onUnderline?: () => void;
  onAlignLeft?: () => void;
  onAlignCenter?: () => void;
  onAlignRight?: () => void;
  onSortAsc?: () => void;
  onSortDesc?: () => void;
  onFilter?: () => void;
  onSearch?: () => void;
  isViewOnly?: boolean;
}

interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  divider?: boolean;
}

interface Menu {
  label: string;
  items: MenuItem[];
}

export default function MenuBar({
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onCopy,
  onPaste,
  onCut,
  onDelete,
  onInsertRowAbove,
  onInsertRowBelow,
  onInsertColumnLeft,
  onInsertColumnRight,
  onShare,
  onExport,
  onPrint,
  onBold,
  onItalic,
  onUnderline,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onSortAsc,
  onSortDesc,
  onFilter,
  onSearch,
  isViewOnly = false,
}: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menus: Menu[] = [
    {
      label: 'File',
      items: [
        { label: 'Share', icon: <Share2 className="h-4 w-4" />, onClick: onShare },
        { label: 'divider', divider: true },
        { label: 'Download', icon: <Download className="h-4 w-4" />, onClick: onExport, shortcut: '⌘+S' },
        { label: 'Print', icon: <Printer className="h-4 w-4" />, onClick: onPrint, shortcut: '⌘+P' },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', icon: <Undo2 className="h-4 w-4" />, onClick: onUndo, shortcut: '⌘+Z', disabled: !canUndo },
        { label: 'Redo', icon: <Redo2 className="h-4 w-4" />, onClick: onRedo, shortcut: '⌘+Y', disabled: !canRedo },
        { label: 'divider', divider: true },
        { label: 'Cut', icon: <Scissors className="h-4 w-4" />, onClick: onCut, shortcut: '⌘+X', disabled: isViewOnly },
        { label: 'Copy', icon: <Copy className="h-4 w-4" />, onClick: onCopy, shortcut: '⌘+C' },
        { label: 'Paste', icon: <Clipboard className="h-4 w-4" />, onClick: onPaste, shortcut: '⌘+V', disabled: isViewOnly },
        { label: 'divider', divider: true },
        { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: onDelete, shortcut: 'Del', disabled: isViewOnly },
        { label: 'divider', divider: true },
        { label: 'Find', icon: <Search className="h-4 w-4" />, onClick: onSearch, shortcut: '⌘+F' },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Zoom in', icon: <ZoomIn className="h-4 w-4" />, shortcut: '⌘+=' },
        { label: 'Zoom out', icon: <ZoomOut className="h-4 w-4" />, shortcut: '⌘+-' },
        { label: 'divider', divider: true },
        { label: 'Gridlines', icon: <Grid3X3 className="h-4 w-4" /> },
      ],
    },
    {
      label: 'Insert',
      items: [
        { label: 'Row above', icon: <ArrowUpFromLine className="h-4 w-4" />, onClick: onInsertRowAbove, disabled: isViewOnly },
        { label: 'Row below', icon: <ArrowDownFromLine className="h-4 w-4" />, onClick: onInsertRowBelow, disabled: isViewOnly },
        { label: 'divider', divider: true },
        { label: 'Column left', icon: <ArrowLeftFromLine className="h-4 w-4" />, onClick: onInsertColumnLeft, disabled: isViewOnly },
        { label: 'Column right', icon: <ArrowRightFromLine className="h-4 w-4" />, onClick: onInsertColumnRight, disabled: isViewOnly },
      ],
    },
    {
      label: 'Format',
      items: [
        { label: 'Bold', icon: <Bold className="h-4 w-4" />, onClick: onBold, shortcut: '⌘+B', disabled: isViewOnly },
        { label: 'Italic', icon: <Italic className="h-4 w-4" />, onClick: onItalic, shortcut: '⌘+I', disabled: isViewOnly },
        { label: 'Underline', icon: <Underline className="h-4 w-4" />, onClick: onUnderline, shortcut: '⌘+U', disabled: isViewOnly },
        { label: 'divider', divider: true },
        { label: 'Align left', icon: <AlignLeft className="h-4 w-4" />, onClick: onAlignLeft, disabled: isViewOnly },
        { label: 'Align center', icon: <AlignCenter className="h-4 w-4" />, onClick: onAlignCenter, disabled: isViewOnly },
        { label: 'Align right', icon: <AlignRight className="h-4 w-4" />, onClick: onAlignRight, disabled: isViewOnly },
      ],
    },
    {
      label: 'Data',
      items: [
        { label: 'Sort A → Z', icon: <SortAsc className="h-4 w-4" />, onClick: onSortAsc, disabled: isViewOnly },
        { label: 'Sort Z → A', icon: <SortDesc className="h-4 w-4" />, onClick: onSortDesc, disabled: isViewOnly },
        { label: 'divider', divider: true },
        { label: 'Filter', icon: <Filter className="h-4 w-4" />, onClick: onFilter },
      ],
    },
  ];

  const handleMenuClick = (menuLabel: string) => {
    setOpenMenu(openMenu === menuLabel ? null : menuLabel);
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.onClick && !item.disabled) {
      item.onClick();
    }
    setOpenMenu(null);
  };

  return (
    <div ref={menuRef} className="flex items-center bg-white border-b border-slate-200 px-2">
      {menus.map((menu) => (
        <div key={menu.label} className="relative">
          <button
            onClick={() => handleMenuClick(menu.label)}
            onMouseEnter={() => openMenu && setOpenMenu(menu.label)}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              openMenu === menu.label
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {menu.label}
          </button>

          {openMenu === menu.label && (
            <div className="absolute left-0 top-full mt-0.5 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
              {menu.items.map((item, index) =>
                item.divider ? (
                  <div key={index} className="my-1 border-t border-slate-200" />
                ) : (
                  <button
                    key={item.label}
                    onClick={() => handleItemClick(item)}
                    disabled={item.disabled}
                    className={`w-full flex items-center px-3 py-2 text-sm ${
                      item.disabled
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="w-6 flex-shrink-0">{item.icon}</span>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.shortcut && (
                      <span className="text-xs text-slate-400">{item.shortcut}</span>
                    )}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
