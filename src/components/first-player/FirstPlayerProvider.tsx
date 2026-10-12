"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_PLAYER_PICK_MODE_ID,
  loadFirstPlayerPreferences,
  saveFirstPlayerPreferences,
  type FirstPlayerPreferences,
} from "@/lib/first-player/modes";

interface FirstPlayerContextValue {
  isOpen: boolean;
  preferences: FirstPlayerPreferences;
  playerNames: string[];
  openPicker: () => void;
  closePicker: () => void;
  setModeId: (modeId: string) => void;
  setModeSetting: (modeId: string, key: string, value: string) => void;
  setPlayerNames: (names: string[]) => void;
}

const FirstPlayerContext = createContext<FirstPlayerContextValue | null>(null);

export function FirstPlayerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState<FirstPlayerPreferences>({
    modeId: DEFAULT_PLAYER_PICK_MODE_ID,
    settings: {},
  });
  const [playerNames, setPlayerNames] = useState<string[]>([]);

  useEffect(() => {
    setPreferences(loadFirstPlayerPreferences());
  }, []);

  const updatePreferences = useCallback((update: (previous: FirstPlayerPreferences) => FirstPlayerPreferences) => {
    setPreferences((previous) => {
      const next = update(previous);
      saveFirstPlayerPreferences(next);
      return next;
    });
  }, []);

  const openPicker = useCallback(() => setIsOpen(true), []);
  const closePicker = useCallback(() => setIsOpen(false), []);

  const setModeId = useCallback((modeId: string) => {
    updatePreferences((previous) => ({ ...previous, modeId }));
  }, [updatePreferences]);

  const setModeSetting = useCallback((modeId: string, key: string, value: string) => {
    updatePreferences((previous) => ({
      ...previous,
      settings: {
        ...previous.settings,
        [modeId]: { ...previous.settings[modeId], [key]: value },
      },
    }));
  }, [updatePreferences]);

  const value = useMemo<FirstPlayerContextValue>(() => ({
    isOpen,
    preferences,
    playerNames,
    openPicker,
    closePicker,
    setModeId,
    setModeSetting,
    setPlayerNames,
  }), [isOpen, preferences, playerNames, openPicker, closePicker, setModeId, setModeSetting]);

  return <FirstPlayerContext.Provider value={value}>{children}</FirstPlayerContext.Provider>;
}

export function useFirstPlayer() {
  const context = useContext(FirstPlayerContext);
  if (!context) throw new Error("useFirstPlayer must be used within FirstPlayerProvider");
  return context;
}

export function useScorecardPlayerNames(names: string[]) {
  const { setPlayerNames } = useFirstPlayer();
  const namesKey = JSON.stringify(names);

  useEffect(() => {
    setPlayerNames(JSON.parse(namesKey));
    return () => setPlayerNames([]);
  }, [namesKey, setPlayerNames]);
}
