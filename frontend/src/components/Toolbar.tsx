import { useState, useRef, useEffect } from 'react';
import {
  Undo2,
  Redo2,
  Printer,
  PaintBucket,
  ChevronDown,
  DollarSign,
  Percent,
  Minus,
  Plus,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Type,
  Paintbrush,
  Grid3X3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  WrapText,
  RotateCcw,
  Eraser,
  Link,
  MessageSquare,
  BarChart3,
  FunctionSquare,
  MoreHorizontal,
  Merge,
  SplitSquareHorizontal,
  Search,
} from 'lucide-react';

interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  numberFormat?: 'general' | 'number' | 'currency' | 'percentage' | 'date' | 'date_short' | 'date_medium' | 'date_long' | 'date_iso' | 'date_time' | 'date_time_long';
  decimals?: number;
  borderStyle?: 'none' | 'solid';
  borderTop?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
  borderRight?: boolean;
  textRotation?: number;
  wrap?: boolean;
}

interface ToolbarProps {
  // Undo/Redo
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Cell formatting
  currentFormat: CellFormat;
  onFormatChange: (format: Partial<CellFormat>) => void;

  // Cell selection
  hasSelection: boolean;
  hasRangeSelection: boolean;

  // Cell merge
  onMergeCells?: () => void;
  onUnmergeCells?: () => void;
  isMerged?: boolean;

  // Format painter
  onFormatPainterClick?: () => void;
  isFormatPainterActive?: boolean;
  onClearFormatting?: () => void;

  // Other actions
  onPrint?: () => void;
  onInsertLink?: () => void;
  onInsertComment?: () => void;
  onInsertChart?: () => void;
  onInsertFunction?: () => void;

  // Zoom
  zoom?: number;
  onZoomChange?: (zoom: number) => void;

  // View only mode
  isViewOnly?: boolean;
}

// Dropdown component for toolbar
function ToolbarDropdown({
  trigger,
  children,
  disabled
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {trigger}
      </button>
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 min-w-[160px]">
          {children}
        </div>
      )}
    </div>
  );
}

// Icon button component
function IconButton({
  icon,
  title,
  onClick,
  active,
  disabled,
  className = '',
}: {
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? 'bg-blue-100 text-blue-700' : 'text-slate-600'
      } ${className}`}
    >
      {icon}
    </button>
  );
}

// Separator component
function Separator() {
  return <div className="w-px h-6 bg-slate-200 mx-1" />;
}

export default function Toolbar({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  currentFormat,
  onFormatChange,
  hasSelection,
  hasRangeSelection,
  onMergeCells,
  onUnmergeCells,
  isMerged,
  onFormatPainterClick,
  isFormatPainterActive,
  onClearFormatting,
  onPrint,
  onInsertLink,
  onInsertComment,
  onInsertChart,
  onInsertFunction,
  zoom = 100,
  onZoomChange,
  isViewOnly = false,
}: ToolbarProps) {
  const [showSearch, setShowSearch] = useState(false);

  const fonts = [
    'Default',
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Georgia',
    'Courier New',
    'Verdana',
  ];

  const fontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];
  const currentFontSize = currentFormat.fontSize || 12;

  const handleFontSizeChange = (delta: number) => {
    const currentIndex = fontSizes.indexOf(currentFontSize);
    const newIndex = Math.max(0, Math.min(fontSizes.length - 1, currentIndex + delta));
    onFormatChange({ fontSize: fontSizes[newIndex] });
  };

  const zoomLevels = [50, 75, 90, 100, 125, 150, 200];

  return (
    <div className="bg-slate-50 border-b border-slate-200 px-2 py-1.5">
      <div className="flex items-center gap-0.5 flex-wrap">
        {/* Search */}
        <IconButton
          icon={<Search className="h-4 w-4" />}
          title="Search (Ctrl+F)"
          onClick={() => setShowSearch(!showSearch)}
        />

        <Separator />

        {/* Undo/Redo */}
        <IconButton
          icon={<Undo2 className="h-4 w-4" />}
          title="Undo (Ctrl+Z)"
          onClick={onUndo}
          disabled={!canUndo}
        />
        <IconButton
          icon={<Redo2 className="h-4 w-4" />}
          title="Redo (Ctrl+Y)"
          onClick={onRedo}
          disabled={!canRedo}
        />

        <Separator />

        {/* Print */}
        <IconButton
          icon={<Printer className="h-4 w-4" />}
          title="Print (Ctrl+P)"
          onClick={onPrint}
        />

        {/* Format Painter */}
        <IconButton
          icon={<Paintbrush className="h-4 w-4" />}
          title="Format painter (copy formatting)"
          onClick={onFormatPainterClick}
          active={isFormatPainterActive}
          disabled={isViewOnly || !hasSelection}
        />

        {/* Clear Formatting */}
        <IconButton
          icon={<Eraser className="h-4 w-4" />}
          title="Clear formatting"
          onClick={onClearFormatting}
          disabled={isViewOnly || !hasSelection}
        />

        <Separator />

        {/* Zoom */}
        <ToolbarDropdown
          trigger={
            <div className="flex items-center px-2 py-1 hover:bg-slate-100 rounded text-sm text-slate-700">
              {zoom}%
              <ChevronDown className="h-3 w-3 ml-1" />
            </div>
          }
        >
          {zoomLevels.map((level) => (
            <button
              key={level}
              onClick={() => onZoomChange?.(level)}
              className={`w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 ${
                zoom === level ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
              }`}
            >
              {level}%
            </button>
          ))}
        </ToolbarDropdown>

        <Separator />

        {/* Currency */}
        <IconButton
          icon={<DollarSign className="h-4 w-4" />}
          title="Format as currency"
          onClick={() => onFormatChange({ numberFormat: 'currency' })}
          active={currentFormat.numberFormat === 'currency'}
          disabled={isViewOnly || !hasSelection}
        />

        {/* Percent */}
        <IconButton
          icon={<Percent className="h-4 w-4" />}
          title="Format as percent"
          onClick={() => onFormatChange({ numberFormat: 'percentage' })}
          active={currentFormat.numberFormat === 'percentage'}
          disabled={isViewOnly || !hasSelection}
        />

        {/* Decrease decimals */}
        <IconButton
          icon={
            <span className="text-xs font-medium">.0</span>
          }
          title="Decrease decimal places"
          onClick={() => onFormatChange({ decimals: Math.max(0, (currentFormat.decimals || 2) - 1) })}
          disabled={isViewOnly || !hasSelection}
        />

        {/* Increase decimals */}
        <IconButton
          icon={
            <span className="text-xs font-medium">.00</span>
          }
          title="Increase decimal places"
          onClick={() => onFormatChange({ decimals: (currentFormat.decimals || 2) + 1 })}
          disabled={isViewOnly || !hasSelection}
        />

        {/* Number format */}
        <ToolbarDropdown
          trigger={
            <div className="flex items-center px-2 py-1 hover:bg-slate-100 rounded text-sm text-slate-700">
              123
              <ChevronDown className="h-3 w-3 ml-1" />
            </div>
          }
          disabled={isViewOnly || !hasSelection}
        >
          <div className="px-3 py-1 text-xs font-medium text-slate-500 uppercase tracking-wide">General</div>
          <button
            onClick={() => onFormatChange({ numberFormat: 'general' })}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100"
          >
            Automatic
          </button>
          <div className="border-t border-slate-200 my-1" />
          <div className="px-3 py-1 text-xs font-medium text-slate-500 uppercase tracking-wide">Number</div>
          <button
            onClick={() => onFormatChange({ numberFormat: 'number' })}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100"
          >
            Number (1,234.56)
          </button>
          <button
            onClick={() => onFormatChange({ numberFormat: 'currency' })}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100"
          >
            Currency ($1,234.56)
          </button>
          <button
            onClick={() => onFormatChange({ numberFormat: 'percentage' })}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100"
          >
            Percent (12.34%)
          </button>
          <div className="border-t border-slate-200 my-1" />
          <div className="px-3 py-1 text-xs font-medium text-slate-500 uppercase tracking-wide">Date</div>
          <button
            onClick={() => onFormatChange({ numberFormat: 'date_short' })}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100"
          >
            1/15/2024
          </button>
          <button
            onClick={() => onFormatChange({ numberFormat: 'date_medium' })}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100"
          >
            Jan 15, 2024
          </button>
          <button
            onClick={() => onFormatChange({ numberFormat: 'date_long' })}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100"
          >
            January 15, 2024
          </button>
          <button
            onClick={() => onFormatChange({ numberFormat: 'date_iso' })}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100"
          >
            2024-01-15 (ISO)
          </button>
          <div className="border-t border-slate-200 my-1" />
          <div className="px-3 py-1 text-xs font-medium text-slate-500 uppercase tracking-wide">Date & Time</div>
          <button
            onClick={() => onFormatChange({ numberFormat: 'date_time' })}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100"
          >
            1/15/2024 2:30 PM
          </button>
          <button
            onClick={() => onFormatChange({ numberFormat: 'date_time_long' })}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100"
          >
            January 15, 2024 at 2:30 PM
          </button>
        </ToolbarDropdown>

        <Separator />

        {/* Font family */}
        <ToolbarDropdown
          trigger={
            <div className="flex items-center px-2 py-1 hover:bg-slate-100 rounded text-sm text-slate-700 min-w-[80px]">
              {currentFormat.fontFamily || 'Default'}
              <ChevronDown className="h-3 w-3 ml-1" />
            </div>
          }
          disabled={isViewOnly || !hasSelection}
        >
          {fonts.map((font) => (
            <button
              key={font}
              onClick={() => onFormatChange({ fontFamily: font === 'Default' ? undefined : font })}
              className={`w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 ${
                (currentFormat.fontFamily || 'Default') === font ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
              }`}
              style={{ fontFamily: font === 'Default' ? undefined : font }}
            >
              {font}
            </button>
          ))}
        </ToolbarDropdown>

        <Separator />

        {/* Font size */}
        <div className="flex items-center">
          <IconButton
            icon={<Minus className="h-3 w-3" />}
            title="Decrease font size"
            onClick={() => handleFontSizeChange(-1)}
            disabled={isViewOnly || !hasSelection}
          />
          <ToolbarDropdown
            trigger={
              <div className="flex items-center px-2 py-1 hover:bg-slate-100 rounded text-sm text-slate-700 min-w-[40px] justify-center">
                {currentFontSize}
              </div>
            }
            disabled={isViewOnly || !hasSelection}
          >
            {fontSizes.map((size) => (
              <button
                key={size}
                onClick={() => onFormatChange({ fontSize: size })}
                className={`w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 ${
                  currentFontSize === size ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                }`}
              >
                {size}
              </button>
            ))}
          </ToolbarDropdown>
          <IconButton
            icon={<Plus className="h-3 w-3" />}
            title="Increase font size"
            onClick={() => handleFontSizeChange(1)}
            disabled={isViewOnly || !hasSelection}
          />
        </div>

        <Separator />

        {/* Bold */}
        <IconButton
          icon={<Bold className="h-4 w-4" />}
          title="Bold (Ctrl+B)"
          onClick={() => onFormatChange({ bold: !currentFormat.bold })}
          active={currentFormat.bold}
          disabled={isViewOnly || !hasSelection}
        />

        {/* Italic */}
        <IconButton
          icon={<Italic className="h-4 w-4" />}
          title="Italic (Ctrl+I)"
          onClick={() => onFormatChange({ italic: !currentFormat.italic })}
          active={currentFormat.italic}
          disabled={isViewOnly || !hasSelection}
        />

        {/* Underline */}
        <IconButton
          icon={<Underline className="h-4 w-4" />}
          title="Underline (Ctrl+U)"
          onClick={() => onFormatChange({ underline: !currentFormat.underline })}
          active={currentFormat.underline}
          disabled={isViewOnly || !hasSelection}
        />

        {/* Strikethrough */}
        <IconButton
          icon={<Strikethrough className="h-4 w-4" />}
          title="Strikethrough"
          onClick={() => onFormatChange({ strikethrough: !currentFormat.strikethrough })}
          active={currentFormat.strikethrough}
          disabled={isViewOnly || !hasSelection}
        />

        {/* Text color */}
        <div className="relative">
          <input
            type="color"
            value={currentFormat.color || '#000000'}
            onChange={(e) => onFormatChange({ color: e.target.value })}
            disabled={isViewOnly || !hasSelection}
            className="absolute inset-0 opacity-0 w-8 h-8 cursor-pointer disabled:cursor-not-allowed"
            title="Text color"
          />
          <div className={`p-1.5 rounded hover:bg-slate-100 ${isViewOnly || !hasSelection ? 'opacity-40' : ''}`}>
            <div className="relative">
              <Type className="h-4 w-4 text-slate-600" />
              <div
                className="absolute -bottom-0.5 left-0 right-0 h-1 rounded-sm"
                style={{ backgroundColor: currentFormat.color || '#000000' }}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Fill color */}
        <div className="relative">
          <input
            type="color"
            value={currentFormat.backgroundColor || '#ffffff'}
            onChange={(e) => onFormatChange({ backgroundColor: e.target.value })}
            disabled={isViewOnly || !hasSelection}
            className="absolute inset-0 opacity-0 w-8 h-8 cursor-pointer disabled:cursor-not-allowed"
            title="Fill color"
          />
          <div className={`p-1.5 rounded hover:bg-slate-100 ${isViewOnly || !hasSelection ? 'opacity-40' : ''}`}>
            <div className="relative">
              <PaintBucket className="h-4 w-4 text-slate-600" />
              <div
                className="absolute -bottom-0.5 left-0 right-0 h-1 rounded-sm border border-slate-300"
                style={{ backgroundColor: currentFormat.backgroundColor || '#ffffff' }}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Borders */}
        <ToolbarDropdown
          trigger={
            <div className="flex items-center p-1.5 hover:bg-slate-100 rounded">
              <Grid3X3 className="h-4 w-4 text-slate-600" />
              <ChevronDown className="h-3 w-3 ml-0.5 text-slate-400" />
            </div>
          }
          disabled={isViewOnly || !hasSelection}
        >
          <button
            onClick={() => onFormatChange({ borderStyle: 'solid', borderTop: true, borderBottom: true, borderLeft: true, borderRight: true })}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
          >
            <Grid3X3 className="h-4 w-4" /> All borders
          </button>
          <button
            onClick={() => onFormatChange({ borderStyle: 'none', borderTop: false, borderBottom: false, borderLeft: false, borderRight: false })}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
          >
            <div className="h-4 w-4 border border-dashed border-slate-300" /> No borders
          </button>
          <div className="border-t border-slate-200 my-1" />
          <button
            onClick={() => onFormatChange({ borderTop: true, borderBottom: false, borderLeft: false, borderRight: false })}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
          >
            <div className="h-4 w-4 border-t-2 border-slate-600" /> Top border
          </button>
          <button
            onClick={() => onFormatChange({ borderTop: false, borderBottom: true, borderLeft: false, borderRight: false })}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
          >
            <div className="h-4 w-4 border-b-2 border-slate-600" /> Bottom border
          </button>
          <button
            onClick={() => onFormatChange({ borderTop: false, borderBottom: false, borderLeft: true, borderRight: false })}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
          >
            <div className="h-4 w-4 border-l-2 border-slate-600" /> Left border
          </button>
          <button
            onClick={() => onFormatChange({ borderTop: false, borderBottom: false, borderLeft: false, borderRight: true })}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
          >
            <div className="h-4 w-4 border-r-2 border-slate-600" /> Right border
          </button>
          <div className="border-t border-slate-200 my-1" />
          <button
            onClick={() => onFormatChange({ borderTop: true, borderBottom: true, borderLeft: true, borderRight: true })}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
          >
            <div className="h-4 w-4 border-2 border-slate-600" /> Outside borders
          </button>
        </ToolbarDropdown>

        <Separator />

        {/* Merge cells */}
        <ToolbarDropdown
          trigger={
            <div className="flex items-center p-1.5 hover:bg-slate-100 rounded">
              <Merge className="h-4 w-4 text-slate-600" />
              <ChevronDown className="h-3 w-3 ml-0.5 text-slate-400" />
            </div>
          }
          disabled={isViewOnly || !hasRangeSelection}
        >
          <button
            onClick={onMergeCells}
            disabled={isMerged}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2 disabled:opacity-50"
          >
            <Merge className="h-4 w-4" /> Merge cells
          </button>
          <button
            onClick={onUnmergeCells}
            disabled={!isMerged}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2 disabled:opacity-50"
          >
            <SplitSquareHorizontal className="h-4 w-4" /> Unmerge cells
          </button>
        </ToolbarDropdown>

        <Separator />

        {/* Horizontal alignment */}
        <ToolbarDropdown
          trigger={
            <div className="flex items-center p-1.5 hover:bg-slate-100 rounded">
              {currentFormat.align === 'center' ? (
                <AlignCenter className="h-4 w-4 text-slate-600" />
              ) : currentFormat.align === 'right' ? (
                <AlignRight className="h-4 w-4 text-slate-600" />
              ) : (
                <AlignLeft className="h-4 w-4 text-slate-600" />
              )}
              <ChevronDown className="h-3 w-3 ml-0.5 text-slate-400" />
            </div>
          }
          disabled={isViewOnly || !hasSelection}
        >
          <button
            onClick={() => onFormatChange({ align: 'left' })}
            className={`w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2 ${
              currentFormat.align === 'left' ? 'bg-blue-50 text-blue-700' : ''
            }`}
          >
            <AlignLeft className="h-4 w-4" /> Left
          </button>
          <button
            onClick={() => onFormatChange({ align: 'center' })}
            className={`w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2 ${
              currentFormat.align === 'center' ? 'bg-blue-50 text-blue-700' : ''
            }`}
          >
            <AlignCenter className="h-4 w-4" /> Center
          </button>
          <button
            onClick={() => onFormatChange({ align: 'right' })}
            className={`w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2 ${
              currentFormat.align === 'right' ? 'bg-blue-50 text-blue-700' : ''
            }`}
          >
            <AlignRight className="h-4 w-4" /> Right
          </button>
        </ToolbarDropdown>

        {/* Vertical alignment */}
        <ToolbarDropdown
          trigger={
            <div className="flex items-center p-1.5 hover:bg-slate-100 rounded">
              {currentFormat.verticalAlign === 'top' ? (
                <AlignVerticalJustifyStart className="h-4 w-4 text-slate-600" />
              ) : currentFormat.verticalAlign === 'bottom' ? (
                <AlignVerticalJustifyEnd className="h-4 w-4 text-slate-600" />
              ) : (
                <AlignVerticalJustifyCenter className="h-4 w-4 text-slate-600" />
              )}
              <ChevronDown className="h-3 w-3 ml-0.5 text-slate-400" />
            </div>
          }
          disabled={isViewOnly || !hasSelection}
        >
          <button
            onClick={() => onFormatChange({ verticalAlign: 'top' })}
            className={`w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2 ${
              currentFormat.verticalAlign === 'top' ? 'bg-blue-50 text-blue-700' : ''
            }`}
          >
            <AlignVerticalJustifyStart className="h-4 w-4" /> Top
          </button>
          <button
            onClick={() => onFormatChange({ verticalAlign: 'middle' })}
            className={`w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2 ${
              currentFormat.verticalAlign === 'middle' || !currentFormat.verticalAlign ? 'bg-blue-50 text-blue-700' : ''
            }`}
          >
            <AlignVerticalJustifyCenter className="h-4 w-4" /> Middle
          </button>
          <button
            onClick={() => onFormatChange({ verticalAlign: 'bottom' })}
            className={`w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2 ${
              currentFormat.verticalAlign === 'bottom' ? 'bg-blue-50 text-blue-700' : ''
            }`}
          >
            <AlignVerticalJustifyEnd className="h-4 w-4" /> Bottom
          </button>
        </ToolbarDropdown>

        {/* Text wrapping */}
        <IconButton
          icon={<WrapText className="h-4 w-4" />}
          title="Text wrapping"
          onClick={() => onFormatChange({ wrap: !currentFormat.wrap })}
          active={currentFormat.wrap}
          disabled={isViewOnly || !hasSelection}
        />

        {/* Text rotation */}
        <ToolbarDropdown
          trigger={
            <div className="flex items-center p-1.5 hover:bg-slate-100 rounded">
              <RotateCcw className="h-4 w-4 text-slate-600" />
              <ChevronDown className="h-3 w-3 ml-0.5 text-slate-400" />
            </div>
          }
          disabled={isViewOnly || !hasSelection}
        >
          <button
            onClick={() => onFormatChange({ textRotation: 0 })}
            className={`w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2 ${
              (currentFormat.textRotation || 0) === 0 ? 'bg-blue-50 text-blue-700' : ''
            }`}
          >
            <span className="w-4 text-center">—</span> None
          </button>
          <button
            onClick={() => onFormatChange({ textRotation: -45 })}
            className={`w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2 ${
              currentFormat.textRotation === -45 ? 'bg-blue-50 text-blue-700' : ''
            }`}
          >
            <span className="w-4 text-center transform -rotate-45">↗</span> Tilt up
          </button>
          <button
            onClick={() => onFormatChange({ textRotation: 45 })}
            className={`w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2 ${
              currentFormat.textRotation === 45 ? 'bg-blue-50 text-blue-700' : ''
            }`}
          >
            <span className="w-4 text-center transform rotate-45">↘</span> Tilt down
          </button>
          <button
            onClick={() => onFormatChange({ textRotation: -90 })}
            className={`w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2 ${
              currentFormat.textRotation === -90 ? 'bg-blue-50 text-blue-700' : ''
            }`}
          >
            <span className="w-4 text-center">↑</span> Vertical up
          </button>
          <button
            onClick={() => onFormatChange({ textRotation: 90 })}
            className={`w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2 ${
              currentFormat.textRotation === 90 ? 'bg-blue-50 text-blue-700' : ''
            }`}
          >
            <span className="w-4 text-center">↓</span> Vertical down
          </button>
        </ToolbarDropdown>

        <Separator />

        {/* Insert link */}
        <IconButton
          icon={<Link className="h-4 w-4" />}
          title="Insert link (Ctrl+K)"
          onClick={onInsertLink}
          disabled={isViewOnly || !hasSelection}
        />

        {/* Insert comment */}
        <IconButton
          icon={<MessageSquare className="h-4 w-4" />}
          title="Insert comment (Ctrl+Alt+M)"
          onClick={onInsertComment}
          disabled={isViewOnly || !hasSelection}
        />

        {/* Insert chart */}
        <IconButton
          icon={<BarChart3 className="h-4 w-4" />}
          title="Insert chart"
          onClick={onInsertChart}
          disabled={isViewOnly}
        />

        <Separator />

        {/* Functions */}
        <IconButton
          icon={<FunctionSquare className="h-4 w-4" />}
          title="Functions"
          onClick={onInsertFunction}
          disabled={isViewOnly || !hasSelection}
        />

        {/* More options */}
        <IconButton
          icon={<MoreHorizontal className="h-4 w-4" />}
          title="More options"
        />
      </div>
    </div>
  );
}
