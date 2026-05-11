export type TaskType = 'assignment' | 'exam'

export type Task = {
  id?: string
  user_id: string
  title: string
  type: TaskType
  due_date: string
  estimated_hours: number
  created_at?: string
}

const TASKS_STORAGE_KEY = 'studybuddy_tasks'

// Helper function to get tasks from localStorage
function getStoredTasks(): Task[] {
  try {
    const stored = localStorage.getItem(TASKS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error reading tasks from localStorage:', error)
    return []
  }
}

// Helper function to save tasks to localStorage
function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks))
  } catch (error) {
    console.error('Error saving tasks to localStorage:', error)
  }
}

export async function createTask(task: Omit<Task, 'id' | 'created_at'>): Promise<Task> {
  const tasks = getStoredTasks()
  const newTask: Task = {
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...task,
    created_at: new Date().toISOString()
  }

  tasks.push(newTask)
  saveTasks(tasks)

  return newTask
}

export async function getTasks(): Promise<Task[]> {
  return getStoredTasks()
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  const tasks = getStoredTasks()
  const taskIndex = tasks.findIndex(task => task.id === id)

  if (taskIndex === -1) {
    return null
  }

  tasks[taskIndex] = { ...tasks[taskIndex], ...updates }
  saveTasks(tasks)

  return tasks[taskIndex]
}

export async function deleteTask(id: string): Promise<boolean> {
  const tasks = getStoredTasks()
  const filteredTasks = tasks.filter(task => task.id !== id)

  if (filteredTasks.length === tasks.length) {
    return false // Task not found
  }

  saveTasks(filteredTasks)
  return true
}
