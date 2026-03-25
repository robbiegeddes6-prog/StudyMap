import { useState } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function QuickInput() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || loading) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-event", {
        body: { message: value.trim() },
      });

      if (error) throw error;

      if (data?.success && data?.parsed) {
        toast.success(`Added "${data.parsed.name}" to your ${data.parsed.type === "exam" ? "exams" : "assignments"}!`, {
          description: `Scheduled for ${new Date(data.parsed.datetime).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`,
        });
      } else {
        toast.error(data?.error || "Could not parse your input. Try being more specific.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process. Please try again.");
    } finally {
      setValue("");
      setLoading(false);
    }
  };

  return (
    <div className="studymap-card-elevated">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Quick Add</h3>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Try: "I have a lab on Tuesday at 2"`}
          className="flex-1"
          disabled={loading}
        />
        <Button type="submit" size="icon" disabled={!value.trim() || loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
}
