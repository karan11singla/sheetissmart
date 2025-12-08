import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  Table2,
  ArrowUpDown,
  Columns,
  Calculator,
  RefreshCw,
} from 'lucide-react';
import { pivotTableApi } from '../services/api';
import type { PivotTable, AggregationType, ValueField, PivotTableComputedData } from '../types';

interface PivotTablePanelProps {
  sheetId: string;
  onClose: () => void;
}

const AGGREGATION_OPTIONS: { value: AggregationType; label: string }[] = [
  { value: 'SUM', label: 'Sum' },
  { value: 'COUNT', label: 'Count' },
  { value: 'AVERAGE', label: 'Average' },
  { value: 'MIN', label: 'Min' },
  { value: 'MAX', label: 'Max' },
  { value: 'COUNT_DISTINCT', label: 'Count Distinct' },
];

export function PivotTablePanel({ sheetId, onClose }: PivotTablePanelProps) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPivotTable, setSelectedPivotTable] = useState<PivotTable | null>(null);
  const [computedData, setComputedData] = useState<PivotTableComputedData | null>(null);
  const [isComputing, setIsComputing] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [sourceRange, setSourceRange] = useState('');
  const [rowFields, setRowFields] = useState<string[]>([]);
  const [columnFields, setColumnFields] = useState<string[]>([]);
  const [valueFields, setValueFields] = useState<ValueField[]>([]);

  // Fetch columns for field selection
  const { data: columns = [] } = useQuery({
    queryKey: ['pivot-columns', sheetId],
    queryFn: () => pivotTableApi.getColumns(sheetId),
  });

  // Fetch pivot tables
  const { data: pivotTables = [], isLoading } = useQuery({
    queryKey: ['pivot-tables', sheetId],
    queryFn: () => pivotTableApi.getAll(sheetId),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof pivotTableApi.create>[1]) =>
      pivotTableApi.create(sheetId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pivot-tables', sheetId] });
      resetForm();
      setIsCreating(false);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ pivotTableId, input }: { pivotTableId: string; input: Parameters<typeof pivotTableApi.update>[1] }) =>
      pivotTableApi.update(pivotTableId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pivot-tables', sheetId] });
      setEditingId(null);
      resetForm();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (pivotTableId: string) => pivotTableApi.delete(pivotTableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pivot-tables', sheetId] });
      if (selectedPivotTable?.id === editingId) {
        setSelectedPivotTable(null);
        setComputedData(null);
      }
    },
  });

  const resetForm = () => {
    setName('');
    setSourceRange('');
    setRowFields([]);
    setColumnFields([]);
    setValueFields([]);
  };

  const handleCreate = () => {
    if (!name || !sourceRange || rowFields.length === 0 || valueFields.length === 0) return;

    createMutation.mutate({
      name,
      sourceRange,
      rowFields,
      columnFields: columnFields.length > 0 ? columnFields : undefined,
      valueFields,
    });
  };

  const handleUpdate = () => {
    if (!editingId || !name || !sourceRange || rowFields.length === 0 || valueFields.length === 0) return;

    updateMutation.mutate({
      pivotTableId: editingId,
      input: {
        name,
        sourceRange,
        rowFields,
        columnFields: columnFields.length > 0 ? columnFields : undefined,
        valueFields,
      },
    });
  };

  const startEditing = (pivotTable: PivotTable) => {
    setEditingId(pivotTable.id);
    setName(pivotTable.name);
    setSourceRange(pivotTable.sourceRange);
    setRowFields(JSON.parse(pivotTable.rowFields));
    setColumnFields(pivotTable.columnFields ? JSON.parse(pivotTable.columnFields) : []);
    setValueFields(JSON.parse(pivotTable.valueFields));
    setIsCreating(true);
  };

  const computePivotTable = async (pivotTable: PivotTable) => {
    setIsComputing(true);
    setSelectedPivotTable(pivotTable);
    try {
      const result = await pivotTableApi.compute(pivotTable.id);
      setComputedData(result);
    } catch (error) {
      console.error('Failed to compute pivot table:', error);
    }
    setIsComputing(false);
  };

  const addRowField = (columnName: string) => {
    if (!rowFields.includes(columnName)) {
      setRowFields([...rowFields, columnName]);
    }
  };

  const removeRowField = (columnName: string) => {
    setRowFields(rowFields.filter(f => f !== columnName));
  };

  const addColumnField = (columnName: string) => {
    if (!columnFields.includes(columnName)) {
      setColumnFields([...columnFields, columnName]);
    }
  };

  const removeColumnField = (columnName: string) => {
    setColumnFields(columnFields.filter(f => f !== columnName));
  };

  const addValueField = (columnName: string) => {
    if (!valueFields.find(f => f.column === columnName)) {
      setValueFields([...valueFields, { column: columnName, aggregation: 'SUM' }]);
    }
  };

  const removeValueField = (columnName: string) => {
    setValueFields(valueFields.filter(f => f.column !== columnName));
  };

  const updateValueFieldAggregation = (columnName: string, aggregation: AggregationType) => {
    setValueFields(valueFields.map(f =>
      f.column === columnName ? { ...f, aggregation } : f
    ));
  };

  const formatNumber = (value: number | null): string => {
    if (value === null) return '-';
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Pivot Tables</h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Create/Edit Form */}
        {isCreating ? (
          <div className="bg-slate-50 rounded-lg p-4 space-y-4">
            <h4 className="font-medium text-sm text-slate-700">
              {editingId ? 'Edit Pivot Table' : 'New Pivot Table'}
            </h4>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Pivot table name"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Source Range (e.g., A1:E100)
              </label>
              <input
                type="text"
                value={sourceRange}
                onChange={(e) => setSourceRange(e.target.value.toUpperCase())}
                placeholder="A1:E100"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            {/* Row Fields */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-2">
                <ArrowUpDown className="w-3.5 h-3.5" />
                Row Fields (Group By)
              </label>
              <div className="flex flex-wrap gap-1 mb-2">
                {rowFields.map(field => (
                  <span
                    key={field}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs"
                  >
                    {field}
                    <button onClick={() => removeRowField(field)} className="hover:text-indigo-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <select
                value=""
                onChange={(e) => e.target.value && addRowField(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Add row field...</option>
                {columns
                  .filter(c => !rowFields.includes(c.name) && !valueFields.find(v => v.column === c.name))
                  .map(col => (
                    <option key={col.id} value={col.name}>{col.name}</option>
                  ))}
              </select>
            </div>

            {/* Column Fields (Optional) */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-2">
                <Columns className="w-3.5 h-3.5" />
                Column Fields (Optional)
              </label>
              <div className="flex flex-wrap gap-1 mb-2">
                {columnFields.map(field => (
                  <span
                    key={field}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs"
                  >
                    {field}
                    <button onClick={() => removeColumnField(field)} className="hover:text-purple-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <select
                value=""
                onChange={(e) => e.target.value && addColumnField(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Add column field...</option>
                {columns
                  .filter(c => !columnFields.includes(c.name) && !rowFields.includes(c.name) && !valueFields.find(v => v.column === c.name))
                  .map(col => (
                    <option key={col.id} value={col.name}>{col.name}</option>
                  ))}
              </select>
            </div>

            {/* Value Fields */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-2">
                <Calculator className="w-3.5 h-3.5" />
                Value Fields (Aggregate)
              </label>
              <div className="space-y-2 mb-2">
                {valueFields.map(field => (
                  <div
                    key={field.column}
                    className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200"
                  >
                    <span className="text-sm font-medium text-green-700 flex-1">{field.column}</span>
                    <select
                      value={field.aggregation}
                      onChange={(e) => updateValueFieldAggregation(field.column, e.target.value as AggregationType)}
                      className="text-xs px-2 py-1 border border-green-300 rounded bg-white"
                    >
                      {AGGREGATION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <button onClick={() => removeValueField(field.column)} className="text-green-600 hover:text-green-800">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <select
                value=""
                onChange={(e) => e.target.value && addValueField(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Add value field...</option>
                {columns
                  .filter(c => !valueFields.find(v => v.column === c.name) && !rowFields.includes(c.name))
                  .map(col => (
                    <option key={col.id} value={col.name}>{col.name}</option>
                  ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={editingId ? handleUpdate : handleCreate}
                disabled={
                  !name ||
                  !sourceRange ||
                  rowFields.length === 0 ||
                  valueFields.length === 0 ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
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
            Create Pivot Table
          </button>
        )}

        {/* Pivot Tables List */}
        {isLoading ? (
          <div className="text-center text-slate-500 py-4">Loading pivot tables...</div>
        ) : pivotTables.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            No pivot tables yet. Create one to analyze your data.
          </div>
        ) : (
          <div className="space-y-2">
            {pivotTables.map((pt) => (
              <div
                key={pt.id}
                className={`border rounded-lg overflow-hidden ${
                  selectedPivotTable?.id === pt.id ? 'border-indigo-500' : 'border-slate-200'
                }`}
              >
                <div
                  className="flex items-center justify-between p-3 bg-slate-50 cursor-pointer"
                  onClick={() => computePivotTable(pt)}
                >
                  <div className="flex items-center gap-2">
                    <Table2 className="w-4 h-4 text-slate-500" />
                    <span className="font-medium text-sm text-slate-700">{pt.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        computePivotTable(pt);
                      }}
                      className="p-1 hover:bg-slate-200 rounded"
                      title="Refresh data"
                    >
                      <RefreshCw className={`w-4 h-4 text-slate-500 ${isComputing && selectedPivotTable?.id === pt.id ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(pt);
                      }}
                      className="p-1 hover:bg-slate-200 rounded"
                    >
                      <Edit2 className="w-4 h-4 text-slate-500" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this pivot table?')) {
                          deleteMutation.mutate(pt.id);
                        }
                      }}
                      className="p-1 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Computed Data Display */}
                {selectedPivotTable?.id === pt.id && computedData && (
                  <div className="p-3 bg-white border-t border-slate-200 overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="bg-slate-100">
                          {computedData.rowFields.map(field => (
                            <th key={field} className="px-2 py-1 text-left font-medium text-slate-600 border border-slate-200">
                              {field}
                            </th>
                          ))}
                          {computedData.data.columnValues.length > 0 ? (
                            computedData.data.columnValues.map(colVal => (
                              computedData.valueFields.map(vf => (
                                <th key={`${colVal}-${vf.column}`} className="px-2 py-1 text-right font-medium text-slate-600 border border-slate-200">
                                  {colVal.replace('|||', ' - ')}
                                  <br />
                                  <span className="text-slate-400">{vf.aggregation}({vf.column})</span>
                                </th>
                              ))
                            ))
                          ) : (
                            computedData.valueFields.map(vf => (
                              <th key={`${vf.column}_${vf.aggregation}`} className="px-2 py-1 text-right font-medium text-slate-600 border border-slate-200">
                                {vf.aggregation}({vf.column})
                              </th>
                            ))
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {computedData.data.rows.map((row, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            {computedData.rowFields.map(field => (
                              <td key={field} className="px-2 py-1 text-slate-700 border border-slate-200">
                                {row.rowValues[field] || '-'}
                              </td>
                            ))}
                            {computedData.data.columnValues.length > 0 ? (
                              computedData.data.columnValues.map(colVal => (
                                computedData.valueFields.map(vf => (
                                  <td key={`${colVal}-${vf.column}`} className="px-2 py-1 text-right text-slate-700 border border-slate-200">
                                    {formatNumber(row.columnAggregations?.[colVal]?.[`${vf.column}_${vf.aggregation}`] ?? null)}
                                  </td>
                                ))
                              ))
                            ) : (
                              computedData.valueFields.map(vf => (
                                <td key={`${vf.column}_${vf.aggregation}`} className="px-2 py-1 text-right text-slate-700 border border-slate-200">
                                  {formatNumber(row.aggregations[`${vf.column}_${vf.aggregation}`])}
                                </td>
                              ))
                            )}
                          </tr>
                        ))}
                        {/* Grand Totals Row */}
                        <tr className="bg-slate-200 font-semibold">
                          <td colSpan={computedData.rowFields.length} className="px-2 py-1 text-slate-700 border border-slate-200">
                            Grand Total
                          </td>
                          {computedData.data.columnValues.length > 0 ? (
                            computedData.data.columnValues.map(colVal => (
                              computedData.valueFields.map(vf => (
                                <td key={`total-${colVal}-${vf.column}`} className="px-2 py-1 text-right text-slate-700 border border-slate-200">
                                  -
                                </td>
                              ))
                            ))
                          ) : (
                            computedData.valueFields.map(vf => (
                              <td key={`total-${vf.column}_${vf.aggregation}`} className="px-2 py-1 text-right text-slate-700 border border-slate-200">
                                {formatNumber(computedData.data.grandTotals[`${vf.column}_${vf.aggregation}`])}
                              </td>
                            ))
                          )}
                        </tr>
                      </tbody>
                    </table>
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

export default PivotTablePanel;
