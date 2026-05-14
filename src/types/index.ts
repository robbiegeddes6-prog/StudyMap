// Task and Study Session Types
export type TaskType = "assignment" | "exam" | "quiz" | "project" | "study" | "other";
export type Difficulty = "easy" | "medium" | "hard";
export type Subject = "math" | "biology" | "physics" | "chemistry" | "english" | "history" | "art" | "other";

export const SUBJECT_ICONS: Record<Subject, string> = {
  math: "📐",
  biology: "🧬",
  physics: "⚛️",
  chemistry: "🧪",
  english: "📚",
  history: "📜",
  art: "🎨",
  other: "📖",
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  assignment: "Assignment",
  exam: "Exam",
  quiz: "Quiz",
  project: "Project",
  study: "Study",
  other: "Other",
};

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: "bg-green-100 text-green-800 border-green-300",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  hard: "bg-red-100 text-red-800 border-red-300",
};

export interface Task {
  id: string;
  userId: string;
  name: string;
  subject: Subject;
  type: TaskType;
  difficulty: Difficulty;
  dueDate: string; // ISO date
  estimatedHours: number;
  completed: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  id: string;
  userId: string;
  taskId: string;
  sessionDate: string; // ISO date
  durationMinutes: number;
  completed: boolean;
  startTime?: string;
  endTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FocusSession {
  id: string;
  userId: string;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  completed: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  totalStudyHours: number;
  studyStreak: number;
  visibleOnLeaderboard: boolean;
  subscriptionPlan?: "free" | "premium";
  createdAt: string;
  updatedAt: string;
}

export interface TimerState {
  isRunning: boolean;
  remainingSeconds: number;
  totalSeconds: number;
  sessionId?: string;
}

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  subject: Subject;
  duration: string;
  completed: boolean;
  type: TaskType;
  taskId: string;
}

export interface LeaderboardEntry {
  id: string;
  displayName: string;
  avatarUrl?: string;
  weeklyStudyTime: number;
  currentSubject: Subject;
  ranking: number;
  isFriend: boolean;
}

export interface AnalyticsData {
  todayStudyTime: number;
  weekStudyTime: number;
  longestSession: number;
  mostStudiedSubject: Subject;
  completionRate: number;
  tasksDueToday: number;
  overdueCount: number;
}
