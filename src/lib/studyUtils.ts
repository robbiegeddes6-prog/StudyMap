import { addDays, format, parse, parseISO, isValid, differenceInDays, isAfter, isBefore } from "date-fns";

export type SubjectKey = "Biology" | "Math" | "Physics" | "Chemistry" | "English" | "History" | "Art" | "Economics" | "Computer Science" | "Other";
export type TaskTypeKey = "Exam" | "Assignment" | "Quiz" | "Project" | "Study";
export type DifficultyKey = "Easy" | "Medium" | "Hard";
export type UrgencyLevel = "green" | "yellow" | "red";

export interface ParsedQuickAdd {
  subject: SubjectKey;
  type: TaskTypeKey;
  date: string; // YYYY-MM-DD
  title: string;
}

export interface AICoachSummary {
  missedSessions: number;
  completionRate: number;
  daysRemaining: number;
  adjustments: string[];
  message: string;
}

export interface TaskUrgency {
  taskId: string;
  level: UrgencyLevel;
  reason: string;
  daysRemaining: number;
  completionRate: number;
}

export interface SyllabusTaskEntry {
  title: string;
  dueDate: Date;
  type: TaskTypeKey;
  subject: SubjectKey;
  estimatedHours: number;
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  flipped: boolean;
  correct: number;
  incorrect: number;
}

const subjectMappings: Record<string, SubjectKey> = {
  biology: "Biology",
  bio: "Biology",
  math: "Math",
  calculus: "Math",
  physics: "Physics",
  phys: "Physics",
  chemistry: "Chemistry",
  chem: "Chemistry",
  english: "English",
  language: "English",
  history: "History",
  art: "Art",
  economics: "Economics",
  econ: "Economics",
  "computer science": "Computer Science",
  cs: "Computer Science",
};

const typeMappings: Record<string, TaskTypeKey> = {
  exam: "Exam",
  midterm: "Exam",
  final: "Exam",
  test: "Exam",
  quiz: "Quiz",
  assignment: "Assignment",
  paper: "Assignment",
  "problem set": "Assignment",
  homework: "Assignment",
  project: "Project",
  study: "Study",
};

const subjectAbbrev: Record<SubjectKey, string> = {
  Biology: "Bio",
  Math: "Math",
  Physics: "Physics",
  Chemistry: "Chem",
  English: "English",
  History: "History",
  Art: "Art",
  Economics: "Econ",
  "Computer Science": "CS",
  Other: "Other",
};

const difficultyIntensity: Record<DifficultyKey, "low" | "medium" | "high"> = {
  Easy: "low",
  Medium: "medium",
  Hard: "high",
};

function normalizeText(input: string) {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

const roundToTen = (minutes: number): number => Math.round(minutes / 10) * 10;

function formatDateISO(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Clean task title by preserving user input.
 * Only use fallback if input is empty or parsing fails completely.
 * 
 * Rules:
 * - Preserve exact user input if provided
 * - Remove placeholder names like "Other Study" or "Other Assignment"
 * - Capitalize first letter properly
 * - Return "Study Task" only if absolutely empty
 */
export function cleanTaskTitle(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "Study Task";
  }

  // Don't accept generic placeholders
  if (trimmed.toLowerCase() === "other study" || 
      trimmed.toLowerCase() === "other assignment" ||
      trimmed.toLowerCase() === "other") {
    return "Study Task";
  }

  // Preserve user input, just capitalize properly
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return capitalized;
}

/**
 * Extract date from a string that may contain multiple formats
 * Examples:
 * - "May 25: Problem Set #1" → 2026-05-25
 * - "June 18 - Midterm" → 2026-06-18
 * - "April 10 (Final)" → 2026-04-10
 */
function extractDateFromLine(line: string): Date | null {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Pattern 1: Month Day with separators (May 25:, June 18 -, April 10,)
  const monthDayPattern = /([A-Za-z]{3,9})\s+(\d{1,2})(?:\s*[:|-]|$|\s|\(|,)/;
  const match = line.match(monthDayPattern);
  
  if (match) {
    const monthStr = match[1];
    const dayStr = match[2];
    
    try {
      // Try parsing with month abbreviation
      const dateStr = `${monthStr} ${dayStr} ${currentYear}`;
      const parsed = parse(dateStr, "MMM d yyyy", new Date());
      
      if (isValid(parsed)) {
        // If parsed date is in the past, assume next year
        if (isBefore(parsed, now)) {
          return addDays(parsed, 365);
        }
        return parsed;
      }
      
      // Try full month name
      const parsed2 = parse(dateStr, "MMMM d yyyy", new Date());
      if (isValid(parsed2)) {
        if (isBefore(parsed2, now)) {
          return addDays(parsed2, 365);
        }
        return parsed2;
      }
    } catch (e) {
      // Continue to next pattern
    }
  }

  // Pattern 2: Slash dates (4/25, 6/18, 04/10)
  const slashPattern = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/;
  const slashMatch = line.match(slashPattern);
  
  if (slashMatch) {
    const month = parseInt(slashMatch[1], 10);
    const day = parseInt(slashMatch[2], 10);
    const year = slashMatch[3] ? parseInt(slashMatch[3], 10) : currentYear;
    
    const fullYear = year < 100 ? year + 2000 : year;
    const parsed = new Date(fullYear, month - 1, day);
    
    if (isValid(parsed)) {
      if (isBefore(parsed, now)) {
        return addDays(parsed, 365);
      }
      return parsed;
    }
  }

  return null;
}

/**
 * Detect task type from text content
 * Examples:
 * - "Problem Set" → "Assignment"
 * - "Midterm Exam" → "Exam"
 * - "Quiz 3" → "Quiz"
 * - "Project Paper" → "Project"
 */
function detectTaskTypeFromText(text: string): TaskTypeKey {
  const lower = text.toLowerCase();

  if (/(exam|midterm|final|comprehensive)/i.test(lower)) {
    return "Exam";
  }
  if (/(quiz|pop quiz)/i.test(lower)) {
    return "Quiz";
  }
  if (/(project|presentation|proposal)/i.test(lower)) {
    return "Project";
  }
  if (/(problem set|homework|assignment|paper|essay|report|submission)/i.test(lower)) {
    return "Assignment";
  }
  if (/(case study|reading|chapter|review)/i.test(lower)) {
    return "Study";
  }

  return "Assignment"; // Default fallback
}

/**
 * Detect subject from text content
 * Examples:
 * - "Physics Midterm" → "Physics"
 * - "Math Problem Set" → "Math"
 */
function detectSubjectFromText(text: string): SubjectKey {
  const lower = text.toLowerCase();

  for (const [key, value] of Object.entries(subjectMappings)) {
    if (new RegExp(`\\b${key}\\b`, "i").test(text)) {
      return value;
    }
  }

  return "Other";
}

/**
 * Estimate hours based on task type
 */
function estimateHoursForType(type: TaskTypeKey): number {
  switch (type) {
    case "Exam":
      return 12; // Major exams need more study time
    case "Project":
      return 10;
    case "Quiz":
      return 4;
    case "Study":
      return 3;
    case "Assignment":
    default:
      return 5;
  }
}

/**
 * Parse syllabus or assignment text and extract tasks
 * 
 * Example input:
 * "May 25: Problem Set #1
 *  June 18: Midterm Exam
 *  July 5: Final Project"
 * 
 * Returns array of separate task entries, each with:
 * - title (preserved from input)
 * - dueDate (parsed from text)
 * - type (detected: Exam, Assignment, Quiz, Project, Study)
 * - subject (detected from content)
 * - estimatedHours (based on type)
 */
export function parseSyllabusContent(content: string): SyllabusTaskEntry[] {
  if (!content.trim()) {
    return [];
  }

  const tasks: SyllabusTaskEntry[] = [];
  
  // Split by lines and filter empty lines
  const lines = content
    .split(/\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  for (const line of lines) {
    // Skip lines that don't look like task entries
    if (line.length < 5) continue;

    // Try to extract date
    const dueDate = extractDateFromLine(line);
    if (!dueDate) continue;

    // Extract task name (everything after the date part)
    // Remove date patterns from the beginning
    let taskName = line;
    
    // Remove month day pattern
    taskName = taskName.replace(/[A-Za-z]{3,9}\s+\d{1,2}\s*[:|-]?\s*/i, "");
    // Remove slash date pattern
    taskName = taskName.replace(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*[:|-]?\s*/i, "");
    // Clean up remaining separators
    taskName = taskName.replace(/^[\s\-:|,]+/, "").trim();

    if (!taskName) continue;

    // Detect type and subject
    const type = detectTaskTypeFromText(taskName);
    const subject = detectSubjectFromText(taskName);
    const estimatedHours = estimateHoursForType(type);

    // Use cleanTaskTitle to preserve the exact task name
    const cleanedTitle = cleanTaskTitle(taskName);

    tasks.push({
      title: cleanedTitle,
      dueDate,
      type,
      subject,
      estimatedHours,
    });
  }

  return tasks;
}

export function parseQuickAdd(input: string, type: string, difficulty: string): ParsedQuickAdd {
  const normalized = normalizeText(input);

  // extract subject
  let subject: SubjectKey = "Other";
  for (const key of Object.keys(subjectMappings)) {
    const regex = new RegExp(`\\b${key}\\b`, "i");
    if (regex.test(input)) {
      subject = subjectMappings[key];
      break;
    }
  }

  // extract type
  let taskType: TaskTypeKey = "Assignment";
  for (const key of Object.keys(typeMappings)) {
    const regex = new RegExp(`\\b${key}\\b`, "i");
    if (regex.test(input)) {
      taskType = typeMappings[key];
      break;
    }
  }

  // external override from selector
  if (type) {
    const normalizedType = type.trim().toLowerCase();
    const mapping = Object.entries(typeMappings).find(([k]) => k.toLowerCase() === normalizedType);
    if (mapping) {
      taskType = mapping[1];
    }
  }

  // date extraction
  const taskDate = parseDateFromText(input);

  // Always preserve user input as title, don't use generic fallbacks
  const title = cleanTaskTitle(input);

  return {
    subject,
    type: taskType,
    date: taskDate,
    title,
  };
}

function parseDateFromText(text: string): string {
  const lower = text.toLowerCase();
  const now = new Date();

  if (lower.includes("today")) return formatDateISO(now);
  if (lower.includes("tomorrow")) return formatDateISO(addDays(now, 1));

  const daysMatch = lower.match(/in (\\d{1,3}) days?/i);
  if (daysMatch) {
    const num = parseInt(daysMatch[1], 10);
    if (!isNaN(num)) return formatDateISO(addDays(now, num));
  }

  if (lower.includes("next week")) return formatDateISO(addDays(now, 7));
  if (lower.includes("this week")) return formatDateISO(addDays(now, 3));

  // explicit date phrases: April 3rd, Mar 15, 2026, 4/3
  const explicitDateRegex = /(?:on\s*)?([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
  const explicit = text.match(explicitDateRegex);
  if (explicit) {
    const month = explicit[1];
    const day = explicit[2];
    const year = explicit[3] ? explicit[3] : String(now.getFullYear());

    const dateString = `${month} ${day} ${year}`;
    const parsed = parse(dateString, "MMMM d yyyy", new Date());
    if (isValid(parsed)) {
      return formatDateISO(parsed);
    }

    const parsed2 = parse(dateString, "MMM d yyyy", new Date());
    if (isValid(parsed2)) return formatDateISO(parsed2);
  }

  const slashDateRegex = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/;
  const slashMatch = text.match(slashDateRegex);
  if (slashMatch) {
    const month = parseInt(slashMatch[1], 10);
    const day = parseInt(slashMatch[2], 10);
    let year = slashMatch[3] ? parseInt(slashMatch[3], 10) : now.getFullYear();
    if (year < 100) year += 2000;
    const parsed = new Date(year, month - 1, day);
    if (isValid(parsed)) return formatDateISO(parsed);
  }

  // default fallback
  return formatDateISO(addDays(now, 7));
}

export interface StudySession {
  id: string;
  taskId?: string;
  subject: SubjectKey;
  title: string;
  duration: number; // minutes
  date: string; // YYYY-MM-DD
}

export interface StudySessionPlan {
  date: string; // YYYY-MM-DD
  duration: number; // minutes
  subject: SubjectKey;
  intensity: "low" | "medium" | "high";
  taskTitle?: string;
}

/**
 * Generate study plan with proper session distribution.
 * Distribution:
 * - Spread across available days (limited by daysBeforeStart and spreadDays)
 * - Increasing intensity closer to due date
 * - One session per day, with duration increasing
 * - If late (few days), compress into longer sessions
 */
export function generateStudyPlan(task: {
  subject: SubjectKey;
  totalHours: number;
  dueDate: string | Date;
  title?: string;
  difficulty?: DifficultyKey | "easy" | "medium" | "hard";
  daysBeforeStart?: number;
  spreadDays?: number;
}): StudySession[] {
  const subject = task.subject || "Other";
  const totalHours = task.totalHours || 4; // Default to 4 hours
  const normalizedDifficulty = typeof task.difficulty === "string"
    ? task.difficulty.toLowerCase()
    : "medium";
  const difficulty = normalizedDifficulty === "hard" ? "Hard" : normalizedDifficulty === "easy" ? "Easy" : "Medium";

  // Parse due date.
  const rawDueDate = typeof task.dueDate === "string" ? parseISO(task.dueDate) : task.dueDate;
  if (!isValid(rawDueDate)) {
    console.warn("generateStudyPlan: Invalid due date", task.dueDate);
    return [];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(rawDueDate);
  dueDate.setHours(0, 0, 0, 0);

  // If due date passed, treat as today to maintain plan visibility.
  const normalizedDueDate = isBefore(dueDate, today) ? today : dueDate;

  const windowDays = task.daysBeforeStart ?? 14;
  const earliestStartDate = new Date(normalizedDueDate);
  earliestStartDate.setDate(earliestStartDate.getDate() - windowDays);

  const startDate = new Date(Math.max(today.getTime(), earliestStartDate.getTime()));

  const daysDiff = differenceInDays(normalizedDueDate, startDate);
  const rawDaysAvailable = Math.max(1, daysDiff + 1);
  const daysAvailable = task.spreadDays
    ? Math.min(rawDaysAvailable, task.spreadDays)
    : rawDaysAvailable;

  // Calculate total minutes and guard against non-positive values.
  const totalMinutes = Math.max(0, Math.round(totalHours * 60));
  if (totalMinutes === 0) return [];

  // If due date is near, use the aggressive scheduler.
  if (daysAvailable <= 3) {
    return generateAggressiveDistribution(subject, totalMinutes, daysAvailable, startDate, task.title, difficulty);
  }

  // Weighted distribution across all available days (today -> due date) for far deadlines.
  // Use 70/30 rule: 70% of sessions in last 30% of timeline
  const weights: number[] = [];
  const cutoffIndex = Math.max(1, Math.ceil(daysAvailable * 0.3));
  
  for (let dayIndex = 0; dayIndex < daysAvailable; dayIndex++) {
    let weight = 0;
    if (dayIndex < daysAvailable - cutoffIndex) {
      // Early 70% days get 30% of weight (light distribution)
      weight = 0.3 / Math.max(1, daysAvailable - cutoffIndex);
      if (difficulty === "Hard") {
        weight *= 0.95;
      } else if (difficulty === "Easy") {
        weight *= 1.05;
      }
    } else {
      // Last 30% days get 70% of weight (heavy distribution)
      weight = 0.7 / cutoffIndex;
      if (difficulty === "Hard") {
        weight *= 1.15;
      } else if (difficulty === "Easy") {
        weight *= 0.9;
      }
    }
    weights.push(weight);
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const sessions: StudySession[] = [];
  let minutesAllocated = 0;

  // Calculate initial session minutes based on 70/30 weights (preserve exact distribution)
  const sessionMinutesArray: number[] = [];
  for (let dayIndex = 0; dayIndex < daysAvailable; dayIndex++) {
    const weight = weights[dayIndex];
    const baseMinutes = (totalMinutes * weight) / totalWeight;
    sessionMinutesArray.push(baseMinutes);
    minutesAllocated += baseMinutes;
  }

  // Apply a slight difficulty-based intensity adjustment to the final distribution.
  if (difficulty === "Hard") {
    for (let dayIndex = 0; dayIndex < sessionMinutesArray.length; dayIndex++) {
      if (dayIndex >= daysAvailable - cutoffIndex) {
        sessionMinutesArray[dayIndex] *= 1.08;
      }
    }
  } else if (difficulty === "Easy") {
    for (let dayIndex = 0; dayIndex < sessionMinutesArray.length; dayIndex++) {
      if (dayIndex < daysAvailable - cutoffIndex) {
        sessionMinutesArray[dayIndex] *= 1.02;
      }
    }
  }

  // Distribute remaining minutes due to rounding (maintain total hours exactly)
  const roundedTotal = sessionMinutesArray.reduce((sum, m) => sum + Math.floor(m), 0);
  const remainder = totalMinutes - roundedTotal;
  
  // Add remainder to day with largest fractional part to minimize rounding error
  if (remainder > 0) {
    let maxFractional = 0;
    let maxIndex = 0;
    for (let dayIndex = 0; dayIndex < daysAvailable; dayIndex++) {
      const fractional = sessionMinutesArray[dayIndex] - Math.floor(sessionMinutesArray[dayIndex]);
      if (fractional > maxFractional) {
        maxFractional = fractional;
        maxIndex = dayIndex;
      }
    }
    sessionMinutesArray[maxIndex] += remainder;
  }

  // Create sessions from calculated minutes
  for (let dayIndex = 0; dayIndex < daysAvailable; dayIndex++) {
    const sessionDate = addDays(startDate, dayIndex);
    let sessionMinutes = Math.round(sessionMinutesArray[dayIndex]);

    // Enforce minimum session duration
    if (sessionMinutes < 30 && sessionMinutes > 0) {
      sessionMinutes = 30;
    }

    // Skip zero-duration sessions
    if (sessionMinutes <= 0) continue;

    // Cap at maximum reasonable session length
    sessionMinutes = Math.min(sessionMinutes, 8 * 60);

    const intensity = getIntensityForDay(dayIndex, daysAvailable);
    const baseTitle = task.title || "Study Session";
    const intensityLabel = getIntensityLabel(intensity);
    let title = `${intensityLabel} ${baseTitle}`;

    if (dayIndex === 0) {
      title = `Start ${baseTitle}`;
    } else if (dayIndex === daysAvailable - 1) {
      title = `Final Review ${baseTitle}`;
    }

    const durationDisplay = formatSessionDuration(sessionMinutes);
    title += ` – ${durationDisplay}`;

    sessions.push({
      id: `session-${Date.now()}-${dayIndex}`,
      subject,
      title,
      duration: roundToTen(sessionMinutes),
      date: formatDateISO(sessionDate),
    });
  }

  // Guarantee at least one session today for urgent tasks (due today/tomorrow).
  if (differenceInDays(normalizedDueDate, startDate) <= 1 && sessions.length > 0) {
    const hasToday = sessions.some((s) => s.date === formatDateISO(startDate));
    if (!hasToday) {
      const firstSession = sessions[0];
      const minutesToMove = Math.min(60, firstSession.duration - 30);
      if (minutesToMove > 0) {
        firstSession.duration -= minutesToMove;
        sessions.unshift({
          id: `session-${Date.now()}-urgent-${0}`,
          subject,
          title: `Urgent Start ${task.title || "Study Session"} – ${formatSessionDuration(minutesToMove)}`,
          duration: roundToTen(minutesToMove),
          date: formatDateISO(startDate),
        });
      } else {
        sessions.unshift({
          id: `session-${Date.now()}-urgent-${0}`,
          subject,
          title: `Urgent Start ${task.title || "Study Session"} – 30m`,
          duration: 30,
          date: formatDateISO(startDate),
        });
      }
    }
  }

  return sessions;
}

/**
 * Generate aggressive distribution for close due dates (≤ 3 days)
 */
function generateAggressiveDistribution(
  subject: SubjectKey,
  totalMinutes: number,
  daysAvailable: number,
  startDate: Date,
  taskTitle?: string,
  difficulty: "Easy" | "Medium" | "Hard" = "Medium"
): StudySession[] {
  const sessions: StudySession[] = [];
  let minutesRemaining = totalMinutes;

  // For close due dates, distribute heavily with immediate intensity
  const weights: number[] = [];
  for (let dayIndex = 0; dayIndex < daysAvailable; dayIndex++) {
    const progress = daysAvailable === 1 ? 1 : dayIndex / (daysAvailable - 1);
    const baseWeight = 1.0;
    const endWeight = 3.2;
    let weight = baseWeight + (endWeight - baseWeight) * Math.pow(progress, 1.4);
    if (difficulty === "Hard") {
      weight *= 1 + progress * 0.2;
    } else if (difficulty === "Easy") {
      weight *= 1 - progress * 0.05;
    }
    weights.push(weight);
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  for (let dayIndex = 0; dayIndex < daysAvailable && minutesRemaining > 0; dayIndex++) {
    const sessionDate = addDays(startDate, dayIndex);
    const weight = weights[dayIndex];
    let sessionMinutes = Math.floor((totalMinutes * weight) / totalWeight);

    sessionMinutes = Math.max(45, Math.min(sessionMinutes, 8 * 60));

    if (dayIndex === daysAvailable - 1) {
      sessionMinutes = minutesRemaining;
    } else {
      sessionMinutes = Math.min(sessionMinutes, minutesRemaining);
    }

    minutesRemaining -= sessionMinutes;

    if (sessionMinutes <= 0) continue;

    const baseTitle = taskTitle || "Study Session";
    const intensity = getIntensityForDay(dayIndex, daysAvailable);
    let title = `${getIntensityLabel(intensity)} ${baseTitle}`;

    if (dayIndex === 0) {
      title = `Start ${baseTitle}`;
    } else if (dayIndex === daysAvailable - 1) {
      title = `Final Cram ${baseTitle}`;
    }

    const durationDisplay = formatSessionDuration(sessionMinutes);
    title += ` – ${durationDisplay}`;

    sessions.push({
      id: `session-aggressive-${Date.now()}-${dayIndex}`,
      subject,
      title,
      duration: roundToTen(sessionMinutes),
      date: formatDateISO(sessionDate),
    });
  }

  return sessions;
}

/**
 * Get intensity level for a specific day
 */
function getIntensityForDay(dayIndex: number, totalDays: number): "low" | "medium" | "high" {
  const progress = dayIndex / (totalDays - 1);

  if (progress < 0.4) return "low";
  if (progress < 0.8) return "medium";
  return "high";
}

/**
 * Get intensity multiplier for session duration
 */
function getIntensityMultiplier(intensity: "low" | "medium" | "high"): number {
  switch (intensity) {
    case "low": return 0.8;    // 80% of proportional time
    case "medium": return 1.0; // 100% of proportional time
    case "high": return 1.3;   // 130% of proportional time
    default: return 1.0;
  }
}

/**
 * Get intensity label for session title
 */
function getIntensityLabel(intensity: "low" | "medium" | "high"): string {
  switch (intensity) {
    case "low": return "Light";
    case "medium": return "Study";
    case "high": return "Intensive";
    default: return "Study";
  }
}

/**
 * Centralized study schedule generator for all task types
 * Standardizes task input and generates sessions with proper titles
 */
export function generateStudySchedule(task: {
  id: string;
  title: string;
  type: string;
  dueDate: Date | string;
  totalHours: number;
  difficulty?: DifficultyKey | "easy" | "medium" | "hard";
  daysBeforeStart?: number;
  spreadDays?: number;
}): Array<{
  id: string;
  taskId: string;
  title: string;
  duration: number; // minutes
  date: Date;
  completed: boolean;
}> {
  // Safe guards
  if (!task || !task.dueDate) {
    console.warn("generateStudySchedule: Invalid task data", task);
    return [];
  }

  const title = task.title || "Study Session";

  // Map to subject key (using "other" as default)
  const subject: SubjectKey = "Other";

  // Convert dueDate to string if needed
  let dueDateStr: string;
  try {
    dueDateStr = typeof task.dueDate === "string" ? task.dueDate : formatDateISO(task.dueDate);
  } catch (error) {
    console.warn("generateStudySchedule: Invalid due date", task.dueDate);
    return [];
  }

  const plan = generateStudyPlan({
    subject,
    totalHours: task.totalHours,
    dueDate: dueDateStr,
    title,
    difficulty: task.difficulty,
    daysBeforeStart: task.daysBeforeStart,
    spreadDays: task.spreadDays,
  });

  // Convert to standardized session objects
  return plan?.map((session) => ({
    id: session.id,
    taskId: task.id,
    title: session.title || `Study ${title} – ${(session.duration / 60).toFixed(1)}h`,
    duration: roundToTen(session.duration),
    date: new Date(session.date),
    completed: false,
  })) || [];
}

/**
 * Calculate urgency level for a task based on completion rate and time remaining
 */
export function calculateTaskUrgency(
  task: { dueDate: Date; studySessions: Array<{ completed: boolean; date: Date }> },
  today: Date = new Date()
): TaskUrgency {
  const daysRemaining = differenceInDays(task.dueDate, today);
  const totalSessions = task.studySessions.length;
  const completedSessions = task.studySessions.filter(s => s.completed).length;
  const completionRate = totalSessions > 0 ? completedSessions / totalSessions : 0;

  let level: UrgencyLevel = "green";
  let reason = "On track";

  if (daysRemaining < 0) {
    level = "red";
    reason = "Overdue";
  } else if (daysRemaining <= 1) {
    level = "red";
    reason = "Due soon";
  } else if (daysRemaining <= 3) {
    if (completionRate < 0.7) {
      level = "red";
      reason = "Behind schedule";
    } else if (completionRate < 0.9) {
      level = "yellow";
      reason = "Moderate pressure";
    }
  } else if (daysRemaining <= 7) {
    if (completionRate < 0.5) {
      level = "red";
      reason = "Significantly behind";
    } else if (completionRate < 0.8) {
      level = "yellow";
      reason = "Moderate pressure";
    }
  } else {
    if (completionRate < 0.3) {
      level = "yellow";
      reason = "Getting behind";
    }
  }

  return {
    taskId: "", // Will be set by caller
    level,
    reason,
    daysRemaining,
    completionRate
  };
}

/**
 * Generate AI Coach summary and recommendations
 */
export function generateAICoachSummary(
  tasks: Array<{ 
    id: string; 
    title: string; 
    dueDate: Date; 
    studySessions: Array<{ completed: boolean; date: Date }> 
  }>,
  today: Date = new Date()
): AICoachSummary {
  let totalMissedSessions = 0;
  let totalSessions = 0;
  let totalCompleted = 0;
  const adjustments: string[] = [];

  tasks.forEach(task => {
    const pastSessions = task.studySessions.filter(s => isBefore(s.date, today) || 
      (s.date.toDateString() === today.toDateString() && !s.completed));
    
    totalSessions += pastSessions.length;
    const completedPast = pastSessions.filter(s => s.completed).length;
    totalCompleted += completedPast;
    totalMissedSessions += pastSessions.length - completedPast;

    const urgency = calculateTaskUrgency(task, today);
    if (urgency.level === "red") {
      adjustments.push(`Increase study time for ${task.title}`);
    } else if (urgency.level === "yellow") {
      adjustments.push(`Monitor progress on ${task.title}`);
    }
  });

  const completionRate = totalSessions > 0 ? totalCompleted / totalSessions : 1;
  const avgDaysRemaining = tasks.length > 0 
    ? tasks.reduce((sum, task) => sum + differenceInDays(task.dueDate, today), 0) / tasks.length 
    : 0;

  let message = "";
  if (totalMissedSessions > 0) {
    message = `You missed ${totalMissedSessions} session${totalMissedSessions > 1 ? 's' : ''}, schedule has been adjusted`;
  } else if (completionRate > 0.9) {
    message = "Great progress! You're ahead of schedule";
  } else if (completionRate > 0.7) {
    message = "Good progress, keep it up!";
  } else {
    message = "Consider increasing your study time";
  }

  return {
    missedSessions: totalMissedSessions,
    completionRate,
    daysRemaining: Math.max(0, Math.round(avgDaysRemaining)),
    adjustments,
    message
  };
}

/**
 * Redistribute missed sessions across remaining days
 */
export function redistributeMissedSessions(
  task: { 
    id: string; 
    title: string; 
    dueDate: Date; 
    studySessions: Array<{ id: string; completed: boolean; date: Date; duration: number; title: string }> 
  },
  today: Date = new Date()
): Array<{ id: string; taskId: string; title: string; duration: number; date: Date; completed: boolean }> {
  const missedSessions = task.studySessions.filter(s => 
    (isBefore(s.date, today) || s.date.toDateString() === today.toDateString()) && !s.completed
  );

  if (missedSessions.length === 0) return task.studySessions;

  const daysRemaining = Math.max(1, differenceInDays(task.dueDate, today));
  const sessionsPerDay = Math.ceil(missedSessions.length / daysRemaining);
  
  const redistributed: Array<{ id: string; taskId: string; title: string; duration: number; date: Date; completed: boolean }> = [];
  let sessionIndex = 0;

  // Keep completed sessions as-is
  task.studySessions.filter(s => s.completed).forEach(s => redistributed.push(s));

  // Redistribute missed sessions
  for (let day = 0; day < daysRemaining && sessionIndex < missedSessions.length; day++) {
    const targetDate = addDays(today, day);
    
    for (let i = 0; i < sessionsPerDay && sessionIndex < missedSessions.length; i++) {
      const session = missedSessions[sessionIndex];
      redistributed.push({
        ...session,
        date: targetDate,
        title: `${session.title} (Rescheduled)`
      });
      sessionIndex++;
    }
  }

  return redistributed;
}

/**
 * Format session duration in a user-friendly way
 */
export function formatSessionDuration(minutes: number): string {
  if (minutes < 60) {
    // Round to nearest 5 minutes for display
    const rounded = Math.round(minutes / 5) * 5;
    return `${rounded} min`;
  } else {
    const hours = Math.round(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    } else if (remainingMinutes <= 15) {
      return `${hours}h`;
    } else if (remainingMinutes <= 45) {
      return `${hours}.5h`;
    } else {
      return `${hours + 1}h`;
    }
  }
}

/**
 * Parse flashcard text with Q: and A: markers
 * 
 * Format:
 * Q: question text
 * A: answer text
 * 
 * Supports multiple Q/A pairs separated by newlines.
 * Ensures question and answer are properly separated and clean.
 * 
 * Example:
 * Input: "Q: What is GDP formula?\nA: Y = C + I + G + NX"
 * Output: [{question: "What is GDP formula?", answer: "Y = C + I + G + NX", ...}]
 */
export function parseFlashcards(rawText: string): Flashcard[] {
  if (!rawText.trim()) {
    return [];
  }

  const flashcards: Flashcard[] = [];

  // Strategy 1: Split by Q: and A: markers
  // Look for patterns like Q: ... A: ... Q: ...
  const qaPattern = /Q\s*:\s*(.+?)(?=A\s*:|Q\s*:|$)/gis;
  const matches = Array.from(rawText.matchAll(qaPattern));

  if (matches.length > 0) {
    // Successfully found Q: patterns
    for (const match of matches) {
      const questionText = match[1].trim();
      if (!questionText) continue;

      // Find the corresponding A: section
      const matchEnd = match.index! + match[0].length;
      const afterQuestion = rawText.substring(matchEnd);
      const answerMatch = afterQuestion.match(/A\s*:\s*(.+?)(?=Q\s*:|$)/is);

      if (answerMatch) {
        const answerText = answerMatch[1].trim();
        if (!answerText) continue;

        // Clean up: ensure answer doesn't contain question
        const cleanQuestion = questionText.replace(/A\s*:[\s\S]*$/i, "").trim();
        const cleanAnswer = answerText.replace(/Q\s*:[\s\S]*$/i, "").trim();

        if (cleanQuestion && cleanAnswer) {
          flashcards.push({
            id: `flashcard-${Date.now()}-${flashcards.length}`,
            question: cleanQuestion,
            answer: cleanAnswer,
            flipped: false,
            correct: 0,
            incorrect: 0,
          });
        }
      }
    }
  }

  // Strategy 2: Fallback - split by double newlines (for paragraph format)
  if (flashcards.length === 0) {
    const paragraphs = rawText.split(/\n\n+/).filter(p => p.trim().length > 0);

    for (const para of paragraphs) {
      const lines = para.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);

      if (lines.length >= 2) {
        // Assume first line(s) = question, rest = answer
        const question = lines[0];
        const answer = lines.slice(1).join(" ");

        if (question && answer) {
          flashcards.push({
            id: `flashcard-${Date.now()}-${flashcards.length}`,
            question,
            answer,
            flipped: false,
            correct: 0,
            incorrect: 0,
          });
        }
      }
    }
  }

  // Strategy 3: Fallback - split sentences (worst case)
  if (flashcards.length === 0) {
    const sentences = rawText
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 5);

    // Pair them up: 1st = Q, 2nd = A, 3rd = Q, 4th = A, etc.
    for (let i = 0; i < sentences.length - 1; i += 2) {
      if (i + 1 < sentences.length) {
        flashcards.push({
          id: `flashcard-${Date.now()}-${i}`,
          question: sentences[i],
          answer: sentences[i + 1],
          flipped: false,
          correct: 0,
          incorrect: 0,
        });
      }
    }
  }

  return flashcards;
}
