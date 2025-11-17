import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import SheetPage from '../pages/SheetPage';

// Mock the API
vi.mock('../services/api', () => ({
  sheetApi: {
    getById: vi.fn(() =>
      Promise.resolve({
        id: 'test-sheet',
        name: 'Test Sheet',
        columns: [
          { id: 'col1', name: 'A', type: 'TEXT', position: 0, width: 150 },
          { id: 'col2', name: 'B', type: 'TEXT', position: 1, width: 150 },
          { id: 'col3', name: 'C', type: 'TEXT', position: 2, width: 150 },
        ],
        rows: [
          {
            id: 'row1',
            position: 0,
            cells: [
              { id: 'cell1', columnId: 'col1', value: JSON.stringify('10'), rowId: 'row1', sheetId: 'test-sheet' },
              { id: 'cell2', columnId: 'col2', value: JSON.stringify('20'), rowId: 'row1', sheetId: 'test-sheet' },
              { id: 'cell3', columnId: 'col3', value: null, rowId: 'row1', sheetId: 'test-sheet' },
            ],
          },
          {
            id: 'row2',
            position: 1,
            cells: [
              { id: 'cell4', columnId: 'col1', value: JSON.stringify('30'), rowId: 'row2', sheetId: 'test-sheet' },
              { id: 'cell5', columnId: 'col2', value: JSON.stringify('40'), rowId: 'row2', sheetId: 'test-sheet' },
              { id: 'cell6', columnId: 'col3', value: null, rowId: 'row2', sheetId: 'test-sheet' },
            ],
          },
        ],
        isOwner: true,
      })
    ),
    updateCell: vi.fn(() => Promise.resolve({ id: 'cell1', value: 'test' })),
    getSheetShares: vi.fn(() => Promise.resolve([])),
    createColumn: vi.fn(),
    createRow: vi.fn(),
    deleteColumn: vi.fn(),
    deleteRow: vi.fn(),
  },
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock router params
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'test-sheet' }),
    useNavigate: () => vi.fn(),
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Formula Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should enter formula mode when typing "="', async () => {
    const user = userEvent.setup();
    render(<SheetPage />, { wrapper: createWrapper() });

    // Wait for the sheet to load
    await waitFor(() => expect(screen.queryByText('Loading sheet...')).not.toBeInTheDocument());

    // Click on a cell to edit it
    const cells = screen.getAllByRole('cell');
    await user.click(cells[3]); // Click on the first data cell (after header row)

    // Wait for input to appear
    const input = await screen.findByRole('textbox');

    // Type "=" to enter formula mode
    await user.type(input, '=');

    // Check if formula mode indicator appears
    expect(screen.getByText(/Formula Mode:/i)).toBeInTheDocument();
    expect(screen.getByText(/Click cells to add references/i)).toBeInTheDocument();
  });

  it('should show autocomplete when typing formula function', async () => {
    const user = userEvent.setup();
    render(<SheetPage />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.queryByText('Loading sheet...')).not.toBeInTheDocument());

    const cells = screen.getAllByRole('cell');
    await user.click(cells[3]);

    const input = await screen.findByRole('textbox');
    await user.type(input, '=S');

    // Should show autocomplete with SUM
    await waitFor(() => {
      expect(screen.getByText('SUM')).toBeInTheDocument();
    });
  });

  it('should filter autocomplete suggestions based on input', async () => {
    const user = userEvent.setup();
    render(<SheetPage />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.queryByText('Loading sheet...')).not.toBeInTheDocument());

    const cells = screen.getAllByRole('cell');
    await user.click(cells[3]);

    const input = await screen.findByRole('textbox');
    await user.type(input, '=AV');

    // Should only show AVG
    await waitFor(() => {
      expect(screen.getByText('AVG')).toBeInTheDocument();
      expect(screen.queryByText('SUM')).not.toBeInTheDocument();
    });
  });

  it('should insert formula when clicking autocomplete suggestion', async () => {
    const user = userEvent.setup();
    render(<SheetPage />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.queryByText('Loading sheet...')).not.toBeInTheDocument());

    const cells = screen.getAllByRole('cell');
    await user.click(cells[3]);

    const input = await screen.findByRole('textbox');
    await user.type(input, '=S');

    // Click on SUM suggestion
    const sumButton = await screen.findByText('SUM');
    await user.click(sumButton);

    // Check if formula is inserted with opening parenthesis
    expect(input).toHaveValue('=SUM(');
  });

  it('should insert formula with Enter key', async () => {
    const user = userEvent.setup();
    render(<SheetPage />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.queryByText('Loading sheet...')).not.toBeInTheDocument());

    const cells = screen.getAllByRole('cell');
    await user.click(cells[3]);

    const input = await screen.findByRole('textbox');
    await user.type(input, '=S');

    // Press Enter to accept first suggestion
    await user.keyboard('{Enter}');

    // Check if formula is inserted
    expect(input).toHaveValue('=SUM(');
  });

  it('should insert formula with Tab key', async () => {
    const user = userEvent.setup();
    render(<SheetPage />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.queryByText('Loading sheet...')).not.toBeInTheDocument());

    const cells = screen.getAllByRole('cell');
    await user.click(cells[3]);

    const input = await screen.findByRole('textbox');
    await user.type(input, '=M');

    // Press Tab to accept first suggestion (should be MAX or MIN)
    await user.keyboard('{Tab}');

    // Check if a formula is inserted
    expect(input.value).toMatch(/^=(MAX|MIN)\($/);
  });

  it('should hide autocomplete when typing non-matching characters', async () => {
    const user = userEvent.setup();
    render(<SheetPage />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.queryByText('Loading sheet...')).not.toBeInTheDocument());

    const cells = screen.getAllByRole('cell');
    await user.click(cells[3]);

    const input = await screen.findByRole('textbox');
    await user.type(input, '=S');

    // Autocomplete should be visible
    await waitFor(() => {
      expect(screen.getByText('SUM')).toBeInTheDocument();
    });

    // Type opening parenthesis
    await user.type(input, '(');

    // Autocomplete should be hidden
    await waitFor(() => {
      expect(screen.queryByText('SUM')).not.toBeInTheDocument();
    });
  });

  it('should close autocomplete on Escape key', async () => {
    const user = userEvent.setup();
    render(<SheetPage />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.queryByText('Loading sheet...')).not.toBeInTheDocument());

    const cells = screen.getAllByRole('cell');
    await user.click(cells[3]);

    const input = await screen.findByRole('textbox');
    await user.type(input, '=S');

    // Autocomplete should be visible
    await waitFor(() => {
      expect(screen.getByText('SUM')).toBeInTheDocument();
    });

    // Press Escape
    await user.keyboard('{Escape}');

    // Both autocomplete and input should be closed
    await waitFor(() => {
      expect(screen.queryByText('SUM')).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  it('should add cell reference when clicking another cell in formula mode', async () => {
    const user = userEvent.setup();
    render(<SheetPage />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.queryByText('Loading sheet...')).not.toBeInTheDocument());

    // Click first cell to edit
    const cells = screen.getAllByRole('cell');
    await user.click(cells[6]); // Click on C1 (empty cell)

    const input = await screen.findByRole('textbox');
    await user.type(input, '=SUM(');

    // Click on A1 to add reference
    await user.click(cells[3]); // A1

    // Input should still be focused and contain the cell reference
    await waitFor(() => {
      expect(input).toHaveValue('=SUM(A1');
    });
  });

  it('should maintain focus on input when clicking cells in formula mode', async () => {
    const user = userEvent.setup();
    render(<SheetPage />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.queryByText('Loading sheet...')).not.toBeInTheDocument());

    const cells = screen.getAllByRole('cell');
    await user.click(cells[6]); // C1

    const input = await screen.findByRole('textbox');
    await user.type(input, '=');

    // Click another cell
    await user.click(cells[3]); // A1

    // Input should still be in the document and focused
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('should allow building complex formulas with multiple cell references', async () => {
    const user = userEvent.setup();
    render(<SheetPage />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.queryByText('Loading sheet...')).not.toBeInTheDocument());

    const cells = screen.getAllByRole('cell');
    await user.click(cells[6]); // C1

    const input = await screen.findByRole('textbox');
    await user.type(input, '=');

    // Click A1
    await user.click(cells[3]);
    await waitFor(() => expect(input).toHaveValue('=A1'));

    // Type +
    await user.type(input, '+');

    // Click B1
    await user.click(cells[4]);
    await waitFor(() => expect(input).toHaveValue('=A1+B1'));
  });
});

describe('Formula Mode Visual Indicators', () => {
  it('should show green border on input in formula mode', async () => {
    const user = userEvent.setup();
    render(<SheetPage />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.queryByText('Loading sheet...')).not.toBeInTheDocument());

    const cells = screen.getAllByRole('cell');
    await user.click(cells[3]);

    const input = await screen.findByRole('textbox');

    // Initially should have blue border (not formula mode)
    expect(input).toHaveClass('border-blue-600');

    // Type = to enter formula mode
    await user.type(input, '=');

    // Should now have green border
    expect(input).toHaveClass('border-green-500');
  });

  it('should show crosshair cursor on cells when in formula mode', async () => {
    const user = userEvent.setup();
    render(<SheetPage />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.queryByText('Loading sheet...')).not.toBeInTheDocument());

    const cells = screen.getAllByRole('cell');
    await user.click(cells[3]); // Click A1

    const input = await screen.findByRole('textbox');
    await user.type(input, '=');

    // Other cells should have crosshair cursor styling
    const cell2 = cells[4]; // B1
    expect(cell2).toHaveClass('cursor-crosshair');
  });
});
