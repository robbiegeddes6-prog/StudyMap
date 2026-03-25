import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function QuickInput() {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    toast.info(`Processing: "${value}"`, {
      description: "AI will parse and add this to your schedule soon.",
    });
    setValue("");
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
        />
        <Button type="submit" size="icon" disabled={!value.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
