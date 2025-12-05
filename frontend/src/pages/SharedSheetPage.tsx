import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sheetApi } from '../services/api';
import { Loader2, AlertCircle } from 'lucide-react';

export default function SharedSheetPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState<any>(null);

  useEffect(() => {
    const loadSheet = async () => {
      if (!token) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      try {
        const data = await sheetApi.getSheetByToken(token);
        setSheet(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sheet');
      } finally {
        setLoading(false);
      }
    };

    loadSheet();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading sheet...</p>
        </div>
      </div>
    );
  }

  if (error || !sheet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
          <div className="flex items-center space-x-3 text-red-600 mb-4">
            <AlertCircle className="h-8 w-8" />
            <h2 className="text-xl font-semibold">Unable to load sheet</h2>
          </div>
          <p className="text-gray-600 mb-6">{error || 'This link may have expired or is invalid.'}</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Build the grid data
  const columns = sheet.columns || [];
  const rows = sheet.rows || [];
  const cells = sheet.cells || [];

  const getCellValue = (rowId: string, columnId: string) => {
    const cell = cells.find((c: any) => c.rowId === rowId && c.columnId === columnId);
    return cell?.value || '';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{sheet.name}</h1>
              {sheet.description && (
                <p className="text-gray-600 mt-1">{sheet.description}</p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                Shared by {sheet.owner?.name || sheet.owner?.email}
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Sign in to create your own
            </button>
          </div>
        </div>

        {/* Sheet Content */}
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  #
                </th>
                {columns.map((col: any) => (
                  <th
                    key={col.id}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: col.width || 150 }}
                  >
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((row: any, index: number) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {index + 1}
                  </td>
                  {columns.map((col: any) => (
                    <td key={col.id} className="px-4 py-3 text-sm text-gray-900">
                      {getCellValue(row.id, col.id)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              This sheet has no data yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
