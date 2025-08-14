import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * UI-only state management for modals, dismissals, and ephemeral UI state
 * No server data should ever be stored here
 */
interface UIState {
  modals: Record<string, boolean>;
  dismissals: {
    setupWidget: boolean;
    setupWidgetAt: string | null;
  };
}

interface UIActions {
  setModal: (key: string, open: boolean) => void;
  dismissSetupWidget: (permanently?: boolean) => void;
  resetDismissals: () => void;
}

type UIStore = UIState & UIActions;

const UIContext = createContext<UIStore | null>(null);

const initialState: UIState = {
  modals: {},
  dismissals: {
    setupWidget: false,
    setupWidgetAt: null,
  }
};

export function UIStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UIState>(initialState);

  const setModal = useCallback((key: string, open: boolean) => {
    setState(prev => ({
      ...prev,
      modals: { ...prev.modals, [key]: open }
    }));
  }, []);

  const dismissSetupWidget = useCallback((permanently = false) => {
    setState(prev => ({
      ...prev,
      dismissals: {
        ...prev.dismissals,
        setupWidget: true,
        setupWidgetAt: permanently ? new Date().toISOString() : null,
      }
    }));
  }, []);

  const resetDismissals = useCallback(() => {
    setState(prev => ({
      ...prev,
      dismissals: {
        setupWidget: false,
        setupWidgetAt: null,
      }
    }));
  }, []);

  const store: UIStore = {
    ...state,
    setModal,
    dismissSetupWidget,
    resetDismissals,
  };

  return (
    <UIContext.Provider value={store}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within UIStoreProvider');
  }
  return context;
}