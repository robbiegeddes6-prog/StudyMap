import { useCallback } from 'react';
import { Task, StudySession, Difficulty } from '@/types';
import { generateStudyPlan, SubjectKey } from '@/lib/studyUtils';

const SESSIONS_STORAGE_KEY = 'studymap-study-sessions';

export const useStudyScheduler = () => {
  /**
   * Generate study sessions based on task difficulty, due date, and estimated hours
   *
   * Algorithm:
   * - Hard difficulty: 1 session per day (more focused)
   * - Medium difficulty: 1 session every 1.5 days
   * - Easy difficulty: 1 session every 2 days
   *
   * - Closer deadline: denser schedule
   * - More time: spread out more
   */
  const mapSubjectToSubjectKey = (subject: string): SubjectKey => {
    switch (subject.toLowerCase()) {
      case 'math':
      case 'mathematics':
        return 'Math';
      case 'biology':
        return 'Biology';
      case 'physics':
        return 'Physics';
      case 'chemistry':
        return 'Chemistry';
      case 'english':
        return 'English';
      case 'history':
        return 'History';
      case 'art':
        return 'Art';
      default:
        return 'Other';
    }
  };

  const generateStudySessions = useCallback(
    (task: Task): Omit<StudySession, 'id' | 'createdAt' | 'updatedAt'>[] => {
      const plan = generateStudyPlan({
        subject: mapSubjectToSubjectKey(task.subject),
        difficulty: task.difficulty,
        dueDate: task.dueDate,
        title: task.name,
        estimatedHours: task.estimatedHours,
      });

      return plan.map((item) => ({
        userId: task.userId,
        taskId: task.id,
        sessionDate: item.date,
        durationMinutes: item.duration,
        completed: false,
      }));
    },
    []
  );

  /**
   * Create study sessions in local storage for a task
   */
  const scheduleSessions = useCallback(
    async (task: Task): Promise<StudySession[] | null> => {
      try {
        const sessions = generateStudySessions(task);

        if (sessions.length === 0) {
          return [];
        }

        // Get existing sessions
        const existingSessions = JSON.parse(localStorage.getItem(SESSIONS_STORAGE_KEY) || '[]');

        // Create new sessions with IDs
        const newSessions: StudySession[] = sessions.map((session, index) => ({
          id: `session_${Date.now()}_${index}`,
          userId: session.userId,
          taskId: session.taskId,
          sessionDate: session.sessionDate,
          durationMinutes: session.durationMinutes,
          completed: session.completed,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

        // Save to localStorage
        const allSessions = [...existingSessions, ...newSessions];
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(allSessions));

        return newSessions;
      } catch (error) {
        console.error('Failed to schedule sessions:', error);
        return null;
      }
    },
    [generateStudySessions]
  );
        };

        const rows = (data as StudySessionDbRow[] | null) || [];

  /**
   * Regenerate schedule for an existing task (e.g., after editing)
   */
  const regenerateSchedule = useCallback(
    async (taskId: string, task: Task): Promise<void> => {
      try {
        // Get existing sessions
        const existingSessions = JSON.parse(localStorage.getItem(SESSIONS_STORAGE_KEY) || '[]');

        // Delete existing sessions for this task
        const filteredSessions = existingSessions.filter((session: StudySession) => session.taskId !== taskId);

        // Create new sessions
        const newSessions = await scheduleSessions(task);

        if (newSessions) {
          // Save updated sessions
          const allSessions = [...filteredSessions, ...newSessions];
          localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(allSessions));
        }
      } catch (err) {
        console.error('Failed to regenerate schedule:', err);
      }
    },
    [scheduleSessions]
  );

  return {
    generateStudySessions,
    scheduleSessions,
    regenerateSchedule,
  };
};
