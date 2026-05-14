import React, { createContext, useContext } from 'react';
import { useUserStats, UserStats } from '@/hooks/useUserStats';

interface UserStatsContextValue {
  stats: UserStats;
  loading: boolean;
  fetchStats: () => Promise<void>;
  incrementSessionCompleted: (durationMinutes: number) => Promise<void>;
}

const UserStatsContext = createContext<UserStatsContextValue | undefined>(undefined);

export const UserStatsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useUserStats();
  return <UserStatsContext.Provider value={value}>{children}</UserStatsContext.Provider>;
};

export const useUserStatsContext = () => {
  const ctx = useContext(UserStatsContext);
  if (!ctx) throw new Error('useUserStatsContext must be used within UserStatsProvider');
  return ctx;
};
