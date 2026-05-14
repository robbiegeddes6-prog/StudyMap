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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { content } = req.body;
  if (!content || typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ error: "content is required" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured", tasks: [] });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  try {
    const result = await model.generateContent(content.slice(0, 40000));
    const responseText = result.response.text();

    // Strip any accidental markdown code fences
    const cleaned = responseText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    try {
      const tasks = JSON.parse(cleaned);
      if (Array.isArray(tasks)) {
        return res.status(200).json({ tasks });
      }
      return res.status(200).json({ tasks: [], error: "AI returned non-array" });
    } catch {
      return res
        .status(200)
        .json({ tasks: [], error: "Could not parse AI response" });
    }
  } catch (err: any) {
    console.error("Gemini API error:", err?.message);
    return res
      .status(500)
      .json({ error: "Failed to parse syllabus", tasks: [] });
  }
}
