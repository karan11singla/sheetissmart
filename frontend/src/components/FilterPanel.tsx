import { useCallback } from 'react';
import { X, Filter, Plus, Trash2 } from 'lucide-react';
import type { Column } from '../types';

export type FilterOperator =
  | 'contains'
  | 'not_contains'
  | 'equals'
  | 'not_equals'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty'
  | 'greater_than'
  | 'less_than'
  | 'between';

export interface FilterRule {
  id: string;
  columnId: string;
  operator: FilterOperator;
  value: string;
  value2?: string; // For "between" operator
}

export type FilterLogic = 'and' | 'or';

export interface FilterConfig {
  rules: FilterRule[];
  logic: FilterLogic;
}

const TEXT_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does not equal' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with', label: 'Ends with' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'is_not_empty', label: 'Is not empty' },
];

const NUMBER_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does not equal' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
  { value: 'between', label: 'Between' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'is_not_empty', label: 'Is not empty' },
];

const DATE_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does not equal' },
  { value: 'greater_than', label: 'After' },
  { value: 'less_than', label: 'Before' },
  { value: 'between', label: 'Between' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'is_not_empty', label: 'Is not empty' },
];

function getOperatorsForType(type: string) {
  switch (type) {
    case 'NUMBER':
      return NUMBER_OPERATORS;
    case 'DATE':
      return DATE_OPERATORS;
    default:
      return TEXT_OPERATORS;
  }
}

const NO_VALUE_OPERATORS: FilterOperator[] = ['is_empty', 'is_not_empty'];

interface FilterPanelProps {
  columns: Column[];
  filterConfig: FilterConfig;
  onFilterConfigChange: (config: FilterConfig) => void;
  onClearAll: () => void;
  onClose: () => void;
}

let ruleCounter = 0;
function newRuleId() {
  return `rule-${++ruleCounter}-${Date.now()}`;
}

export default function FilterPanel({
  columns,
  filterConfig,
  onFilterConfigChange,
  onClearAll,
  onClose,
}: FilterPanelProps) {
  const { rules, logic } = filterConfig;

  const updateRules = useCallback((newRules: FilterRule[]) => {
    onFilterConfigChange({ rules: newRules, logic });
  }, [logic, onFilterConfigChange]);

  const addRule = () => {
    const firstCol = columns[0];
    if (!firstCol) return;
    const newRule: FilterRule = {
      id: newRuleId(),
      columnId: firstCol.id,
      operator: 'contains',
      value: '',
    };
    updateRules([...rules, newRule]);
  };

  const removeRule = (ruleId: string) => {
    updateRules(rules.filter(r => r.id !== ruleId));
  };

  const updateRule = (ruleId: string, updates: Partial<FilterRule>) => {
    updateRules(rules.map(r => r.id === ruleId ? { ...r, ...updates } : r));
  };

  const toggleLogic = () => {
    onFilterConfigChange({ rules, logic: logic === 'and' ? 'or' : 'and' });
  };

  return (
    <div className="bg-white border-b border-neutral-200 shadow-sm">
      <div className="px-4 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-neutral-500" />
            <span className="text-sm font-medium text-neutral-700">Filters</span>
            {rules.length > 1 && (
              <button
                onClick={toggleLogic}
                className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full transition-colors border"
                style={{
                  backgroundColor: logic === 'and' ? '#f0fdf4' : '#faf5ff',
                  color: logic === 'and' ? '#15803d' : '#7e22ce',
                  borderColor: logic === 'and' ? '#bbf7d0' : '#e9d5ff',
                }}
              >
                {logic === 'and' ? 'AND' : 'OR'}
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {rules.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs text-neutral-500 hover:text-neutral-700 px-2 py-1 rounded hover:bg-neutral-100"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600 p-1 rounded hover:bg-neutral-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter Rules */}
        <div className="space-y-2">
          {rules.length === 0 && (
            <p className="text-xs text-neutral-400 py-2">No filters applied. Click "Add filter" to get started.</p>
          )}

          {rules.map((rule, index) => {
            const column = columns.find(c => c.id === rule.columnId);
            const operators = getOperatorsForType(column?.type || 'TEXT');
            const needsValue = !NO_VALUE_OPERATORS.includes(rule.operator);
            const isBetween = rule.operator === 'between';

            return (
              <div key={rule.id} className="flex items-center gap-2">
                {/* Logic label for 2nd+ rules */}
                <div className="w-10 flex-shrink-0 text-right">
                  {index === 0 ? (
                    <span className="text-xs text-neutral-400">Where</span>
                  ) : (
                    <span className="text-xs font-medium" style={{ color: logic === 'and' ? '#15803d' : '#7e22ce' }}>
                      {logic === 'and' ? 'AND' : 'OR'}
                    </span>
                  )}
                </div>

                {/* Column selector */}
                <select
                  value={rule.columnId}
                  onChange={(e) => updateRule(rule.id, { columnId: e.target.value })}
                  className="text-sm border border-neutral-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[120px]"
                >
                  {columns.map(col => (
                    <option key={col.id} value={col.id}>{col.name}</option>
                  ))}
                </select>

                {/* Operator selector */}
                <select
                  value={rule.operator}
                  onChange={(e) => updateRule(rule.id, { operator: e.target.value as FilterOperator })}
                  className="text-sm border border-neutral-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[140px]"
                >
                  {operators.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>

                {/* Value input(s) */}
                {needsValue && (
                  <>
                    <input
                      type={column?.type === 'NUMBER' ? 'number' : column?.type === 'DATE' ? 'date' : 'text'}
                      value={rule.value}
                      onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                      placeholder="Value..."
                      className="flex-1 min-w-[100px] text-sm border border-neutral-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500 placeholder:text-neutral-400"
                    />
                    {isBetween && (
                      <>
                        <span className="text-xs text-neutral-400">and</span>
                        <input
                          type={column?.type === 'NUMBER' ? 'number' : column?.type === 'DATE' ? 'date' : 'text'}
                          value={rule.value2 || ''}
                          onChange={(e) => updateRule(rule.id, { value2: e.target.value })}
                          placeholder="Value..."
                          className="flex-1 min-w-[100px] text-sm border border-neutral-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500 placeholder:text-neutral-400"
                        />
                      </>
                    )}
                  </>
                )}

                {/* Remove button */}
                <button
                  onClick={() => removeRule(rule.id)}
                  className="p-1 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Add filter button */}
        <button
          onClick={addRule}
          className="mt-2 inline-flex items-center text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-2 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add filter
        </button>
      </div>
    </div>
  );
}
