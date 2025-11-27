import { create } from 'zustand';

// Command interface - all undoable operations must implement this
export interface Command {
  execute(): Promise<void>;
  undo(): Promise<void>;
  description: string;
}

interface UndoRedoState {
  undoStack: Command[];
  redoStack: Command[];
  isExecuting: boolean;

  // Actions
  executeCommand: (command: Command) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

export const useUndoRedoStore = create<UndoRedoState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  isExecuting: false,

  executeCommand: async (command: Command) => {
    const state = get();

    // Don't allow executing commands while another is in progress
    if (state.isExecuting) {
      console.warn('Command execution in progress, skipping');
      return;
    }

    set({ isExecuting: true });

    try {
      await command.execute();

      // Add to undo stack and clear redo stack
      set({
        undoStack: [...state.undoStack, command],
        redoStack: [],
        isExecuting: false,
      });
    } catch (error) {
      console.error('Failed to execute command:', error);
      set({ isExecuting: false });
      throw error;
    }
  },

  undo: async () => {
    const state = get();

    if (!state.canUndo() || state.isExecuting) {
      return;
    }

    const command = state.undoStack[state.undoStack.length - 1];
    set({ isExecuting: true });

    try {
      await command.undo();

      set({
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, command],
        isExecuting: false,
      });
    } catch (error) {
      console.error('Failed to undo command:', error);
      set({ isExecuting: false });
      throw error;
    }
  },

  redo: async () => {
    const state = get();

    if (!state.canRedo() || state.isExecuting) {
      return;
    }

    const command = state.redoStack[state.redoStack.length - 1];
    set({ isExecuting: true });

    try {
      await command.execute();

      set({
        undoStack: [...state.undoStack, command],
        redoStack: state.redoStack.slice(0, -1),
        isExecuting: false,
      });
    } catch (error) {
      console.error('Failed to redo command:', error);
      set({ isExecuting: false });
      throw error;
    }
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  clear: () => set({ undoStack: [], redoStack: [] }),
}));
