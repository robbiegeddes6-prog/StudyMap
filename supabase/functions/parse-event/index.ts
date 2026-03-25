import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    const { message } = await req.json();
    if (!message) throw new Error("No message provided");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const today = new Date().toISOString().slice(0, 10);
    const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a student schedule parser. Today is ${dayOfWeek}, ${today}. Extract event details from natural language and return structured data. Always resolve relative dates like "Tuesday" to the next occurrence. Use 24-hour time format for the datetime.`,
          },
          { role: "user", content: message },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_event",
              description: "Create a calendar event from parsed natural language",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Event name/title" },
                  type: { type: "string", enum: ["exam", "assignment"], description: "Type of event" },
                  datetime: { type: "string", description: "ISO 8601 datetime string" },
                  subject: { type: "string", description: "Subject/course name if mentioned, otherwise 'General'" },
                  priority: { type: "string", enum: ["low", "medium", "high"], description: "Priority level" },
                },
                required: ["name", "type", "datetime", "subject", "priority"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_event" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI request failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured data");

    const parsed = JSON.parse(toolCall.function.arguments);

    let result;
    if (parsed.type === "exam") {
      const { data, error } = await supabase.from("exams").insert({
        name: parsed.name,
        subject: parsed.subject,
        exam_date: parsed.datetime,
        difficulty: "medium",
        user_id: user.id,
      }).select().single();
      if (error) throw error;
      result = { ...data, type: "exam" };
    } else {
      const { data, error } = await supabase.from("assignments").insert({
        name: parsed.name,
        due_date: parsed.datetime,
        priority: parsed.priority,
        user_id: user.id,
      }).select().single();
      if (error) throw error;
      result = { ...data, type: "assignment" };
    }

    return new Response(JSON.stringify({ success: true, event: result, parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-event error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
