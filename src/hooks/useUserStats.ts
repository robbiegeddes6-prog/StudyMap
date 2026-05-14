import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './useAuth';

export interface UserStats {
  total_study_hours: number;
  sessions_completed: number;
  cards_reviewed: number;
  current_streak: number;
  last_studied_at: string | null;
}

const DEFAULT_STATS: UserStats = {
  total_study_hours: 0,
  sessions_completed: 0,
  cards_reviewed: 0,
  current_streak: 0,
  last_studied_at: null,
};

export function useUserStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) {
      setStats(DEFAULT_STATS);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setStats({
          total_study_hours: Number(data.total_study_hours ?? 0),
          sessions_completed: data.sessions_completed ?? 0,
          cards_reviewed: data.cards_reviewed ?? 0,
          current_streak: data.current_streak ?? 0,
          last_studied_at: data.last_studied_at ?? null,
        });
      } else {
        setStats(DEFAULT_STATS);
      }
    } catch {
      setStats(DEFAULT_STATS);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const incrementSessionCompleted = useCallback(async (durationMinutes: number) => {
    if (!user) return;

    try {
      const { data: current } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const lastStudied = current?.last_studied_at;
      const lastStudiedDay = lastStudied
        ? new Date(lastStudied).toISOString().split('T')[0]
        : null;

      let newStreak = current?.current_streak ?? 0;
      if (!lastStudiedDay) {
        newStreak = 1;
      } else if (lastStudiedDay === todayStr) {
        // Same day – keep current streak
      } else {
        const diff = Math.floor(
          (new Date(todayStr).getTime() - new Date(lastStudiedDay).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        newStreak = diff === 1 ? newStreak + 1 : 1;
      }

      const updatedStats = {
        user_id: user.id,
        total_study_hours: Number(current?.total_study_hours ?? 0) + durationMinutes / 60,
        sessions_completed: (current?.sessions_completed ?? 0) + 1,
        cards_reviewed: current?.cards_reviewed ?? 0,
        current_streak: newStreak,
        last_studied_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      await supabase
        .from('user_stats')
        .upsert(updatedStats, { onConflict: 'user_id' });

      setStats({
        total_study_hours: updatedStats.total_study_hours,
        sessions_completed: updatedStats.sessions_completed,
        cards_reviewed: updatedStats.cards_reviewed,
        current_streak: updatedStats.current_streak,
        last_studied_at: updatedStats.last_studied_at,
      });
    } catch (err) {
      console.error('Failed to update user stats:', err);
    }
  }, [user]);

  return { stats, loading, fetchStats, incrementSessionCompleted };
}
