import { useEffect, useRef, useState } from "react";
import { Upload, FileIcon, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { addDays } from "date-fns";
import { parseQuickAdd, generateStudyPlan, cleanTaskTitle, parseSyllabusContent, TaskTypeKey } from "@/lib/studyUtils";
import { useTaskContext } from "@/context/TaskContext";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "uploading" | "processing" | "success" | "error";
  error?: string;
}

interface ParsedReviewTask {
  id: string;
  title: string;
  type: "assignment" | "exam" | "quiz";
  dueDate: string;
  suggestedHours: number;
  difficulty: "easy" | "medium" | "hard";
  weight?: number;
  subject: string;
  sourceFile: string;
}

function mapSubjectKeyToSubject(key: string): string {
  switch (key.toLowerCase()) {
    case "math":
      return "math";
    case "biology":
      return "biology";
    case "physics":
      return "physics";
    case "chemistry":
      return "chemistry";
    case "english":
      return "english";
    case "history":
      return "history";
    case "art":
      return "art";
    default:
      return "other";
  }
}

function mapParsedType(taskType: TaskTypeKey): "assignment" | "exam" | "quiz" {
  switch (taskType) {
    case "Exam":
      return "exam";
    case "Quiz":
      return "quiz";
    default:
      return "assignment";
  }
}

function formatDateInput(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().split("T")[0];
  }
  return date.toISOString().split("T")[0];
}

/**
 * Read file content as text
 * For text files, reads directly
 * For other types, extracts from filename as fallback
 */
async function readFileContent(file: File): Promise<string> {
  if (file.type === "text/plain" || file.name.endsWith(".txt")) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || "");
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }

  // For non-text files, fall back to filename
  return file.name.replace(/\.[^/.]+$/, "");
}

export function FileUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rawFilesRef = useRef<Map<string, File>>(new Map());
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [reviewTasks, setReviewTasks] = useState<ParsedReviewTask[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const { addTask, tasks } = useTaskContext();

  useEffect(() => {
    if (!isReviewOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow || "auto";
    };
  }, [isReviewOpen]);

  const ALLOWED_TYPES = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "text/plain",
  ];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadedFile[] = [];
    const fileIndices: number[] = [];

    // Validate and add files
    Array.from(selectedFiles).forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not supported. Please upload PDF, images, or text files.`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large. Maximum size is 10MB.`);
        return;
      }

      const uploadedFile: UploadedFile = {
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: "uploading",
      };
      
      newFiles.push(uploadedFile);
      // Store raw file for later processing
      rawFilesRef.current.set(file.name, file);
    });

    if (newFiles.length === 0) return;

    setFiles((prev) => {
      const combined = [...prev, ...newFiles];
      newFiles.forEach((_, i) => {
        fileIndices.push(combined.length - newFiles.length + i);
      });
      return combined;
    });
    setIsUploadOpen(true);

    const parsedReviewItems: ParsedReviewTask[] = [];

    // Process each file and collect parsed review tasks.
    for (let i = 0; i < newFiles.length; i++) {
      const rawFile = rawFilesRef.current.get(newFiles[i].name);
      if (rawFile) {
        const fileTasks = await processFile(newFiles[i], i + files.length, rawFile);
        parsedReviewItems.push(...fileTasks);
      }
    }

    if (parsedReviewItems.length > 0) {
      setReviewTasks((prev) => [...prev, ...parsedReviewItems]);
      setIsReviewOpen(true);
    } else {
      toast(`No tasks were detected from the uploaded files.`, {
        description: "Review the file content or try a different upload.",
      });
    }
  };

  const processFile = async (file: UploadedFile, index: number, rawFile: File): Promise<ParsedReviewTask[]> => {
    try {
      // Simulate uploading
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        setFiles((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], progress };
          return updated;
        });
      }

      // Update to processing
      setFiles((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: "processing", progress: 100 };
        return updated;
      });

      // Read file content and simulate analysis
      const fileContent = await readFileContent(rawFile);
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Parse syllabus content to extract tasks
      const parsedTasks = parseSyllabusContent(fileContent);
      const reviewItems: ParsedReviewTask[] = [];

      if (parsedTasks.length === 0) {
        // Fallback: extract from filename if no tasks found
        const filenameKey = rawFile.name.replace(/\.[^/.]+$/, "");
        const parsed = parseQuickAdd(filenameKey, "", "");
        const subject = parsed.subject || "Other";
        const taskTitle = cleanTaskTitle(parsed.title || filenameKey);
        const dueDate = parsed.date || formatDateInput(addDays(new Date(), 5));

        reviewItems.push({
          id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
          title: taskTitle,
          type: mapParsedType(parsed.type),
          dueDate,
          suggestedHours: 5,
          difficulty: "medium",
          weight: undefined,
          subject: subject,
          sourceFile: file.name,
        });
      } else {
        for (const taskEntry of parsedTasks) {
          reviewItems.push({
            id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
            title: taskEntry.title,
            type: mapParsedType(taskEntry.type),
            dueDate: formatDateInput(taskEntry.dueDate),
            suggestedHours: taskEntry.estimatedHours,
            difficulty: "medium",
            weight: undefined,
            subject: mapSubjectKeyToSubject(taskEntry.subject),
            sourceFile: file.name,
          });
        }
      }

      setFiles((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: "success" };
        return updated;
      });

      return reviewItems;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to process file";
      console.error("Error processing file:", error);
      setFiles((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          status: "error",
          error: errorMessage,
        };
        return updated;
      });
      toast.error(`Failed to process ${rawFile.name}`);
      return [];
    }
  };

  const updateReviewTask = (id: string, updates: Partial<ParsedReviewTask>) => {
    setReviewTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...updates } : task))
    );
  };

  const totalReviewHours = reviewTasks.reduce((sum, task) => sum + task.suggestedHours, 0);

  const handleGenerateStudyPlan = async () => {
    if (reviewTasks.length === 0) {
      toast.error("No parsed tasks available to generate a study plan.");
      return;
    }

    for (const task of reviewTasks) {
      const taskId = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

      const studySessions = generateStudyPlan({
        subject: task.subject,
        totalHours: task.suggestedHours,
        dueDate: task.dueDate,
        title: task.title,
        difficulty: task.difficulty,
      });

      // Check if study plan starts later than today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (studySessions.length > 0) {
        const firstSessionDate = new Date(studySessions[0].date);
        if (firstSessionDate > today) {
          toast.info(`📅 Study plan for "${task.title}" will begin on ${firstSessionDate.toLocaleDateString()}.`, {
            description: "Sessions are scheduled to start 14 days before the due date.",
          });
        }
      }

      await addTask({
        id: taskId,
        title: task.title,
        subject: task.subject,
        type: task.type,
        totalHours: task.suggestedHours,
        dueDate: new Date(task.dueDate),
        difficulty: task.difficulty,
        weight: task.weight,
        completed: false,
        studySessions: studySessions.map((session) => ({
          id: session.id,
          taskId,
          title: session.title,
          duration: session.duration,
          date: new Date(session.date),
          completed: false,
        })),
      });

      console.log("🔧 File Upload: New task created", { newTask: task, allTasks: tasks });
    }

    setIsReviewOpen(false);
    setIsUploadOpen(false);
    setReviewTasks([]);
    setFiles([]);

    toast.success(`Study plan generated for ${reviewTasks.length} task${reviewTasks.length > 1 ? "s" : ""}.`, {
      description: `${totalReviewHours} total hours were distributed across ${reviewTasks.length} tasks.`,
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const fileName = prev[index]?.name;
      if (fileName) {
        rawFilesRef.current.delete(fileName);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  };

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return "📄";
    if (type.includes("image")) return "🖼️";
    if (type.includes("text")) return "📝";
    return "📎";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <>
      {/* Upload Card */}
      <div className="studymap-card-elevated">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Upload Files</h3>
        </div>

        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-6 cursor-pointer transition-colors hover:border-primary hover:bg-primary/5"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.txt"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />

          <div className="text-center">
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, images, or text files (max 10MB)
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          📎 Upload assignment PDFs, lecture notes, or images to automatically parse and create tasks.
        </p>
      </div>

      {/* Upload Status Modal */}
      <AnimatePresence>
        {isUploadOpen && files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-black/50 flex items-end z-50"
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full bg-background rounded-t-lg shadow-lg p-6 max-h-[50vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">
                  Upload Status
                </h3>
                <button
                  onClick={() => {
                    if (files.every((f) => f.status === "success" || f.status === "error")) {
                      setIsUploadOpen(false);
                    }
                  }}
                  className="text-muted-foreground hover:text-foreground"
                  disabled={!files.every((f) => f.status === "success" || f.status === "error")}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {files.map((file, i) => (
                  <motion.div
                    key={file.name + i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border/50"
                  >
                    {/* File Icon */}
                    <span className="text-xl flex-shrink-0 mt-1">
                      {getFileIcon(file.type)}
                    </span>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>

                      {/* Progress Bar */}
                      {(file.status === "uploading" || file.status === "processing") && (
                        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${file.progress}%` }}
                            className="h-full bg-primary rounded-full"
                          />
                        </div>
                      )}

                      {/* Status Message */}
                      {file.status === "processing" && (
                        <p className="text-xs text-primary mt-1">Analyzing with AI...</p>
                      )}
                      {file.status === "error" && (
                        <p className="text-xs text-destructive mt-1">{file.error}</p>
                      )}
                    </div>

                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {file.status === "uploading" && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                      {file.status === "processing" && (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      )}
                      {file.status === "success" && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                      {file.status === "error" && (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      )}
                    </div>

                    {/* Remove */}
                    {(file.status === "error" || file.status === "success") && (
                      <button
                        onClick={() => removeFile(i)}
                        className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>

              {files.every((f) => f.status === "success" || f.status === "error") && (
                <Button
                  onClick={() => setIsUploadOpen(false)}
                  className="w-full mt-4"
                >
                  Done
                </Button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review & Customize Modal */}
      <AnimatePresence>
        {isReviewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-lg flex flex-col"
            >
              <div className="p-6 border-b shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-primary">Review Your Study Plan</p>
                    <h2 className="mt-2 text-2xl font-semibold text-foreground">Customize your workload before scheduling</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Review parsed tasks, update due dates, difficulty, estimated hours, and then generate a smarter schedule.</p>
                  </div>
                  <button
                    onClick={() => setIsReviewOpen(false)}
                    className="rounded-full border border-border/70 bg-white p-2 text-muted-foreground transition hover:border-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="rounded-3xl border border-border/70 bg-muted/70 p-4 text-sm text-foreground">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-medium">Total Study Time:</span>
                    <span className="text-primary font-semibold">{totalReviewHours}h across {reviewTasks.length} task{reviewTasks.length === 1 ? "" : "s"}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {reviewTasks.map((task) => (
                    <div key={task.id} className="rounded-3xl border border-border/70 bg-background p-5 shadow-sm">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Task Name</label>
                          <Input
                            value={task.title}
                            onChange={(event) => updateReviewTask(task.id, { title: event.target.value })}
                            className="mt-2 w-full"
                          />
                        </div>

                        <div className="grid w-full max-w-sm gap-4 sm:grid-cols-2 lg:max-w-md">
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Due Date</label>
                            <Input
                              type="date"
                              value={task.dueDate}
                              onChange={(event) => updateReviewTask(task.id, { dueDate: event.target.value })}
                              className="mt-2 w-full"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Type</label>
                            <Select value={task.type} onValueChange={(value) => updateReviewTask(task.id, { type: value as ParsedReviewTask['type'] })}>
                              <SelectTrigger className="mt-2 w-full">
                                <SelectValue>{task.type}</SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="assignment">Assignment</SelectItem>
                                <SelectItem value="exam">Exam</SelectItem>
                                <SelectItem value="quiz">Quiz</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Estimated Time Required</label>
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              value={task.suggestedHours}
                              onChange={(event) => updateReviewTask(task.id, { suggestedHours: Number(event.target.value) })}
                              className="mt-2 w-full"
                            />
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {[2, 5, 10].map((hours) => (
                              <button
                                key={hours}
                                type="button"
                                onClick={() => updateReviewTask(task.id, { suggestedHours: hours })}
                                className={`rounded-full border px-3 py-2 text-sm transition ${task.suggestedHours === hours ? "border-primary bg-primary/10 text-primary" : "border-border bg-white text-foreground hover:border-primary"}`}
                              >
                                {hours}h
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => updateReviewTask(task.id, { suggestedHours: task.suggestedHours || 1 })}
                              className="rounded-full border border-border bg-white px-3 py-2 text-sm text-foreground hover:border-primary"
                            >
                              Custom
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Weight (% of grade)</label>
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              value={task.weight ?? ""}
                              onChange={(event) => updateReviewTask(task.id, { weight: event.target.value ? Number(event.target.value) : undefined })}
                              className="mt-2 w-full"
                              placeholder="Optional"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Difficulty</label>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(["easy", "medium", "hard"] as ParsedReviewTask["difficulty"][]).map((level) => (
                                <button
                                  key={level}
                                  type="button"
                                  onClick={() => updateReviewTask(task.id, { difficulty: level })}
                                  className={`rounded-full px-3 py-2 text-sm transition ${task.difficulty === level ? "border-primary bg-primary/10 text-primary" : "border-border bg-white text-foreground hover:border-primary"}`}
                                >
                                  {level.charAt(0).toUpperCase() + level.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="mt-4 text-xs text-muted-foreground">Source: {task.sourceFile}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t shrink-0 bg-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button variant="outline" onClick={() => setIsReviewOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleGenerateStudyPlan} className="bg-green-500 text-white hover:bg-green-600">
                  Generate Study Plan
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
