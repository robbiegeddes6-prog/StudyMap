import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from "react";
import { generateStudyPlan, generateStudySchedule, calculateTaskUrgency, generateAICoachSummary, redistributeMissedSessions, UrgencyLevel } from "@/lib/studyUtils";
import { createTask, getTasks } from "@/lib/tasks";
import { useAuth } from "@/hooks/useAuth";

export type SharedTaskType = "exam" | "assignment" | "quiz" | "project" | "study";

export interface StudySessionItem {
  id: string;
  taskId: string;
  title: string;
  duration: number;
  date: Date;
  completed: boolean;
}

export interface SharedTask {
  id: string;
  title: string;
  subject: string;
  type: SharedTaskType;
  totalHours: number;
  dueDate: Date;
  completed: boolean;
  difficulty?: "easy" | "medium" | "hard";
  weight?: number;
  studySessions: StudySessionItem[];
}

interface WeakTopic {
  id: string;
  subject: string;
  topic: string;
  incorrect: number;
  correct: number;
}

interface TaskContextValue {
  tasks: SharedTask[];
  weakTopics: WeakTopic[];
  addTask: (task: Omit<SharedTask, "id"> & { id?: string }) => Promise<string>;
  updateTask: (id: string, updates: Partial<SharedTask>) => void;
  removeTask: (taskId: string) => void;
  deleteSession: (taskId: string, sessionId: string) => void;
  toggleTaskComplete: (taskId: string) => void;
  toggleSessionComplete: (taskId: string, sessionId: string) => void;
  getTodayStudySessions: () => Array<{
    taskId: string;
    taskTitle: string;
    subject: string;
    sessionId: string;
    sessionDate: Date;
    duration: number;
    completed: boolean;
    title: string;
  }>;
  getTaskUrgencies: () => Array<{ taskId: string; level: UrgencyLevel; reason: string; daysRemaining: number; completionRate: number }>;
  getAICoachSummary: () => { missedSessions: number; completionRate: number; daysRemaining: number; adjustments: string[]; message: string };
  applyAICoachAdjustments: () => void;
  recordWeakTopic: (subject: string, topic: string, isCorrect: boolean) => void;
  getWeakTopics: () => WeakTopic[];
  addWeakTopicsToPlan: (topics: WeakTopic[]) => Promise<void>;
}

const TaskContext = createContext<TaskContextValue | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<SharedTask[]>([]);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user } = useAuth();

  // Load tasks when user changes or on mount
  useEffect(() => {
    const loadTasks = async () => {
      if (!user) {
        setTasks([]);
        setIsLoaded(true);
        return;
      }

      try {
        const fetchedTasks = await getTasks();
        const tasksWithDates = fetchedTasks.map(task => ({
          id: task.id || `${Date.now()}-${Math.random()}`,
          title: task.title,
          subject: "other",
          type: task.type as SharedTaskType,
          totalHours: Number(task.estimated_hours ?? 0),
          dueDate: new Date(task.due_date),
          completed: false,
          studySessions: [],
        }));
        setTasks(tasksWithDates);
      } catch (error) {
        console.error("Failed to load tasks:", error);
        setTasks([]);
      }
      setIsLoaded(true);
    };

    loadTasks();
  }, [user]);

  const addTask = useCallback(async (task: Omit<SharedTask, "id"> & { id?: string }) => {
    const tempId = task.id || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

    const optimisticTask: SharedTask = {
      id: tempId,
      title: task.title,
      subject: task.subject || "other",
      type: task.type,
      totalHours: task.totalHours,
      dueDate: task.dueDate,
      completed: task.completed ?? false,
      difficulty: task.difficulty,
      weight: task.weight,
      studySessions: task.studySessions || [],
    };

    setTasks(prevTasks => {
      const updatedTasks = [...prevTasks, optimisticTask];
      return updatedTasks.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    });

    try {
      const createdTask = await createTask({
        user_id: user?.id || 'anonymous',
        title: task.title,
        type: task.type,
        due_date: task.dueDate.toISOString(),
        estimated_hours: task.totalHours,
      });

      if (createdTask.id && createdTask.id !== tempId) {
        setTasks(prevTasks => prevTasks.map((existingTask) =>
          existingTask.id === tempId ? { ...existingTask, id: createdTask.id || tempId } : existingTask
        ));
      }

      console.log('Task saved to local storage and added to UI');
      return createdTask.id || tempId;
    } catch (err) {
      setTasks(prevTasks => prevTasks.filter((existingTask) => existingTask.id !== tempId));
      console.error('Failed to save task to local storage:', err);
      throw err;
    }
  }, [user]);

  const recordWeakTopic = useCallback((subject: string, topic: string, isCorrect: boolean) => {
    setWeakTopics(prev => {
      const existing = prev.find((w) => w.subject === subject && w.topic === topic);
      if (existing) {
        return prev.map((w) =>
          w.subject === subject && w.topic === topic
            ? { ...w, incorrect: w.incorrect + (isCorrect ? 0 : 1), correct: w.correct + (isCorrect ? 1 : 0) }
            : w
        );
      }
      return [
        ...prev,
        {
          id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
          subject,
          topic,
          incorrect: isCorrect ? 0 : 1,
          correct: isCorrect ? 1 : 0,
        },
      ];
    });
  }, []);

  const getWeakTopics = useCallback(() => weakTopics, [weakTopics]);

  const addWeakTopicsToPlan = useCallback(async (topics: WeakTopic[]) => {
    const planTask = {
      title: "AI Weak Topics Review",
      subject: topics[0]?.subject || "Other",
      type: "study" as SharedTaskType,
      totalHours: Math.max(1, topics.length * 0.5),
      dueDate: new Date(),
      completed: false,
      studySessions: topics.map((topic, index) => ({
        id: `${Date.now()}-weak-${index}`,
        taskId: "",
        title: `Review: ${topic.topic}`,
        duration: 30,
        date: new Date(),
        completed: false,
      })),
    };

    await addTask(planTask);
  }, [addTask]);

  const updateTask = useCallback((id: string, updates: Partial<SharedTask>) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;

        const mergedTask = { ...task, ...updates };

        const shouldRegen =
          updates.dueDate !== undefined ||
          updates.totalHours !== undefined ||
          updates.title !== undefined ||
          updates.subject !== undefined ||
          updates.type !== undefined;

        if (!shouldRegen) {
          return mergedTask;
        }

        const schedule = generateStudySchedule({
          id: mergedTask.id,
          title: mergedTask.title,
          type: mergedTask.type as "assignment" | "exam",
          dueDate: mergedTask.dueDate,
          totalHours: mergedTask.totalHours,
          difficulty: mergedTask.difficulty,
        });

        return {
          ...mergedTask,
          studySessions: schedule.map((session) => ({
            id: session.id,
            taskId: mergedTask.id,
            title: session.title,
            duration: session.duration,
            date: session.date,
            completed: false,
          })),
        };
      })
    );
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }, []);

  const deleteSession = useCallback((taskId: string, sessionId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          studySessions: task.studySessions.filter((session) => session.id !== sessionId),
        };
      })
    );
  }, []);

  const toggleTaskComplete = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  }, []);

  const toggleSessionComplete = useCallback((taskId: string, sessionId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          studySessions: task.studySessions.map((session) =>
            session.id === sessionId
              ? { ...session, completed: !session.completed }
              : session
          ),
        };
      })
    );
  }, []);

  const getTodayStudySessions = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return tasks?.flatMap((task) =>
      task?.studySessions
        ?.filter((session) => {
          const sessionDate = session?.date instanceof Date ? session.date : new Date(session?.date);
          if (!sessionDate || Number.isNaN(sessionDate.getTime())) return false;
          
          const sessionDay = new Date(sessionDate);
          sessionDay.setHours(0, 0, 0, 0);
          
          // Include today and tomorrow
          return sessionDay.getTime() === today.getTime() || sessionDay.getTime() === tomorrow.getTime();
        })
        .map((session) => {
          const sessionDate = session?.date instanceof Date ? session.date : new Date(session?.date);
          return {
            taskId: task.id,
            taskTitle: task.title || "Study Session",
            subject: task.subject || "other",
            sessionId: session.id,
            sessionDate,
            duration: session.duration || 60,
            completed: session.completed || false,
            dueDate: task.dueDate,
            title: session.title || `Study ${task.title || "Session"} – ${(session.duration || 60) / 60}h`,
          };
        })
    ) || [];
  }, [tasks]);

  const getTaskUrgencies = useCallback(() => {
    const today = new Date();
    return tasks.map(task => ({
      taskId: task.id,
      ...calculateTaskUrgency(task, today)
    }));
  }, [tasks]);

  const getAICoachSummary = useCallback(() => {
    const today = new Date();
    return generateAICoachSummary(tasks, today);
  }, [tasks]);

  const applyAICoachAdjustments = useCallback(() => {
    const today = new Date();
    
    setTasks(prevTasks => 
      prevTasks.map(task => {
        const redistributedSessions = redistributeMissedSessions(task, today);
        return {
          ...task,
          studySessions: redistributedSessions
        };
      })
    );
  }, []);

  const value = useMemo(
    () => ({ 
      tasks,
      weakTopics,
      addTask,
      updateTask,
      removeTask,
      deleteSession,
      toggleTaskComplete,
      toggleSessionComplete,
      getTodayStudySessions,
      getTaskUrgencies,
      getAICoachSummary,
      applyAICoachAdjustments,
      recordWeakTopic,
      getWeakTopics,
      addWeakTopicsToPlan,
    }),
    [tasks, weakTopics, addTask, updateTask, removeTask, deleteSession, toggleTaskComplete, toggleSessionComplete, getTodayStudySessions, getTaskUrgencies, getAICoachSummary, applyAICoachAdjustments, recordWeakTopic, getWeakTopics, addWeakTopicsToPlan]
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error("useTaskContext must be used within TaskProvider");
  }
  return context;
};
