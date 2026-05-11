# StudyMap API Reference & Developer Guide

## 📚 Type Definitions

### Task
```typescript
interface Task {
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

type TaskType = "assignment" | "exam" | "quiz" | "project" | "study";
type Difficulty = "easy" | "medium" | "hard";
type Subject = "math" | "biology" | "physics" | "chemistry" | "english" | "history" | "art" | "other";
```

### StudySession
```typescript
interface StudySession {
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
```

### TimerState
```typescript
interface TimerState {
  isRunning: boolean;
  remainingSeconds: number;
  totalSeconds: number;
  sessionId?: string;
}
```

---

## 🎣 Hook APIs

### useStudySession()

Timer management hook with localStorage persistence.

```typescript
const {
  // State
  isRunning: boolean,
  remainingSeconds: number,
  totalSeconds: number,
  sessionId?: string,
  
  // Methods
  startSession: (durationMinutes: number, sessionId?: string) => void,
  pauseSession: () => void,
  resumeSession: () => void,
  resetSession: () => void,
  getFormattedTime: () => string, // "MM:SS"
  getProgressPercentage: () => number, // 0-100
} = useStudySession();
```

**Usage Example**:
```typescript
function MyComponent() {
  const { startSession, getFormattedTime, isRunning } = useStudySession();
  
  return (
    <>
      <span>{getFormattedTime()}</span>
      <button onClick={() => startSession(25)}>Start 25min</button>
    </>
  );
}
```

**Key Features**:
- Auto-saves to localStorage with TIMER_STORAGE_KEY
- Survives page refreshes
- Calls handleSessionComplete when timer reaches zero
- Updates every 100ms for smooth countdown
- Respects pause/resume state

---

### useStudyScheduler()

Auto-scheduling logic for generating optimal study sessions.

```typescript
const {
  generateStudySessions: (task: Task) => Omit<StudySession, 'id' | 'createdAt' | 'updatedAt'>[],
  scheduleSessions: (task: Task) => Promise<StudySession[] | null>,
  regenerateSchedule: (taskId: string, task: Task) => Promise<void>,
} = useStudyScheduler();
```

**Usage Example**:
```typescript
function CreateTask() {
  const { createTask } = useTasks();
  const { scheduleSessions } = useStudyScheduler();
  
  const handleCreate = async () => {
    const task = await createTask(
      "Calculus HW",
      "math",
      "assignment",
      "hard",
      "2026-03-30",
      3
    );
    
    if (task) {
      await scheduleSessions(task);
      toast.success("Study plan created!");
    }
  };
  
  return <button onClick={handleCreate}>Create</button>;
}
```

**Algorithm Details**:
- Analyzes task difficulty and deadline
- Distributes sessions over available days
- Shorter deadlines = denser schedule
- Higher difficulty = longer individual sessions
- Returns array of session objects ready to insert

**Key Parameters**:
- `task.difficulty`: Adjusts session frequency
- `task.dueDate`: Calculates available days
- `task.estimatedHours`: Determines total session duration

---

### useTasks()

CRUD operations for task management.

```typescript
const {
  createTask: (
    name: string,
    subject: Subject,
    type: TaskType,
    difficulty: Difficulty,
    dueDate: string, // ISO date
    estimatedHours: number,
    description?: string
  ) => Promise<Task | null>,
  
  updateTask: (
    taskId: string,
    updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt'>>
  ) => Promise<Task | null>,
  
  deleteTask: (taskId: string) => Promise<boolean>,
  
  completeTask: (taskId: string) => Promise<Task | null>,
  
  getTasks: (filters?: {
    completed?: boolean;
    subject?: Subject;
    type?: TaskType;
  }) => Promise<Task[]>,
  
  getTaskById: (taskId: string) => Promise<Task | null>,
  
  loading: boolean,
  error: string | null,
} = useTasks();
```

**Usage Examples**:

Create Task:
```typescript
const task = await createTask(
  "Midterm Exam",
  "biology",
  "exam",
  "hard",
  "2026-03-28",
  5
);
```

Update Task:
```typescript
await updateTask(taskId, {
  completed: true,
  difficulty: "medium"
});
```

Delete Task:
```typescript
const success = await deleteTask(taskId);
if (success) {
  toast.success("Task deleted");
}
```

Get Tasks with Filter:
```typescript
const incompleteTasks = await getTasks({ completed: false });
const mathTasks = await getTasks({ subject: "math" });
```

**Error Handling**:
```typescript
try {
  const task = await createTask(/*...*/);
  if (!task) {
    toast.error("Failed to create task");
  }
} catch (err) {
  console.error(err);
}
```

---

## 🧩 Components

### StudyTimer

Circular timer UI with controls.

```typescript
<StudyTimer />
```

**Props**: None (uses useStudySession hook internally)

**Features**:
- Input field for duration
- Circular progress indicator
- Start/Pause/Resume/Reset buttons
- Formatted time display
- Percentage complete

**Styling**: Uses Tailwind and `studymap-card-elevated` class

---

### QuickInput

Quick Add AI interface with type and difficulty selectors.

```typescript
<QuickInput />
```

**Props**: None

**Features**:
- Text input for task description
- Type dropdown (Assignment, Exam, Quiz, Project, Study)
- Difficulty dropdown (Easy, Medium, Hard)
- Auto-parsing of subject and due date
- Auto-scheduling on submit

**Behind the Scenes**:
- Uses useTasks for creation
- Uses useStudyScheduler for scheduling
- Parses natural language with parseInputAndExtractDueDate
- Shows loading state with spinner

---

### TodaySchedule

Displays today's study sessions with real data.

```typescript
<TodaySchedule />
```

**Props**: None

**Features**:
- Fetches sessions from Supabase
- Real-time updates via subscription
- Checkbox to mark complete
- Delete button with confirmation
- Subject icons
- Duration display
- Animations on load
- Shows completion count

**Data Flow**:
1. Mounts → queries study_sessions for today
2. Sets up Supabase real-time subscription
3. Updates UI when any session changes
4. Provides checkbox and delete handlers

---

### FileUpload

Drag-and-drop file uploader with AI analysis simulation.

```typescript
<FileUpload />
```

**Props**: None

**Supported Types**:
- `application/pdf`
- `image/png`, `image/jpeg`, `image/jpg`
- `text/plain`

**Max File Size**: 10MB

**Features**:
- Drag and drop or click to browse
- Individual file progress tracking
- AI processing simulation (1.5s)
- Auto task creation
- Auto study scheduling
- Status modal with real-time updates
- Success/error handling

**File Processing Steps**:
1. Validate file type and size
2. Show upload progress (0-100%)
3. Switch to "processing" state
4. Simulate AI analysis
5. Extract task information
6. Create task and schedule sessions
7. Show success or error

---

## 📄 Page Components

### Friends.tsx

Leaderboard and friend management.

```typescript
function Friends() {
  // Fetches from Supabase or shows seed data
  // Manages leaderboard state
  // Handles friend invites
}
```

**State**:
- `leaderboard`: Array of LeaderboardUser
- `loading`: Boolean
- `friendEmail`: String
- `inviteLoading`: Boolean

**Key Functions**:
- `loadLeaderboard()`: Fetch from database
- `sendFriendInvite()`: Send email invite (ready for EmailJS)
- `addFriend()`: Update friend status

**Seed Data**: 5 demo users with varying study times and streaks

---

### Analytics.tsx

Study statistics and charts.

```typescript
function Analytics() {
  // Fetches analytics data from Supabase
  // Calculates metrics from sessions and assignments
  // Displays with animated charts
}
```

**Metrics**:
- `todayStudyTime`: Sum of focus_sessions today
- `weekStudyTime`: Sum of focus_sessions this week
- `longestSession`: Max duration from focus_sessions
- `completionRate`: (completed assignments / total) * 100
- `tasksDueToday`: Count of assignments due today
- `overdueCount`: Count of completed assignments past due

**Charts**:
- Weekly breakdown: Hours per day with progress bars
- Subject breakdown: Percentage distribution with labels

---

### Settings.tsx

Account settings and subscription management.

```typescript
function Settings() {
  // Manages user preferences
  // Handles sign out
  // Subscription UI
}
```

**Features**:
- Display current user email
- Leaderboard visibility toggle
- Subscription status display
- Upgrade button with mock payment
- Sign out with confirmation

**Mock Features**:
- Payment processing simulated with 1.5s delay
- No real payment integration yet

---

## 🌐 Routes

| Route | Component | Protected | Purpose |
|-------|-----------|-----------|---------|
| `/` | Index | Yes | Dashboard (main page) |
| `/calendar` | Calendar | Yes | Calendar view |
| `/exams` | Exams | Yes | Exam list |
| `/assignments` | Assignments | Yes | Assignment list |
| `/friends` | Friends | Yes | Leaderboard |
| `/analytics` | Analytics | Yes | Statistics |
| `/settings` | Settings | Yes | Account & prefs |
| `/auth` | Auth | No | Login/signup |
| `/*` | NotFound | No | 404 page |

---

## 🔌 Supabase Integration

### Connection
```typescript
import { supabase } from "@/integrations/supabase/client";
```

### Common Queries

**Fetch user's tasks**:
```typescript
const { data } = await supabase
  .from('assignments')
  .select()
  .eq('user_id', userId);
```

**Create study sessions**:
```typescript
const { data } = await supabase
  .from('study_sessions')
  .insert(sessionsArray)
  .select();
```

**Real-time subscription**:
```typescript
const channel = supabase
  .channel('assignments')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'assignments',
  }, payload => {
    // Handle change
  })
  .subscribe();
```

---

## 🎯 Natural Language Parsing

### NLP Function
Location: `src/components/dashboard/QuickInput.tsx`

```typescript
function parseInputAndExtractDueDate(input: string): {
  taskName: string;
  subject: Subject;
  daysFromNow: number;
}
```

**Subject Detection**:
- Looks for exact matches (case-insensitive)
- Examples: "math", "calculus", "biology", "english essay"
- Falls back to "other"

**Due Date Detection**:
- Keywords: "today" → 0 days
- Keywords: "tomorrow" → 1 day
- Keywords: "this week" → 3 days
- Keywords: "next week" → 7 days
- Numeric: "5 days" → 5 days
- Default: 7 days

---

## 🎨 Styling Guide

### Utility Classes

**Card styling**:
```html
<div class="studymap-card-elevated">
  <!-- Content -->
</div>
```

**Interactive elements**:
```html
<Button className="w-full">
<Input placeholder="..." />
<Select>
```

**Animations**:
```typescript
import { motion } from "framer-motion";

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.1 }}
>
```

### Colors
- `text-primary`: Interactive text
- `bg-primary/10`: Light background
- `text-destructive`: Delete/error
- `text-muted-foreground`: Secondary text

---

## 📊 Data Relationships

```
User (Supabase Auth)
  ├── Profile (profiles table)
  ├── Assignments/Tasks (assignments table)
  │   ├── Study Sessions (study_sessions)
  │   └── Focus Sessions (focus_sessions)
  └── Notifications (notifications)
```

**Cascade Deletes**:
- Delete Task → Delete its Study Sessions

**User Isolation**:
- All queries filter by `user_id`
- Auth provider handles session management

---

## 🧪 Testing

### Test Hook Usage
```typescript
import { render } from '@testing-library/react';
import { useStudySession } from '@/hooks/useStudySession';

function TestComponent() {
  const { startSession, getFormattedTime } = useStudySession();
  
  return <div>{getFormattedTime()}</div>;
}

test('timer starts and counts down', () => {
  const { getByText } = render(<TestComponent />);
  // Test logic
});
```

### Mock Supabase
```typescript
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: { onAuthStateChange: vi.fn() },
  },
}));
```

---

## 🚀 Performance Tips

1. **Memoize components**:
   ```typescript
   export const Component = memo(MyComponent);
   ```

2. **Use useCallback for functions**:
   ```typescript
   const handleClick = useCallback(() => {
     // Logic
   }, [dependencies]);
   ```

3. **Lazy load routes**:
   ```typescript
   const Friends = lazy(() => import('./pages/Friends'));
   ```

4. **Optimize queries**:
   - Only select needed fields
   - Use indexes on user_id
   - Paginate large lists

5. **Real-time best practices**:
   - Unsubscribe on unmount
   - Debounce rapid updates
   - Limit to necessary tables

---

## 🔐 Security Notes

1. **RLS (Row Level Security)**:
   - Enable on all tables
   - Ensure user_id filtering in policies

2. **Authentication**:
   - Use Supabase auth in production
   - Validate user_id on client

3. **Validation**:
   - Validate inputs before Supabase calls
   - Check file types on client (redundant with server)

4. **Secrets**:
   - Never commit .env files
   - Use Supabase anon key (limited permissions)

---

## 📖 Additional Resources

- [Supabase Docs](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn/ui](https://ui.shadcn.com)
- [Framer Motion](https://www.framer.com/motion)

---

**Happy coding! 🚀**
