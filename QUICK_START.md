# StudyMap AI - Quick Start Guides

## 🚀 Running the Project

### Development Server
```bash
cd C:\Users\wabbl\studybuddy-ai
npm install  # if needed
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production
```bash
npm run build
npm run preview
```

---

## 📋 Feature Overview

### 1️⃣ Quick Add AI
**Location**: Dashboard → Quick Add section

**How to Use**:
1. Type a description (e.g., "Physics exam next Friday")
2. Select Type from dropdown (Assignment, Exam, Quiz, etc.)
3. Select Difficulty (Easy, Medium, Hard)
4. Click "Add Task & Schedule"
5. Study sessions are automatically created and scattered across calendar

**Behind the Scenes**:
- Natural language parsing extracts subject and due date
- Auto-scheduler generates optimal study sessions
- Tasks appear in Today's Schedule with icons

---

### 2️⃣ File Upload
**Location**: Dashboard → Upload Files section

**Supported Files**:
- PDFs (assignments, syllabi, lecture notes)
- Images (PNG, JPG - scanned notes, screenshots)
- Text files (class notes)

**How to Use**:
1. Drag & drop files or click to browse
2. Watch progress as files upload
3. AI analyzes content (simulated 1.5s)
4. Task automatically created
5. Study plan generated

**What Happens**:
- File name becomes task name
- Subject is detected
- Difficulty estimated
- 7-day deadline set by default
- Study sessions scheduled

---

### 3️⃣ Study Timer
**Location**: Dashboard → Right sidebar

**Features**:
- Enter custom duration (in minutes)
- Start/Pause/Resume/Reset controls
- Circular progress indicator
- Percent complete display
- Auto-marks session complete when timer ends
- Persists to localStorage

**How to Use**:
1. Enter duration (default 25 min)
2. Click Start
3. Timer counts down
4. Pause anytime, Resume to continue
5. Auto-completes when reaching zero

---

### 4️⃣ Today's Schedule
**Location**: Dashboard → Main content area (left)

**Features**:
- Lists all sessions scheduled for today
- Shows session duration
- Subject displayed with emoji icon
- Click checkbox to mark complete
- Delete sessions with confirmation

**Real Data**:
- Fetches from Supabase
- Real-time updates
- Reflects Quick Add and File Upload additions

---

### 5️⃣ Friends & Leaderboard
**Location**: Sidebar → Friends

**Features**:
- See top 5 active studiers
- Filter by friends vs all users
- View weekly study time
- See study streaks
- Add friends by email invite
- Mock leaderboard with seed data

**How to Use**:
1. View leaderboard rankings
2. Enter friend's email to invite
3. Click "Add" on any user to become friends
4. See your rank and friend status

---

### 6️⃣ Analytics
**Location**: Sidebar → Analytics

**Metrics Shown**:
- Today's study time (hours)
- Weekly study time (hours)
- Longest session (hours)
- Most studied subject
- Task completion rate (%)
- Tasks due today
- Overdue tasks

**Charts**:
- Weekly breakdown (Mon-Sun)
- Subject distribution by percentage
- Color-coded progress bars

---

### 7️⃣ Settings
**Location**: Sidebar → Settings

**Account**:
- See your email
- Sign out with confirmation

**Preferences**:
- Toggle leaderboard visibility

**Subscription**:
- Free Plan: Basic features
- Premium Plan: $4.99/month
  - Auto-scheduler
  - Quick Add AI
  - File upload & analysis
  - Advanced analytics

---

## 🗄️ Database Schema

### Assignments (Tasks)
```typescript
{
  id: string
  user_id: string
  name: string
  subject: 'math' | 'biology' | 'physics' | 'chemistry' | 'english' | 'history' | 'art' | 'other'
  type: 'assignment' | 'exam' | 'quiz' | 'project' | 'study'
  difficulty: 'easy' | 'medium' | 'hard'
  due_date: string (ISO date)
  estimated_hours: number
  completed: boolean
  priority: string
  created_at: string
  updated_at: string
}
```

### Study Sessions
```typescript
{
  id: string
  user_id: string
  assignment_id: string
  date: string (ISO date)
  duration_minutes: number
  completed: boolean
  start_time?: string
  end_time?: string
  created_at: string
}
```

### Focus Sessions
```typescript
{
  id: string
  user_id: string
  start_time: string
  end_time?: string
  duration_minutes?: number
  completed: boolean
  created_at: string
}
```

---

## 🔑 Key Hooks

### useStudySession
```typescript
const {
  isRunning,
  remainingSeconds,
  totalSeconds,
  startSession,
  pauseSession,
  resumeSession,
  resetSession,
  getFormattedTime,
  getProgressPercentage,
} = useStudySession();
```

### useStudyScheduler
```typescript
const {
  generateStudySessions,
  scheduleSessions,
  regenerateSchedule,
} = useStudyScheduler();
```

### useTasks
```typescript
const {
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  getTasks,
  getTaskById,
  loading,
  error,
} = useTasks();
```

---

## 🎨 Subject Icons

| Subject | Icon | Code |
|---------|------|------|
| Math | 📐 | `SUBJECT_ICONS['math']` |
| Biology | 🧬 | `SUBJECT_ICONS['biology']` |
| Physics | ⚛️ | `SUBJECT_ICONS['physics']` |
| Chemistry | 🧪 | `SUBJECT_ICONS['chemistry']` |
| English | 📚 | `SUBJECT_ICONS['english']` |
| History | 📜 | `SUBJECT_ICONS['history']` |
| Art | 🎨 | `SUBJECT_ICONS['art']` |
| Other | 📖 | `SUBJECT_ICONS['other']` |

---

## 🔄 Auto-Scheduler Algorithm

```
Input: Task with difficulty, due date, estimated hours

1. Extract days until due date
2. Determine session frequency:
   - Hard: 1 session/day (60 min)
   - Medium: 1 session every 1.5 days (50 min)
   - Easy: 1 session every 2 days (45 min)

3. If deadline ≤ 2 days:
   - Multiple sessions per day

4. If deadline ≤ 7 days:
   - Double frequency

5. Calculate sessions needed:
   - Total minutes / session duration

6. Distribute across days evenly

Output: Array of StudySession objects
```

**Example**:
```
Task: "Hard Biology Exam" (5 hours, due in 3 days)
→ 5 hrs = 300 minutes
→ 60 min sessions = 5 sessions needed
→ 3 days available + high density = 1-2 sessions/day spread
→ Schedule: Mon (2 sessions), Tue (2), Wed (1)
```

---

## 🛠️ Common Tasks

### Adding a new Subject Icon
1. Edit `src/types/index.ts`
2. Add to `Subject` type
3. Add to `SUBJECT_ICONS` object
4. Update quick add parsing logic

### Integrating EmailJS
1. Install: `npm install @emailjs/browser`
2. Add to `src/components/Friends.tsx` in sendFriendInvite
3. Configure with EmailJS service ID, template ID, user ID

### Connecting to Real Leaderboard
1. Query profiles table with order by total_study_hours
2. Replace SEED_USERS in Friends.tsx
3. Add friend relationship checking via friends table

### Adding New Types
1. Create in `src/types/index.ts`
2. Export and use throughout
3. Update Supabase schema if needed

---

## 🧪 Testing the Features

### Test 1: Quick Add
- [ ] Type "Math homework due tomorrow"
- [ ] Select "Assignment" and "Medium"
- [ ] Verify task created
- [ ] Verify study sessions appear in Today's Schedule

### Test 2: Timer
- [ ] Click StudyTimer
- [ ] Set 1 minute
- [ ] Click Start, verify countdown
- [ ] Test Pause, Resume, Reset

### Test 3: File Upload
- [ ] Create a text file with "Physics exam March 30"
- [ ] Drag to upload section
- [ ] Watch progress
- [ ] Verify task created

### Test 4: Today's Schedule
- [ ] Create multiple tasks
- [ ] Verify all appear in Today's Schedule
- [ ] Click checkbox to mark complete
- [ ] Verify visual change

### Test 5: Friends
- [ ] View leaderboard
- [ ] Add a friend
- [ ] Verify friend status updates

### Test 6: Analytics
- [ ] Create study sessions
- [ ] Complete tasks
- [ ] View Analytics page
- [ ] Verify stats calculate correctly

### Test 7: Settings
- [ ] Change leaderboard visibility
- [ ] Click Sign Out
- [ ] Verify redirect to auth

---

## 🐛 Debugging

### Timer not persisting
- Check localStorage in DevTools → Application → Local Storage
- Clear and refresh if needed

### Tasks not appearing in Today's Schedule
- Open DevTools → Network
- Check Supabase API calls
- Verify user_id matches
- Check filter for today's date

### Auto-scheduler not triggering
- Verify useStudyScheduler hook is called
- Check Supabase insert results
- Look for console errors

### File upload stuck
- Check file size (max 10MB)
- Check file type (PDF, image, text only)
- Look at network tab for failed requests

---

## 📞 Support

For issues or questions, check:
1. Console for error messages
2. Network tab for API failures
3. Supabase dashboard for data issues
4. This guide for common problems

---

## 📝 Next Steps

Future enhancements:
- [ ] EmailJS integration for friend invites
- [ ] Real AI parsing with OpenAI API
- [ ] Advanced calendar view with drag-drop
- [ ] Study notifications/reminders
- [ ] Pomodoro timer integration
- [ ] Export study data/reports
- [ ] Dark mode toggle
- [ ] Mobile app version
- [ ] Study groups feature
- [ ] Performance analytics

---

**StudyMap AI is ready to go! 🚀**
