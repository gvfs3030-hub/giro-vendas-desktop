// [LOCAL] — contexto de estado global do app (onboarding, setup)
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '../platform/storage';

interface AppStateContextType {
  isLoading: boolean;
  isOnboarded: boolean;
  isSetup: boolean;
  setOnboarded: () => Promise<void>;
  setSetupComplete: () => Promise<void>;
}

const AppStateContext = createContext<AppStateContextType>({
  isLoading: true,
  isOnboarded: false,
  isSetup: false,
  setOnboarded: async () => {},
  setSetupComplete: async () => {},
});

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isSetup, setIsSetup] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [onb, setup] = await Promise.all([
          AsyncStorage.getItem('onboarding_complete'),
          AsyncStorage.getItem('setup_complete'),
        ]);
        setIsOnboarded(onb === 'true');
        setIsSetup(setup === 'true');
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const setOnboarded = useCallback(async () => {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    setIsOnboarded(true);
  }, []);

  const setSetupComplete = useCallback(async () => {
    await AsyncStorage.setItem('setup_complete', 'true');
    setIsSetup(true);
  }, []);

  return (
    <AppStateContext.Provider value={{ isLoading, isOnboarded, isSetup, setOnboarded, setSetupComplete }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  return useContext(AppStateContext);
}
