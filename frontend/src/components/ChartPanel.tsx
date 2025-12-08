import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import {
  Plus,
  Trash2,
  BarChart3,
  LineChartIcon,
  PieChartIcon,
  AreaChartIcon,
  ScatterChartIcon,
  CircleDot,
  BarChart2,
  Edit2,
  X,
  Check,
} from 'lucide-react';
import { chartApi } from '../services/api';
import type { Chart, ChartType, ChartConfig, ChartPosition, Sheet } from '../types';

interface ChartPanelProps {
  sheet: Sheet;
  onClose: () => void;
}

const CHART_TYPES: { type: ChartType; label: string; icon: React.ReactNode }[] = [
  { type: 'BAR', label: 'Bar', icon: <BarChart3 className="w-4 h-4" /> },
  { type: 'COLUMN', label: 'Column', icon: <BarChart2 className="w-4 h-4" /> },
  { type: 'LINE', label: 'Line', icon: <LineChartIcon className="w-4 h-4" /> },
  { type: 'AREA', label: 'Area', icon: <AreaChartIcon className="w-4 h-4" /> },
  { type: 'PIE', label: 'Pie', icon: <PieChartIcon className="w-4 h-4" /> },
  { type: 'DOUGHNUT', label: 'Doughnut', icon: <CircleDot className="w-4 h-4" /> },
  { type: 'SCATTER', label: 'Scatter', icon: <ScatterChartIcon className="w-4 h-4" /> },
];

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export function ChartPanel({ sheet, onClose }: ChartPanelProps) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedChart, setSelectedChart] = useState<Chart | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [chartType, setChartType] = useState<ChartType>('BAR');
  const [dataRange, setDataRange] = useState('');
  const [labelRange, setLabelRange] = useState('');
  const [showLegend, setShowLegend] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [title, setTitle] = useState('');

  // Fetch charts
  const { data: charts = [], isLoading } = useQuery({
    queryKey: ['charts', sheet.id],
    queryFn: () => chartApi.getAll(sheet.id),
  });

  // Create chart mutation
  const createMutation = useMutation({
    mutationFn: (input: { name: string; type: ChartType; dataRange: string; labelRange?: string; config: ChartConfig; position: ChartPosition }) =>
      chartApi.create(sheet.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charts', sheet.id] });
      resetForm();
      setIsCreating(false);
    },
  });

  // Update chart mutation
  const updateMutation = useMutation({
    mutationFn: ({ chartId, input }: { chartId: string; input: { name?: string; type?: ChartType; dataRange?: string; labelRange?: string; config?: ChartConfig } }) =>
      chartApi.update(chartId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charts', sheet.id] });
      setEditingId(null);
      resetForm();
    },
  });

  // Delete chart mutation
  const deleteMutation = useMutation({
    mutationFn: (chartId: string) => chartApi.delete(chartId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charts', sheet.id] });
      if (selectedChart?.id === editingId) {
        setSelectedChart(null);
      }
    },
  });

  const resetForm = () => {
    setName('');
    setChartType('BAR');
    setDataRange('');
    setLabelRange('');
    setShowLegend(true);
    setShowGrid(true);
    setTitle('');
  };

  const handleCreate = () => {
    if (!name || !dataRange) return;

    createMutation.mutate({
      name,
      type: chartType,
      dataRange,
      labelRange: labelRange || undefined,
      config: {
        title,
        showLegend,
        showGrid,
        colors: COLORS,
      },
      position: { x: 0, y: 0, width: 400, height: 300 },
    });
  };

  const handleUpdate = () => {
    if (!editingId || !name || !dataRange) return;

    updateMutation.mutate({
      chartId: editingId,
      input: {
        name,
        type: chartType,
        dataRange,
        labelRange: labelRange || undefined,
        config: {
          title,
          showLegend,
          showGrid,
          colors: COLORS,
        },
      },
    });
  };

  const startEditing = (chart: Chart) => {
    setEditingId(chart.id);
    setName(chart.name);
    setChartType(chart.type);
    setDataRange(chart.dataRange);
    setLabelRange(chart.labelRange || '');
    const config = typeof chart.config === 'string' ? JSON.parse(chart.config) : chart.config;
    setShowLegend(config.showLegend ?? true);
    setShowGrid(config.showGrid ?? true);
    setTitle(config.title || '');
    setIsCreating(true);
  };

  // Parse range string like "A1:C5" into cell references
  const parseRange = (range: string): { startCol: number; startRow: number; endCol: number; endRow: number } | null => {
    const match = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
    if (!match) return null;

    const colToNum = (col: string) => {
      let num = 0;
      for (let i = 0; i < col.length; i++) {
        num = num * 26 + col.charCodeAt(i) - 64;
      }
      return num - 1;
    };

    return {
      startCol: colToNum(match[1].toUpperCase()),
      startRow: parseInt(match[2]) - 1,
      endCol: colToNum(match[3].toUpperCase()),
      endRow: parseInt(match[4]) - 1,
    };
  };

  // Extract chart data from sheet
  const getChartData = (chart: Chart) => {
    const dataRangeParsed = parseRange(chart.dataRange);
    const labelRangeParsed = chart.labelRange ? parseRange(chart.labelRange) : null;

    if (!dataRangeParsed || !sheet.rows || !sheet.columns) return [];

    const sortedRows = [...(sheet.rows || [])].sort((a, b) => a.position - b.position);
    const sortedCols = [...(sheet.columns || [])].sort((a, b) => a.position - b.position);

    const data: { name: string; [key: string]: string | number }[] = [];

    for (let r = dataRangeParsed.startRow; r <= dataRangeParsed.endRow; r++) {
      const row = sortedRows[r];
      if (!row) continue;

      const entry: { name: string; [key: string]: string | number } = { name: '' };

      // Get label if labelRange is specified
      if (labelRangeParsed) {
        const labelCol = sortedCols[labelRangeParsed.startCol];
        if (labelCol && row.cells) {
          const labelCell = row.cells.find(c => c.columnId === labelCol.id);
          entry.name = labelCell?.computedValue?.toString() || labelCell?.value || `Row ${r + 1}`;
        }
      } else {
        entry.name = `Row ${r + 1}`;
      }

      // Get data values
      for (let c = dataRangeParsed.startCol; c <= dataRangeParsed.endCol; c++) {
        const col = sortedCols[c];
        if (!col || !row.cells) continue;

        const cell = row.cells.find(cell => cell.columnId === col.id);
        const value = cell?.computedValue ?? cell?.value;
        entry[col.name] = typeof value === 'number' ? value : parseFloat(value || '0') || 0;
      }

      data.push(entry);
    }

    return data;
  };

  // Render chart based on type
  const renderChart = (chart: Chart) => {
    const data = getChartData(chart);
    const config = typeof chart.config === 'string' ? JSON.parse(chart.config) : chart.config;
    const colors = config.colors || COLORS;

    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-slate-400">
          No data in range
        </div>
      );
    }

    const dataKeys = Object.keys(data[0]).filter(k => k !== 'name');

    switch (chart.type) {
      case 'BAR':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip />
              {config.showLegend && <Legend />}
              {dataKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={colors[i % colors.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'COLUMN':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              {config.showLegend && <Legend />}
              {dataKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={colors[i % colors.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'LINE':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              {config.showLegend && <Legend />}
              {dataKeys.map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} strokeWidth={2} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'AREA':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              {config.showLegend && <Legend />}
              {dataKeys.map((key, i) => (
                <Area key={key} type="monotone" dataKey={key} fill={colors[i % colors.length]} stroke={colors[i % colors.length]} fillOpacity={0.3} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'PIE':
      case 'DOUGHNUT':
        const pieData = data.map((d) => ({
          name: d.name,
          value: dataKeys.reduce((sum, key) => sum + (typeof d[key] === 'number' ? d[key] : 0), 0),
        }));
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={chart.type === 'DOUGHNUT' ? 60 : 0}
                outerRadius={80}
                dataKey="value"
                label
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              {config.showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );

      case 'SCATTER':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" name="Category" />
              <YAxis />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              {config.showLegend && <Legend />}
              {dataKeys.map((key, i) => (
                <Scatter key={key} name={key} data={data.map(d => ({ x: d.name, y: d[key] }))} fill={colors[i % colors.length]} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Charts</h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Create/Edit Form */}
        {isCreating ? (
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm text-slate-700">
              {editingId ? 'Edit Chart' : 'New Chart'}
            </h4>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Chart name"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Chart Type</label>
              <div className="grid grid-cols-4 gap-2">
                {CHART_TYPES.map(({ type, label, icon }) => (
                  <button
                    key={type}
                    onClick={() => setChartType(type)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-md border text-xs ${
                      chartType === type
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Data Range (e.g., B1:C5)
              </label>
              <input
                type="text"
                value={dataRange}
                onChange={(e) => setDataRange(e.target.value.toUpperCase())}
                placeholder="B1:C5"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Label Range (optional, e.g., A1:A5)
              </label>
              <input
                type="text"
                value={labelRange}
                onChange={(e) => setLabelRange(e.target.value.toUpperCase())}
                placeholder="A1:A5"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Title (optional)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Chart title"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={showLegend}
                  onChange={(e) => setShowLegend(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Show Legend
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Show Grid
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={editingId ? handleUpdate : handleCreate}
                disabled={!name || !dataRange || createMutation.isPending || updateMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingId(null);
                  resetForm();
                }}
                className="px-3 py-2 text-slate-600 text-sm rounded-md hover:bg-slate-100 border border-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Chart
          </button>
        )}

        {/* Charts List */}
        {isLoading ? (
          <div className="text-center text-slate-500 py-4">Loading charts...</div>
        ) : charts.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            No charts yet. Create one to visualize your data.
          </div>
        ) : (
          <div className="space-y-3">
            {charts.map((chart) => (
              <div
                key={chart.id}
                className={`border rounded-lg overflow-hidden ${
                  selectedChart?.id === chart.id ? 'border-indigo-500' : 'border-slate-200'
                }`}
              >
                <div
                  className="flex items-center justify-between p-3 bg-slate-50 cursor-pointer"
                  onClick={() => setSelectedChart(selectedChart?.id === chart.id ? null : chart)}
                >
                  <div className="flex items-center gap-2">
                    {CHART_TYPES.find(t => t.type === chart.type)?.icon}
                    <span className="font-medium text-sm text-slate-700">{chart.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(chart);
                      }}
                      className="p-1 hover:bg-slate-200 rounded"
                    >
                      <Edit2 className="w-4 h-4 text-slate-500" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this chart?')) {
                          deleteMutation.mutate(chart.id);
                        }
                      }}
                      className="p-1 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                {selectedChart?.id === chart.id && (
                  <div className="p-4 h-64">
                    {renderChart(chart)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChartPanel;
