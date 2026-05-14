import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are a university syllabus parser. Extract ALL assignments, exams, quizzes and assessments from the following syllabus text. Return ONLY a JSON array with no markdown or backticks in this exact format:
[
  {
    "title": "Assignment 1 — Supply & Demand Analysis",
    "type": "Assignment",
    "dueDate": "2025-09-26",
    "weight": "8%",
    "estimatedHours": 3
  }
]
For estimatedHours use this logic: assignment = 2-4 hours, essay = 3-5 hours, exam = 8-15 hours based on weight, quiz = 1-2 hours. Return dates in YYYY-MM-DD format. If no year is specified assume the current academic year. Type must be one of: Assignment, Exam, Quiz, Project, Other.`;

export default async function handler(req: any, res: any) {
  console.log("[parse-syllabus] function invoked, method:", req.method);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { content } = req.body;
  console.log("[parse-syllabus] content present:", !!content, "| type:", typeof content, "| length:", typeof content === "string" ? content.length : "n/a");

  if (!content || typeof content !== "string" || !content.trim()) {
    console.error("[parse-syllabus] content missing or empty — PDF text extraction likely failed client-side");
    return res.status(400).json({ error: "content is required" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  console.log("[parse-syllabus] GEMINI_API_KEY present:", !!apiKey);

  if (!apiKey) {
    console.error("[parse-syllabus] GEMINI_API_KEY is not set in environment");
    return res.status(500).json({ error: "GEMINI_API_KEY not configured", tasks: [] });
  }

  const truncated = content.slice(0, 40000);
  console.log("[parse-syllabus] sending to Gemini, truncated length:", truncated.length, "| first 200 chars:", truncated.slice(0, 200));

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    systemInstruction: SYSTEM_PROMPT,
  });

  try {
    console.log("[parse-syllabus] calling Gemini generateContent...");
    const result = await model.generateContent(truncated);
    const responseText = result.response.text();
    console.log("[parse-syllabus] Gemini raw response length:", responseText.length, "| first 500 chars:", responseText.slice(0, 500));

    // Strip any accidental markdown code fences
    const cleaned = responseText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    console.log("[parse-syllabus] cleaned response (first 500 chars):", cleaned.slice(0, 500));

    try {
      const tasks = JSON.parse(cleaned);
      if (Array.isArray(tasks)) {
        console.log("[parse-syllabus] parsed", tasks.length, "tasks successfully");
        return res.status(200).json({ tasks });
      }
      console.error("[parse-syllabus] parsed JSON is not an array:", typeof tasks);
      return res.status(200).json({ tasks: [], error: "AI returned non-array" });
    } catch (parseErr: any) {
      console.error("[parse-syllabus] JSON.parse failed:", parseErr?.message, "| cleaned text:", cleaned.slice(0, 300));
      return res
        .status(200)
        .json({ tasks: [], error: "Could not parse AI response" });
    }
  } catch (err: any) {
    console.error("[parse-syllabus] Gemini API call failed:", err?.message);
    console.error("[parse-syllabus] full error:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
    return res
      .status(500)
      .json({ error: "Failed to parse syllabus", tasks: [] });
  }
}
