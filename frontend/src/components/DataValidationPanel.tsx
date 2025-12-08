import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  ListChecks,
  Hash,
  Type,
  Calendar,
  Code,
  AlertCircle,
} from 'lucide-react';
import { dataValidationApi } from '../services/api';
import type {
  DataValidation,
  ValidationType,
  ListValidationCriteria,
  NumberValidationCriteria,
  TextLengthValidationCriteria,
  DateValidationCriteria,
} from '../types';

interface DataValidationPanelProps {
  sheetId: string;
  onClose: () => void;
}

const VALIDATION_TYPES: { type: ValidationType; label: string; icon: React.ReactNode }[] = [
  { type: 'LIST', label: 'Dropdown List', icon: <ListChecks className="w-4 h-4" /> },
  { type: 'NUMBER', label: 'Number', icon: <Hash className="w-4 h-4" /> },
  { type: 'TEXT_LENGTH', label: 'Text Length', icon: <Type className="w-4 h-4" /> },
  { type: 'DATE', label: 'Date', icon: <Calendar className="w-4 h-4" /> },
  { type: 'CUSTOM_FORMULA', label: 'Custom Formula', icon: <Code className="w-4 h-4" /> },
];

export function DataValidationPanel({ sheetId, onClose }: DataValidationPanelProps) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [range, setRange] = useState('');
  const [validationType, setValidationType] = useState<ValidationType>('LIST');
  const [allowBlank, setAllowBlank] = useState(true);
  const [showDropdown, setShowDropdown] = useState(true);
  const [errorTitle, setErrorTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [inputMessage, setInputMessage] = useState('');

  // Criteria state based on type
  const [listValues, setListValues] = useState('');
  const [minNumber, setMinNumber] = useState('');
  const [maxNumber, setMaxNumber] = useState('');
  const [integerOnly, setIntegerOnly] = useState(false);
  const [minLength, setMinLength] = useState('');
  const [maxLength, setMaxLength] = useState('');
  const [minDate, setMinDate] = useState('');
  const [maxDate, setMaxDate] = useState('');
  const [customFormula, setCustomFormula] = useState('');

  // Fetch validations
  const { data: validations = [], isLoading } = useQuery({
    queryKey: ['validations', sheetId],
    queryFn: () => dataValidationApi.getAll(sheetId),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof dataValidationApi.create>[1]) =>
      dataValidationApi.create(sheetId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validations', sheetId] });
      resetForm();
      setIsCreating(false);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ validationId, input }: { validationId: string; input: Parameters<typeof dataValidationApi.update>[1] }) =>
      dataValidationApi.update(validationId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validations', sheetId] });
      setEditingId(null);
      resetForm();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (validationId: string) => dataValidationApi.delete(validationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validations', sheetId] });
    },
  });

  const resetForm = () => {
    setRange('');
    setValidationType('LIST');
    setAllowBlank(true);
    setShowDropdown(true);
    setErrorTitle('');
    setErrorMessage('');
    setInputTitle('');
    setInputMessage('');
    setListValues('');
    setMinNumber('');
    setMaxNumber('');
    setIntegerOnly(false);
    setMinLength('');
    setMaxLength('');
    setMinDate('');
    setMaxDate('');
    setCustomFormula('');
  };

  const buildCriteria = (): ListValidationCriteria | NumberValidationCriteria | TextLengthValidationCriteria | DateValidationCriteria => {
    switch (validationType) {
      case 'LIST':
        return { values: listValues.split(',').map(v => v.trim()).filter(v => v) };
      case 'NUMBER':
        return {
          min: minNumber ? parseFloat(minNumber) : undefined,
          max: maxNumber ? parseFloat(maxNumber) : undefined,
          integer: integerOnly || undefined,
        };
      case 'TEXT_LENGTH':
        return {
          min: minLength ? parseInt(minLength) : undefined,
          max: maxLength ? parseInt(maxLength) : undefined,
        };
      case 'DATE':
        return {
          minDate: minDate || undefined,
          maxDate: maxDate || undefined,
        };
      case 'CUSTOM_FORMULA':
        return { formula: customFormula } as unknown as NumberValidationCriteria;
      default:
        return { values: [] };
    }
  };

  const handleCreate = () => {
    if (!range) return;

    createMutation.mutate({
      range,
      type: validationType,
      criteria: buildCriteria(),
      allowBlank,
      showDropdown: validationType === 'LIST' ? showDropdown : undefined,
      errorTitle: errorTitle || undefined,
      errorMessage: errorMessage || undefined,
      inputTitle: inputTitle || undefined,
      inputMessage: inputMessage || undefined,
    });
  };

  const handleUpdate = () => {
    if (!editingId || !range) return;

    updateMutation.mutate({
      validationId: editingId,
      input: {
        range,
        type: validationType,
        criteria: buildCriteria(),
        allowBlank,
        showDropdown: validationType === 'LIST' ? showDropdown : undefined,
        errorTitle: errorTitle || undefined,
        errorMessage: errorMessage || undefined,
        inputTitle: inputTitle || undefined,
        inputMessage: inputMessage || undefined,
      },
    });
  };

  const startEditing = (validation: DataValidation) => {
    setEditingId(validation.id);
    setRange(validation.range);
    setValidationType(validation.type);
    setAllowBlank(validation.allowBlank);
    setShowDropdown(validation.showDropdown);
    setErrorTitle(validation.errorTitle || '');
    setErrorMessage(validation.errorMessage || '');
    setInputTitle(validation.inputTitle || '');
    setInputMessage(validation.inputMessage || '');

    const criteria = typeof validation.criteria === 'string'
      ? JSON.parse(validation.criteria)
      : validation.criteria;

    switch (validation.type) {
      case 'LIST':
        setListValues((criteria.values || []).join(', '));
        break;
      case 'NUMBER':
        setMinNumber(criteria.min?.toString() || '');
        setMaxNumber(criteria.max?.toString() || '');
        setIntegerOnly(criteria.integer || false);
        break;
      case 'TEXT_LENGTH':
        setMinLength(criteria.min?.toString() || '');
        setMaxLength(criteria.max?.toString() || '');
        break;
      case 'DATE':
        setMinDate(criteria.minDate || '');
        setMaxDate(criteria.maxDate || '');
        break;
      case 'CUSTOM_FORMULA':
        setCustomFormula(criteria.formula || '');
        break;
    }

    setIsCreating(true);
  };

  const getValidationSummary = (validation: DataValidation) => {
    const criteria = typeof validation.criteria === 'string'
      ? JSON.parse(validation.criteria)
      : validation.criteria;

    switch (validation.type) {
      case 'LIST':
        const values = criteria.values || [];
        return `${values.length} option${values.length !== 1 ? 's' : ''}`;
      case 'NUMBER':
        if (criteria.min !== undefined && criteria.max !== undefined) {
          return `${criteria.min} - ${criteria.max}`;
        } else if (criteria.min !== undefined) {
          return `≥ ${criteria.min}`;
        } else if (criteria.max !== undefined) {
          return `≤ ${criteria.max}`;
        }
        return criteria.integer ? 'Integer' : 'Any number';
      case 'TEXT_LENGTH':
        if (criteria.min !== undefined && criteria.max !== undefined) {
          return `${criteria.min} - ${criteria.max} chars`;
        } else if (criteria.min !== undefined) {
          return `≥ ${criteria.min} chars`;
        } else if (criteria.max !== undefined) {
          return `≤ ${criteria.max} chars`;
        }
        return 'Any length';
      case 'DATE':
        if (criteria.minDate && criteria.maxDate) {
          return `${criteria.minDate} to ${criteria.maxDate}`;
        } else if (criteria.minDate) {
          return `After ${criteria.minDate}`;
        } else if (criteria.maxDate) {
          return `Before ${criteria.maxDate}`;
        }
        return 'Any date';
      case 'CUSTOM_FORMULA':
        return 'Custom formula';
      default:
        return '';
    }
  };

  const renderCriteriaInputs = () => {
    switch (validationType) {
      case 'LIST':
        return (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                List Values (comma-separated)
              </label>
              <textarea
                value={listValues}
                onChange={(e) => setListValues(e.target.value)}
                placeholder="Option 1, Option 2, Option 3"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
                rows={3}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showDropdown}
                onChange={(e) => setShowDropdown(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Show dropdown in cell
            </label>
          </>
        );

      case 'NUMBER':
        return (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Min</label>
                <input
                  type="number"
                  value={minNumber}
                  onChange={(e) => setMinNumber(e.target.value)}
                  placeholder="Min value"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Max</label>
                <input
                  type="number"
                  value={maxNumber}
                  onChange={(e) => setMaxNumber(e.target.value)}
                  placeholder="Max value"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={integerOnly}
                onChange={(e) => setIntegerOnly(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Integer only
            </label>
          </>
        );

      case 'TEXT_LENGTH':
        return (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Min Length</label>
              <input
                type="number"
                value={minLength}
                onChange={(e) => setMinLength(e.target.value)}
                placeholder="Min"
                min="0"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Max Length</label>
              <input
                type="number"
                value={maxLength}
                onChange={(e) => setMaxLength(e.target.value)}
                placeholder="Max"
                min="0"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>
        );

      case 'DATE':
        return (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">After Date</label>
              <input
                type="date"
                value={minDate}
                onChange={(e) => setMinDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Before Date</label>
              <input
                type="date"
                value={maxDate}
                onChange={(e) => setMaxDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>
        );

      case 'CUSTOM_FORMULA':
        return (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Formula</label>
            <input
              type="text"
              value={customFormula}
              onChange={(e) => setCustomFormula(e.target.value)}
              placeholder="=AND(A1>0, A1<100)"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-mono"
            />
            <p className="text-xs text-slate-500 mt-1">
              Formula should return TRUE for valid values
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Data Validation</h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Create/Edit Form */}
        {isCreating ? (
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm text-slate-700">
              {editingId ? 'Edit Validation' : 'New Validation'}
            </h4>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Cell Range (e.g., A1:A10)
              </label>
              <input
                type="text"
                value={range}
                onChange={(e) => setRange(e.target.value.toUpperCase())}
                placeholder="A1:A10"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Validation Type</label>
              <div className="grid grid-cols-2 gap-2">
                {VALIDATION_TYPES.map(({ type, label, icon }) => (
                  <button
                    key={type}
                    onClick={() => setValidationType(type)}
                    className={`flex items-center gap-2 p-2 rounded-md border text-xs ${
                      validationType === type
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

            {renderCriteriaInputs()}

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={allowBlank}
                onChange={(e) => setAllowBlank(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Allow blank values
            </label>

            <details className="text-sm">
              <summary className="cursor-pointer text-slate-600 hover:text-slate-800">
                Error & Input Messages (optional)
              </summary>
              <div className="mt-2 space-y-2 pl-2 border-l-2 border-slate-200">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Error Title</label>
                  <input
                    type="text"
                    value={errorTitle}
                    onChange={(e) => setErrorTitle(e.target.value)}
                    placeholder="Invalid Input"
                    className="w-full px-2 py-1 text-sm border border-slate-300 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Error Message</label>
                  <input
                    type="text"
                    value={errorMessage}
                    onChange={(e) => setErrorMessage(e.target.value)}
                    placeholder="Please enter a valid value"
                    className="w-full px-2 py-1 text-sm border border-slate-300 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Input Title</label>
                  <input
                    type="text"
                    value={inputTitle}
                    onChange={(e) => setInputTitle(e.target.value)}
                    placeholder="Enter value"
                    className="w-full px-2 py-1 text-sm border border-slate-300 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Input Message</label>
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="This cell expects..."
                    className="w-full px-2 py-1 text-sm border border-slate-300 rounded bg-white"
                  />
                </div>
              </div>
            </details>

            <div className="flex gap-2 pt-2">
              <button
                onClick={editingId ? handleUpdate : handleCreate}
                disabled={!range || createMutation.isPending || updateMutation.isPending}
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
            Add Validation Rule
          </button>
        )}

        {/* Validations List */}
        {isLoading ? (
          <div className="text-center text-slate-500 py-4">Loading validations...</div>
        ) : validations.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            No validation rules yet. Create one to enforce data constraints.
          </div>
        ) : (
          <div className="space-y-2">
            {validations.map((validation) => (
              <div
                key={validation.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-md border border-slate-200">
                    {VALIDATION_TYPES.find(t => t.type === validation.type)?.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-slate-700">
                        {validation.range}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-slate-200 rounded text-slate-600">
                        {VALIDATION_TYPES.find(t => t.type === validation.type)?.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {getValidationSummary(validation)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEditing(validation)}
                    className="p-1.5 hover:bg-slate-200 rounded"
                  >
                    <Edit2 className="w-4 h-4 text-slate-500" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this validation rule?')) {
                        deleteMutation.mutate(validation.id);
                      }
                    }}
                    className="p-1.5 hover:bg-red-100 rounded"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Help Text */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700">
              <p className="font-medium">How Data Validation Works</p>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                <li>List: Creates a dropdown with predefined options</li>
                <li>Number: Restricts input to numbers within a range</li>
                <li>Text Length: Limits the number of characters</li>
                <li>Date: Restricts to dates within a range</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataValidationPanel;
