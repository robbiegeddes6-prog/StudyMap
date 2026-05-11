# File Parsing System - Examples

## How It Works

The `parseSyllabusContent()` function extracts tasks from syllabus text and creates separate study plans for each.

### Example 1: Basic Syllabus

**Input (e.g., syllabus.txt):**
```
May 25: Problem Set #1
June 18: Midterm Exam
July 5: Final Project
```

**Parsed Output:**
```javascript
[
  {
    title: "Problem Set #1",
    dueDate: Date(2026-05-25),
    type: "Assignment",
    subject: "Other",
    estimatedHours: 5
  },
  {
    title: "Midterm Exam",
    dueDate: Date(2026-06-18),
    type: "Exam",
    subject: "Other",
    estimatedHours: 12
  },
  {
    title: "Final Project",
    dueDate: Date(2026-07-05),
    type: "Project",
    subject: "Other",
    estimatedHours: 10
  }
]
```

**Result:**
- 3 separate tasks created in context
- Each with study sessions distributed from today → due date
- Sessions use weighted distribution (70% in last 30% of timeline)

---

### Example 2: With Subject Detection

**Input:**
```
April 20: Physics Midterm
April 25: Biology Lab Report
May 10: Math Final Exam
```

**Key Features:**
- `Physics Midterm` → type="Exam", subject="Physics", hours=12
- `Biology Lab Report` → type="Assignment", subject="Biology", hours=5
- `Math Final Exam` → type="Exam", subject="Math", hours=12

---

### Example 3: Various Date Formats

**Input:**
```
5/25: Quiz 3
June 18, 2026: Exam
07/15: Project Presentation
```

**Recognized Patterns:**
- Month Day: "May 25", "June 18", "April 10"
- Slash dates: "5/25", "6/18", "07/15"
- With text: "May 25: Task", "June 18 - Task", "April 10 (Task)"

---

## Type Detection

Automatically identifies task type based on text:

| Keywords | Type |
|----------|------|
| exam, midterm, final, comprehensive | Exam (12h) |
| quiz, pop quiz | Quiz (4h) |
| project, presentation, proposal | Project (10h) |
| problem set, homework, assignment, paper, essay, report | Assignment (5h) |
| case study, reading, chapter, review | Study (3h) |

---

## Subject Detection

Finds subjects in text:
- "Physics" → Physics
- "Bio", "Biology" → Biology
- "Math", "Calculus" → Math
- "Chem", "Chemistry" → Chemistry
- "English", "Language" → English
- "Computer Science", "CS" → Computer Science
- etc.

---

## How Study Sessions Are Created

For each task:
1. Parse date and name
2. Detect type (determines default hours)
3. Detect subject
4. Call `generateStudyPlan()` with:
   - Total hours (auto-estimated based on type)
   - Due date (parsed from text)
   - Title (extracted from line)
5. Sessions distributed:
   - 70% of work → last 30% of days
   - 30% of work → spread across earlier days
   - Minimum session: 30 mins
   - Maximum session: 8 hours

---

## Example: Full Flow

**File content:**
```
April 25: Math Problem Set #3
```

**Parsed entry:**
```javascript
{
  title: "Math Problem Set #3",
  dueDate: 2026-04-25,
  type: "Assignment",
  subject: "Math",
  estimatedHours: 5
}
```

**Generated sessions** (from today 2026-04-08 → due 2026-04-25 = 17 days):
```
2026-04-08: Light Math Problem Set #3 – 25m
2026-04-09: Study Math Problem Set #3 – 25m
2026-04-10: Study Math Problem Set #3 – 25m
... (lighter sessions early)
2026-04-21: Intensive Math Problem Set #3 – 1h
2026-04-22: Intensive Math Problem Set #3 – 1h 15m
2026-04-23: Intensive Math Problem Set #3 – 1h 30m
2026-04-24: Final Review Math Problem Set #3 – 2h
```

---

## No Grouping - Each Task is Independent

❌ **DOES NOT:**
- Group "Problem Set" + "Exam" into one task
- Label anything as "Other Assignment"
- Stack sessions near due date
- Double-count hours

✅ **DOES:**
- Create separate task for each line
- Preserve exact task names
- Generate proper session distribution
- Track each independently in context

---

## Implementation

```typescript
import { parseSyllabusContent } from "@/lib/studyUtils";

// In FileUpload.tsx:
const parsedTasks = parseSyllabusContent(fileContent);

// For each parsed task:
for (const taskEntry of parsedTasks) {
  const schedule = generateStudyPlan({
    subject: taskEntry.subject,
    totalHours: taskEntry.estimatedHours,
    dueDate: taskEntry.dueDate.toISOString().split("T")[0],
    title: taskEntry.title,
  });
  
  addTask({
    title: taskEntry.title,
    subject: mapSubjectKeyToSubject(taskEntry.subject),
    type: taskEntry.type.toLowerCase(),
    totalHours: taskEntry.estimatedHours,
    dueDate: taskEntry.dueDate,
    studySessions: schedule.map(s => ({...})),
  });
}
```

---

## Usage

1. **Upload a text file** with syllabus content
2. **Parser automatically:**
   - Extracts dates
   - Detects task names
   - Identifies types and subjects
   - Creates separate tasks
   - Generates study schedules
3. **Each task appears** in corresponding tab:
   - Exams → Exams tab
   - Assignments → Assignments tab
   - Projects → Assignments tab (with type indicator)
4. **Sessions visible** in Today's Schedule and Calendar
