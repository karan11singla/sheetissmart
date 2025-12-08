import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { conditionalFormatApi } from '../services/api';
import type { ConditionalFormat, FormatRuleType, CreateConditionalFormatInput } from '../types';

interface ConditionalFormatPanelProps {
  sheetId: string;
  isViewOnly?: boolean;
}

const RULE_TYPES: { value: FormatRuleType; label: string; description: string }[] = [
  { value: 'CELL_VALUE', label: 'Cell value', description: 'Format cells based on their value' },
  { value: 'TEXT_CONTAINS', label: 'Text contains', description: 'Format cells containing specific text' },
  { value: 'DUPLICATE_VALUES', label: 'Duplicate values', description: 'Highlight duplicate values' },
  { value: 'UNIQUE_VALUES', label: 'Unique values', description: 'Highlight unique values' },
  { value: 'TOP_BOTTOM', label: 'Top/Bottom values', description: 'Highlight top or bottom N values' },
  { value: 'ABOVE_BELOW_AVERAGE', label: 'Above/Below average', description: 'Highlight values above or below average' },
  { value: 'DATE_IS', label: 'Date is', description: 'Format cells based on date' },
  { value: 'FORMULA_CUSTOM', label: 'Custom formula', description: 'Use a custom formula' },
];

const CELL_VALUE_OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than', label: 'less than' },
  { value: 'greater_than_or_equal', label: 'greater than or equal to' },
  { value: 'less_than_or_equal', label: 'less than or equal to' },
  { value: 'between', label: 'between' },
  { value: 'not_between', label: 'not between' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

const DATE_OPERATORS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'last_7_days', label: 'In the last 7 days' },
  { value: 'last_30_days', label: 'In the last 30 days' },
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'before', label: 'Before date' },
  { value: 'after', label: 'After date' },
];

interface FormState {
  name: string;
  range: string;
  ruleType: FormatRuleType;
  operator: string;
  value1: string;
  value2: string;
  backgroundColor: string;
  textColor: string;
  bold: boolean;
  italic: boolean;
}

const defaultFormState: FormState = {
  name: '',
  range: '',
  ruleType: 'CELL_VALUE',
  operator: 'equals',
  value1: '',
  value2: '',
  backgroundColor: '#ffeb3b',
  textColor: '#000000',
  bold: false,
  italic: false,
};

export default function ConditionalFormatPanel({ sheetId, isViewOnly = false }: ConditionalFormatPanelProps) {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFormat, setEditingFormat] = useState<ConditionalFormat | null>(null);
  const [form, setForm] = useState<FormState>(defaultFormState);

  // Fetch conditional formats
  const { data: formats = [], isLoading } = useQuery({
    queryKey: ['conditionalFormats', sheetId],
    queryFn: () => conditionalFormatApi.getAll(sheetId),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (input: CreateConditionalFormatInput) => conditionalFormatApi.create(sheetId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conditionalFormats', sheetId] });
      resetForm();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateConditionalFormatInput> }) =>
      conditionalFormatApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conditionalFormats', sheetId] });
      resetForm();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => conditionalFormatApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conditionalFormats', sheetId] });
    },
  });

  const resetForm = () => {
    setForm(defaultFormState);
    setIsFormOpen(false);
    setEditingFormat(null);
  };

  const handleEdit = (format: ConditionalFormat) => {
    // Parse condition JSON
    let condition: Record<string, string> = {};
    try {
      condition = JSON.parse(format.condition);
    } catch {
      condition = {};
    }

    setForm({
      name: format.name,
      range: format.range,
      ruleType: format.ruleType,
      operator: condition.operator || 'equals',
      value1: condition.value1 || condition.value || condition.text || '',
      value2: condition.value2 || '',
      backgroundColor: format.backgroundColor || '#ffeb3b',
      textColor: format.textColor || '#000000',
      bold: format.bold,
      italic: format.italic,
    });
    setEditingFormat(format);
    setIsFormOpen(true);
  };

  const buildCondition = (): string => {
    const condition: Record<string, string> = {};

    switch (form.ruleType) {
      case 'CELL_VALUE':
        condition.operator = form.operator;
        condition.value1 = form.value1;
        if (form.operator === 'between' || form.operator === 'not_between') {
          condition.value2 = form.value2;
        }
        break;
      case 'TEXT_CONTAINS':
        condition.text = form.value1;
        break;
      case 'DATE_IS':
        condition.operator = form.operator;
        if (form.operator === 'before' || form.operator === 'after') {
          condition.date = form.value1;
        }
        break;
      case 'TOP_BOTTOM':
        condition.type = form.operator; // 'top' or 'bottom'
        condition.count = form.value1;
        break;
      case 'ABOVE_BELOW_AVERAGE':
        condition.type = form.operator; // 'above' or 'below'
        break;
      case 'FORMULA_CUSTOM':
        condition.formula = form.value1;
        break;
      // DUPLICATE_VALUES and UNIQUE_VALUES don't need additional conditions
    }

    return JSON.stringify(condition);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const input: CreateConditionalFormatInput = {
      name: form.name || `Format rule ${formats.length + 1}`,
      range: form.range,
      ruleType: form.ruleType,
      condition: buildCondition(),
      backgroundColor: form.backgroundColor,
      textColor: form.textColor,
      bold: form.bold,
      italic: form.italic,
      priority: editingFormat?.priority ?? formats.length,
    };

    if (editingFormat) {
      updateMutation.mutate({ id: editingFormat.id, input });
    } else {
      createMutation.mutate(input);
    }
  };

  const renderConditionInputs = () => {
    switch (form.ruleType) {
      case 'CELL_VALUE':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Condition</label>
              <select
                value={form.operator}
                onChange={(e) => setForm({ ...form, operator: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CELL_VALUE_OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </div>
            {form.operator !== 'is_empty' && form.operator !== 'is_not_empty' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Value</label>
                <input
                  type="text"
                  value={form.value1}
                  onChange={(e) => setForm({ ...form, value1: e.target.value })}
                  placeholder="Enter value..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
            {(form.operator === 'between' || form.operator === 'not_between') && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">And</label>
                <input
                  type="text"
                  value={form.value2}
                  onChange={(e) => setForm({ ...form, value2: e.target.value })}
                  placeholder="Enter second value..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>
        );

      case 'TEXT_CONTAINS':
        return (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Text to find</label>
            <input
              type="text"
              value={form.value1}
              onChange={(e) => setForm({ ...form, value1: e.target.value })}
              placeholder="Enter text..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        );

      case 'DATE_IS':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date condition</label>
              <select
                value={form.operator}
                onChange={(e) => setForm({ ...form, operator: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {DATE_OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </div>
            {(form.operator === 'before' || form.operator === 'after') && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                <input
                  type="date"
                  value={form.value1}
                  onChange={(e) => setForm({ ...form, value1: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>
        );

      case 'TOP_BOTTOM':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select
                value={form.operator}
                onChange={(e) => setForm({ ...form, operator: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Number of values</label>
              <input
                type="number"
                min="1"
                value={form.value1}
                onChange={(e) => setForm({ ...form, value1: e.target.value })}
                placeholder="10"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        );

      case 'ABOVE_BELOW_AVERAGE':
        return (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
            <select
              value={form.operator}
              onChange={(e) => setForm({ ...form, operator: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="above">Above average</option>
              <option value="below">Below average</option>
            </select>
          </div>
        );

      case 'FORMULA_CUSTOM':
        return (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Formula</label>
            <input
              type="text"
              value={form.value1}
              onChange={(e) => setForm({ ...form, value1: e.target.value })}
              placeholder="=A1>100"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Use a formula that returns TRUE or FALSE
            </p>
          </div>
        );

      case 'DUPLICATE_VALUES':
      case 'UNIQUE_VALUES':
        return (
          <p className="text-sm text-slate-600">
            This rule will automatically highlight {form.ruleType === 'DUPLICATE_VALUES' ? 'duplicate' : 'unique'} values in the selected range.
          </p>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-600">
          {formats.length} rule{formats.length !== 1 ? 's' : ''} applied
        </p>
        {!isViewOnly && !isFormOpen && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add rule
          </button>
        )}
      </div>

      {/* Form */}
      {isFormOpen && !isViewOnly && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">
              {editingFormat ? 'Edit rule' : 'New rule'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="p-1 hover:bg-slate-200 rounded transition-colors"
            >
              <X className="h-4 w-4 text-slate-500" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name (optional)</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Rule name..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Range */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Apply to range</label>
              <input
                type="text"
                value={form.range}
                onChange={(e) => setForm({ ...form, range: e.target.value })}
                placeholder="A1:D10"
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Rule Type */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Format cells if...</label>
              <select
                value={form.ruleType}
                onChange={(e) => setForm({ ...form, ruleType: e.target.value as FormatRuleType, operator: 'equals', value1: '', value2: '' })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {RULE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                {RULE_TYPES.find((t) => t.value === form.ruleType)?.description}
              </p>
            </div>

            {/* Condition inputs */}
            {renderConditionInputs()}

            {/* Formatting options */}
            <div className="pt-3 border-t border-slate-200">
              <label className="block text-xs font-medium text-slate-600 mb-2">Formatting style</label>

              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-600">Fill:</label>
                  <input
                    type="color"
                    value={form.backgroundColor}
                    onChange={(e) => setForm({ ...form, backgroundColor: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border border-slate-200"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-600">Text:</label>
                  <input
                    type="color"
                    value={form.textColor}
                    onChange={(e) => setForm({ ...form, textColor: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border border-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.bold}
                    onChange={(e) => setForm({ ...form, bold: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-bold">Bold</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.italic}
                    onChange={(e) => setForm({ ...form, italic: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="italic">Italic</span>
                </label>
              </div>

              {/* Preview */}
              <div className="mt-3 p-3 rounded border border-slate-200 bg-white">
                <p className="text-xs text-slate-500 mb-1">Preview:</p>
                <div
                  className="px-3 py-2 rounded text-sm"
                  style={{
                    backgroundColor: form.backgroundColor,
                    color: form.textColor,
                    fontWeight: form.bold ? 'bold' : 'normal',
                    fontStyle: form.italic ? 'italic' : 'normal',
                  }}
                >
                  Sample Text
                </div>
              </div>
            </div>
          </div>

          {/* Form actions */}
          <div className="flex items-center justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {editingFormat ? 'Update' : 'Add'} rule
            </button>
          </div>
        </form>
      )}

      {/* Rules list */}
      {formats.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-500 text-sm">No conditional formatting rules</p>
          {!isViewOnly && (
            <p className="text-slate-400 text-xs mt-1">
              Click "Add rule" to create one
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {formats.map((format) => (
            <div
              key={format.id}
              className="p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded border border-slate-300"
                      style={{ backgroundColor: format.backgroundColor || '#ffeb3b' }}
                    />
                    <h4 className="text-sm font-medium text-slate-900 truncate">
                      {format.name}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Range: {format.range} • {RULE_TYPES.find((t) => t.value === format.ruleType)?.label}
                  </p>
                </div>
                {!isViewOnly && (
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => handleEdit(format)}
                      className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                      title="Edit rule"
                    >
                      <Pencil className="h-4 w-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this formatting rule?')) {
                          deleteMutation.mutate(format.id);
                        }
                      }}
                      className="p-1.5 hover:bg-red-50 rounded transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
