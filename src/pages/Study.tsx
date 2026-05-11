import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PRO_MONTHLY_PRICE } from "@/lib/config";

// ─── Toast ──────────────────────────────────────────────────────────────────
interface Toast { id: number; msg: string; type: string }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((msg: string, type = "success") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return { toasts, toast };
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          padding: "11px 18px", borderRadius: 10, fontSize: 13.5, fontWeight: 500,
          background: t.type === "error" ? "#fef2f2" : "#f0fdf4",
          color: t.type === "error" ? "#b91c1c" : "#15803d",
          border: `1px solid ${t.type === "error" ? "#fecaca" : "#bbf7d0"}`,
          boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
          animation: "smFadeIn 0.2s ease",
        }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── Parser ─────────────────────────────────────────────────────────────────
interface Flashcard {
  id: string;
  question: string;
  answer: string;
  streak: number;
  difficulty?: "easy" | "medium" | "hard";
}

function parseCards(raw: string): Flashcard[] {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const cards: Flashcard[] = [];
  let q: string | null = null;
  for (const line of lines) {
    if (/^Q:/i.test(line)) {
      q = line.replace(/^Q:\s*/i, "");
    } else if (/^A:/i.test(line) && q !== null) {
      const a = line.replace(/^A:\s*/i, "");
      if (q && a) cards.push({ id: `${Date.now()}-${Math.random()}`, question: q, answer: a, streak: 0 });
      q = null;
    }
  }
  return cards;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ─── Types ───────────────────────────────────────────────────────────────────
type AnswerState = "correct" | "wrong" | "dim" | null;

interface TestQuestion {
  question: string;
  options: string[];
  correct: string;
  selected: string | null;
}

interface ExpertQuestion {
  question: string;
  options: string[];
  correctIdx: number;
  selected: number | null;
  explanation: string;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  teal:      "#5bb5a0",
  tealLight: "#edf7f5",
  text:      "#111827",
  muted:     "#6b7280",
  light:     "#9ca3af",
  border:    "#e5e7eb",
  card:      "#ffffff",
  green:     "#16a34a",
  greenBg:   "#f0fdf4",
  greenBdr:  "#bbf7d0",
  yellow:    "#d97706",
  red:       "#dc2626",
  redBg:     "#fef2f2",
  redBdr:    "#fecaca",
};

const cardStyle: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: "22px 24px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

// ─── Primitives ───────────────────────────────────────────────────────────────
type BtnVariant = "primary" | "outline" | "ghost" | "green" | "yellow" | "red";

function Btn({
  children, onClick, disabled, variant = "outline", size = "md", full, style = {},
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: BtnVariant;
  size?: "md" | "lg";
  full?: boolean;
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: size === "lg" ? "11px 22px" : "8px 16px",
    borderRadius: 8, fontSize: size === "lg" ? 14 : 13.5, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1,
    transition: "filter 0.12s", border: "none", fontFamily: "inherit",
    width: full ? "100%" : undefined,
  };
  const variants: Record<BtnVariant, React.CSSProperties> = {
    primary: { background: C.teal,        color: "#fff" },
    outline: { background: "#fff",        color: C.text, border: `1px solid ${C.border}` },
    ghost:   { background: "transparent", color: C.muted },
    green:   { background: C.green,       color: "#fff" },
    yellow:  { background: C.yellow,      color: "#fff" },
    red:     { background: C.red,         color: "#fff" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

function SmBadge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "3px 11px",
      borderRadius: 999, fontSize: 11.5, fontWeight: 700,
      background: C.tealLight, color: C.teal,
    }}>
      {children}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{ height: 5, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
      <div style={{
        height: "100%", borderRadius: 999, background: C.teal,
        width: `${Math.min(100, Math.max(0, value))}%`,
        transition: "width 0.35s ease",
      }} />
    </div>
  );
}

function FlipCard({ front, back, flipped, onClick, height = 230 }: {
  front: React.ReactNode;
  back: React.ReactNode;
  flipped: boolean;
  onClick: () => void;
  height?: number;
}) {
  return (
    <div onClick={onClick} style={{ perspective: "1200px", cursor: "pointer", width: "100%" }}>
      <div style={{
        position: "relative", width: "100%", height,
        transformStyle: "preserve-3d",
        transition: "transform 0.45s cubic-bezier(0.4,0,0.2,1)",
        transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
      }}>
        <div style={{
          ...cardStyle, position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          textAlign: "center", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
          userSelect: "none",
        }}>
          {front}
        </div>
        <div style={{
          ...cardStyle, position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          textAlign: "center", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          background: C.tealLight, borderColor: C.teal + "55",
          userSelect: "none",
        }}>
          {back}
        </div>
      </div>
    </div>
  );
}

function AnswerBtn({ label, onClick, state }: {
  label: string;
  onClick: () => void;
  state: AnswerState;
}) {
  const bg  = state === "correct" ? C.greenBg  : state === "wrong" ? C.redBg  : "#fff";
  const bdr = state === "correct" ? C.greenBdr : state === "wrong" ? C.redBdr : C.border;
  const clr = state === "correct" ? C.green    : state === "wrong" ? C.red    : C.text;
  return (
    <button
      onClick={onClick}
      disabled={state !== null}
      style={{
        ...cardStyle, padding: "14px 18px", width: "100%",
        textAlign: "left", cursor: state !== null ? "not-allowed" : "pointer",
        background: bg, borderColor: bdr, color: clr,
        fontFamily: "inherit", fontSize: 13.5,
        fontWeight: state === "correct" ? 600 : 400,
        opacity: state === "dim" ? 0.4 : 1,
        transition: "background 0.18s, border-color 0.18s",
      }}
    >
      {label}
    </button>
  );
}

function ProModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.32)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{ ...cardStyle, maxWidth: 420, width: "100%", position: "relative", padding: 32 }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 14, right: 14, background: "none",
          border: "none", fontSize: 18, cursor: "pointer", color: C.light, lineHeight: 1,
        }}>×</button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 22 }}>✨</span>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Upgrade to StudyMap Pro</h2>
        </div>
        <p style={{ margin: "0 0 18px", color: C.muted, fontSize: 13.5 }}>Unlock the full StudyMap experience:</p>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 11 }}>
          {[
            ["🔓", "Unlimited study sets"],
            ["👥", "Share sets with classmates"],
            ["🤖", "AI-generated cards from uploaded PDFs"],
            ["📊", "Progress analytics & weak-card tracking"],
            ["📅", "Calendar sync for exam scheduling"],
          ].map(([icon, text]) => (
            <li key={text} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}>
              <span style={{ fontSize: 17 }}>{icon}</span> {text}
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Btn variant="primary" full size="lg">✨ Upgrade to Pro — $7.99/mo</Btn>
          <Btn variant="ghost" full onClick={onClose}>Maybe later</Btn>
        </div>
      </div>
    </div>
  );
}

function ResultScreen({ icon, title, score, total, items, onRetry, onBack }: {
  icon: string;
  title: string;
  score: number;
  total: number;
  items: React.ReactNode;
  onRetry: () => void;
  onBack: () => void;
}) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  return (
    <div style={{ ...cardStyle, padding: 36, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 10 }}>{icon}</div>
      <h3 style={{ margin: "0 0 4px", fontSize: 21, fontWeight: 700 }}>{title}</h3>
      <p style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>
        {score} / {total}
        <span style={{ fontSize: 13, fontWeight: 400, color: C.muted, marginLeft: 8 }}>({pct}%)</span>
      </p>
      <p style={{ margin: "0 0 22px", fontSize: 13, fontWeight: 600, color: pct >= 70 ? C.green : C.red }}>
        {pct >= 90 ? "Excellent! 🔥" : pct >= 70 ? "Good job! 👍" : "Keep practicing 💪"}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left", marginBottom: 24 }}>{items}</div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <Btn variant="primary" size="lg" onClick={onRetry}>Try Again</Btn>
        <Btn variant="outline" size="lg" onClick={onBack}>Back</Btn>
      </div>
    </div>
  );
}

// ─── Expert mode: dynamic scenario engine ────────────────────────────────────
// Works for any subject — biology, chemistry, history, economics, etc.

function extractTerm(question: string): string {
  return question
    .replace(/^(what is|what are|define|explain|describe|what does|what do|how does|who was|who were|what was|what were)\s+/i, "")
    .replace(/\?$/, "")
    .trim();
}

function extractEssence(answer: string): string {
  let text = answer.trim().replace(/[.!]+$/, "");
  // Strip common sentence starters so it reads naturally mid-sentence
  text = text.replace(/^(it is|this is|it refers to|they are|these are|this means|it means|it describes|it represents)\s+/i, "");
  // Lowercase first char for embedding in sentence templates
  if (text.length > 0) text = text.charAt(0).toLowerCase() + text.slice(1);
  // Hard-trim without splitting a word
  if (text.length > 85) text = text.substring(0, 85).replace(/\s+\S*$/, "") + "…";
  return text;
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Deterministic hash so the same card always gets the same template variant
function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0; }
  return Math.abs(h);
}

function buildScenario(term: string, answer: string): string {
  const essence = extractEssence(answer);
  const h = stableHash(term + answer);
  const variants = [
    `${cap(essence)}, demonstrating a clear instance of ${term}.`,
    `A student observes that ${essence} and correctly identifies this as ${term}.`,
    `In a real-world context, ${essence} — a textbook example of ${term}.`,
    `${cap(term)} is at work when we see that ${essence}.`,
    `A researcher documents how ${essence}, attributing the outcome to ${term}.`,
    `An instructor points to a situation where ${essence} to illustrate ${term}.`,
  ];
  return variants[h % variants.length];
}

function buildDistractor(term: string, otherAnswer: string): string {
  const essence = extractEssence(otherAnswer);
  const h = stableHash(term + otherAnswer);
  const variants = [
    `${cap(essence)}, which an observer mistakenly links to ${term}.`,
    `A scenario where ${essence} — superficially similar to ${term} but driven by a different mechanism.`,
    `${cap(essence)}, though the underlying principle is distinct from ${term}.`,
    `Someone applies ${term} to explain a case where ${essence}, but the reasoning doesn't hold.`,
  ];
  return variants[h % variants.length];
}

const TABS = [
  { key: "flashcards", icon: "📚", label: "Flashcards" },
  { key: "learn",      icon: "🎯", label: "Learn"      },
  { key: "test",       icon: "📝", label: "Test"       },
  { key: "expert",     icon: "✨", label: "Expert"     },
] as const;

type TabKey = typeof TABS[number]["key"];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Study() {
  const { toasts, toast } = useToast();

  const [tab, setTab]         = useState<TabKey>("flashcards");
  const [cards, setCards]     = useState<Flashcard[]>([]);
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [streak, setStreak]   = useState(0);
  const [rawInput, setRawInput] = useState("");
  const [generating, setGen]  = useState(false);
  const [showPro, setShowPro] = useState(false);

  const [learnQ, setLearnQ]   = useState<Flashcard[]>([]);
  const [learnFlip, setLF]    = useState(false);

  const [testQs, setTestQs]   = useState<TestQuestion[]>([]);
  const [testIdx, setTestIdx] = useState(0);
  const [testScore, setTS]    = useState(0);
  const [testDone, setTD]     = useState(false);

  const [expQs, setExpQs]     = useState<ExpertQuestion[]>([]);
  const [expIdx, setExpIdx]   = useState(0);
  const [expScore, setES]     = useState(0);
  const [expDone, setED]      = useState(false);

  // Persistence
  useEffect(() => {
    try {
      const s = localStorage.getItem("studyCards");
      if (s) setCards(JSON.parse(s));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem("studyCards", JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    setLearnQ([...cards]);
    setCardIdx(0);
    setFlipped(false);
    setLF(false);
    setTestQs([]);
    setExpQs([]);
    setTD(false);
    setED(false);
  }, [cards]);

  const currentCard = cards[cardIdx];
  const progress    = cards.length > 0 ? ((cardIdx + 1) / cards.length) * 100 : 0;

  const flipCard = useCallback(() => setFlipped((f) => !f), []);
  const nextCard = useCallback(() => {
    if (cardIdx < cards.length - 1) { setCardIdx((i) => i + 1); setFlipped(false); }
  }, [cardIdx, cards.length]);
  const prevCard = useCallback(() => {
    if (cardIdx > 0) { setCardIdx((i) => i - 1); setFlipped(false); }
  }, [cardIdx]);

  const rateCard = useCallback((diff: "easy" | "medium" | "hard") => {
    if (!currentCard) return;
    setStreak((s) => diff === "easy" ? s + 1 : diff === "medium" ? Math.max(0, s - 1) : 0);
    setCards((p) => p.map((c) => c.id === currentCard.id
      ? { ...c, difficulty: diff, streak: diff === "easy" ? c.streak + 1 : 0 }
      : c
    ));
    if (cardIdx < cards.length - 1) {
      setTimeout(() => { setCardIdx((i) => i + 1); setFlipped(false); }, 300);
    } else {
      toast("🎉 Study session complete!");
    }
  }, [currentCard, cardIdx, cards.length, toast]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (tab !== "flashcards" || !currentCard) return;
      if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); flipCard(); }
      if (e.code === "ArrowRight") { e.preventDefault(); nextCard(); }
      if (e.code === "ArrowLeft")  { e.preventDefault(); prevCard(); }
      if (e.key === "1") rateCard("easy");
      if (e.key === "2") rateCard("medium");
      if (e.key === "3") rateCard("hard");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [tab, currentCard, flipCard, nextCard, prevCard, rateCard]);

  const generate = async () => {
    if (!rawInput.trim()) { toast("Enter some text first.", "error"); return; }
    setGen(true);
    try {
      const parsed = parseCards(rawInput);
      if (!parsed.length) { toast("Use Q: / A: format on separate lines.", "error"); return; }
      setCards(parsed);
      setStreak(0);
      setRawInput("");
      toast(`✅ ${parsed.length} flashcard${parsed.length !== 1 ? "s" : ""} created!`);
    } finally {
      setGen(false);
    }
  };

  // ─── Test ─────────────────────────────────────────────────────────────────
  const buildTestQs = (all: Flashcard[]): TestQuestion[] =>
    all.map((c) => {
      const others = shuffle(all.filter((x) => x.answer !== c.answer).map((x) => x.answer)).slice(0, 3);
      return { question: c.question, options: shuffle([c.answer, ...others]), correct: c.answer, selected: null };
    });

  const startTest = () => {
    if (!cards.length) { toast("Create flashcards first.", "error"); return; }
    setTestQs(buildTestQs(cards));
    setTestIdx(0);
    setTS(0);
    setTD(false);
  };

  const handleTest = (opt: string) => {
    if (testQs[testIdx]?.selected) return;
    if (opt === testQs[testIdx].correct) setTS((s) => s + 1);
    setTestQs((p) => p.map((q, i) => i === testIdx ? { ...q, selected: opt } : q));
    if (testIdx < testQs.length - 1) {
      setTimeout(() => setTestIdx((i) => i + 1), 600);
    } else {
      setTimeout(() => setTD(true), 600);
    }
  };

  // ─── Expert ───────────────────────────────────────────────────────────────
  const buildExpQs = (all: Flashcard[]): ExpertQuestion[] =>
    all.map((card) => {
      const term    = extractTerm(card.question);
      const correct = buildScenario(term, card.answer);

      // Pull distractors from the other cards in the set — same subject domain,
      // so they're plausible but wrong.
      const otherCards = shuffle(all.filter((c) => c.id !== card.id));
      const distractors = otherCards.slice(0, 3).map((other) =>
        buildDistractor(term, other.answer)
      );

      // Pad to 3 if the deck has fewer than 4 cards total
      while (distractors.length < 3) {
        distractors.push(
          buildDistractor(term, `a process that looks similar to ${term} but follows different principles`)
        );
      }

      const options = shuffle([correct, ...distractors]);
      return {
        question:    `Which scenario best illustrates "${term}"?`,
        options,
        correctIdx:  options.indexOf(correct),
        selected:    null,
        explanation: `${cap(term)}: ${card.answer}`,
      };
    });

  const startExpert = () => {
    if (!cards.length) { toast("Create flashcards first.", "error"); return; }
    setExpQs(buildExpQs(cards));
    setExpIdx(0);
    setES(0);
    setED(false);
  };

  const handleExpert = (idx: number) => {
    if (expQs[expIdx]?.selected !== null) return;
    if (idx === expQs[expIdx].correctIdx) setES((s) => s + 1);
    setExpQs((p) => p.map((q, i) => i === expIdx ? { ...q, selected: idx } : q));
    if (expIdx < expQs.length - 1) {
      setTimeout(() => setExpIdx((i) => i + 1), 600);
    } else {
      setTimeout(() => setED(true), 600);
    }
  };

  // ─── Learn ────────────────────────────────────────────────────────────────
  const handleLearn = (diff: "easy" | "medium" | "hard") => {
    if (!learnQ.length) return;
    const [cur, ...rest] = learnQ;
    const q = [...rest];
    if (diff === "easy")   q.push(cur);
    if (diff === "medium") q.splice(Math.floor(q.length / 2), 0, cur);
    if (diff === "hard")   q.splice(Math.min(2, q.length), 0, cur);
    setLearnQ(q);
    setLF(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", border: `1px solid ${C.border}`,
    borderRadius: 10, fontSize: 13.5, outline: "none", resize: "none",
    fontFamily: "inherit", color: C.text, background: "#fafafa", lineHeight: 1.6,
    boxSizing: "border-box",
  };

  return (
    <DashboardLayout>
      <style>{`
        @keyframes smFadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .sm-study-root button:hover:not(:disabled) { filter: brightness(0.93); }
      `}</style>

      <div className="sm-study-root" style={{ maxWidth: 780, margin: "0 auto", paddingBottom: 60 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 8 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: "-0.4px" }}>Study</h1>
            <p style={{ margin: "5px 0 14px", color: C.muted, fontSize: 14 }}>Master your material with interactive flashcards</p>

            <button
              onClick={() => setShowPro(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "7px 14px", border: `1px solid ${C.border}`,
                borderRadius: 8, background: "#fff", color: C.muted,
                fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              📚 Create Multiple Study Sets
              <span style={{
                background: C.tealLight, color: C.teal,
                fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
              }}>PRO</span>
            </button>

            {cards.length > 0 && (
              <div style={{
                marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8,
                background: C.tealLight, borderRadius: 10, padding: "8px 14px",
              }}>
                <span style={{ fontSize: 13, color: C.teal, fontWeight: 600 }}>
                  📖 Your Study Set · {cards.length} card{cards.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          {cards.length > 0 && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Progress</div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{cardIdx + 1} / {cards.length}</div>
            </div>
          )}
        </div>

        {/* Progress + streak */}
        {cards.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <ProgressBar value={progress} />
            {streak > 0 && (
              <div style={{ marginTop: 6, fontSize: 13, color: "#ea580c", fontWeight: 500 }}>
                🔥 {streak}-card streak!
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `2px solid ${C.border}`, marginBottom: 28, overflowX: "auto" }}>
          {TABS.map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "10px 18px", border: "none", background: "none",
                borderBottom: tab === key ? `2.5px solid ${C.teal}` : "2.5px solid transparent",
                marginBottom: -2,
                color: tab === key ? C.teal : C.muted,
                fontSize: 13.5, fontWeight: tab === key ? 600 : 500,
                cursor: "pointer", whiteSpace: "nowrap",
                transition: "color 0.15s",
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* ─── FLASHCARDS ─────────────────────────────────────────────────── */}
        {tab === "flashcards" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {cards.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: "center", padding: "52px 32px" }}>
                <div style={{ fontSize: 52, marginBottom: 14, opacity: 0.3 }}>📚</div>
                <h3 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 700 }}>Create Your First Flashcard Deck</h3>
                <p style={{ color: C.muted, fontSize: 13.5, marginBottom: 22 }}>
                  Paste your notes and use Q: / A: format to generate interactive flashcards
                </p>
                <textarea
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  rows={7}
                  style={{ ...inputStyle, marginBottom: 14 }}
                  placeholder={"Paste your notes here. Use Q: / A: format:\n\nQ: What is the capital of France?\nA: Paris\n\nQ: What is 2 + 2?\nA: 4"}
                />
                <Btn
                  variant="primary" size="lg" full
                  disabled={!rawInput.trim() || generating}
                  onClick={generate}
                  style={{ background: C.teal, borderRadius: 10, fontSize: 14 }}
                >
                  {generating ? "Generating…" : "Generate Flashcards"}
                </Btn>
              </div>
            ) : (
              <>
                <FlipCard
                  flipped={flipped}
                  onClick={flipCard}
                  height={230}
                  front={
                    <>
                      <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.55, maxWidth: 500 }}>{currentCard?.question}</div>
                      <div style={{ fontSize: 12, color: C.light, marginTop: 14 }}>Click to reveal answer</div>
                    </>
                  }
                  back={
                    <>
                      <div style={{ fontSize: 16, lineHeight: 1.55, maxWidth: 500 }}>{currentCard?.answer}</div>
                      <div style={{ fontSize: 12, color: C.teal, marginTop: 14, fontWeight: 500 }}>How well did you know this?</div>
                    </>
                  }
                />

                <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                  <Btn variant="outline" onClick={prevCard} disabled={cardIdx === 0}>← Previous</Btn>
                  <Btn variant="outline" onClick={flipCard}>🔄 {flipped ? "Show Question" : "Show Answer"}</Btn>
                  <Btn variant="outline" onClick={nextCard} disabled={cardIdx === cards.length - 1}>Next →</Btn>
                </div>

                {flipped && (
                  <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                    <Btn variant="green"  size="lg" onClick={() => rateCard("easy")}>😊 Easy</Btn>
                    <Btn variant="yellow" size="lg" onClick={() => rateCard("medium")}>🤔 Medium</Btn>
                    <Btn variant="red"    size="lg" onClick={() => rateCard("hard")}>😵 Hard</Btn>
                  </div>
                )}

                <p style={{ textAlign: "center", fontSize: 12, color: C.light, margin: 0 }}>
                  💡 Space/Enter to flip · ← → to navigate · 1 / 2 / 3 to rate
                </p>

                <div style={{ ...cardStyle, borderStyle: "dashed", background: "#fafafa" }}>
                  <p style={{ margin: "0 0 10px", fontSize: 11.5, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Replace Study Set</p>
                  <textarea
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    rows={4}
                    style={{ ...inputStyle, marginBottom: 10 }}
                    placeholder="Paste new Q: / A: content…"
                  />
                  <Btn variant="outline" full disabled={!rawInput.trim() || generating} onClick={generate}>
                    {generating ? "Generating…" : "Replace Flashcards"}
                  </Btn>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── LEARN ──────────────────────────────────────────────────────── */}
        {tab === "learn" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {learnQ.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: "center", padding: "52px 32px" }}>
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>🎯</div>
                <h3 style={{ margin: "0 0 8px", fontSize: 19 }}>Learn Mode</h3>
                <p style={{ color: C.muted, fontSize: 13.5 }}>Generate flashcards first to start adaptive learning.</p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Learn Mode</h3>
                    <p style={{ margin: "3px 0 0", fontSize: 13, color: C.muted }}>Hard cards come back sooner. Easy cards move later.</p>
                  </div>
                  <SmBadge>Queue: {learnQ.length}</SmBadge>
                </div>

                <FlipCard
                  flipped={learnFlip}
                  onClick={() => setLF((f) => !f)}
                  height={220}
                  front={
                    <>
                      <div style={{ fontSize: 17, fontWeight: 600, maxWidth: 480 }}>{learnQ[0]?.question}</div>
                      <div style={{ fontSize: 12, color: C.light, marginTop: 14 }}>Tap to reveal</div>
                    </>
                  }
                  back={
                    <>
                      <div style={{ fontSize: 16, maxWidth: 480 }}>{learnQ[0]?.answer}</div>
                      <div style={{ fontSize: 12, color: C.teal, marginTop: 14, fontWeight: 500 }}>How well did you know it?</div>
                    </>
                  }
                />

                {learnFlip && (
                  <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                    <Btn variant="green"  size="lg" onClick={() => handleLearn("easy")}>😊 Easy</Btn>
                    <Btn variant="yellow" size="lg" onClick={() => handleLearn("medium")}>🤔 Medium</Btn>
                    <Btn variant="red"    size="lg" onClick={() => handleLearn("hard")}>😵 Hard</Btn>
                  </div>
                )}

                <p style={{ textAlign: "center", fontSize: 12, color: C.light }}>
                  Easy → back · Medium → middle · Hard → front
                </p>
              </>
            )}
          </div>
        )}

        {/* ─── TEST ───────────────────────────────────────────────────────── */}
        {tab === "test" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {testQs.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: "center", padding: "52px 32px" }}>
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>📝</div>
                <h3 style={{ margin: "0 0 8px", fontSize: 19 }}>Test Mode</h3>
                <p style={{ color: C.muted, fontSize: 13.5, marginBottom: 22 }}>Multiple-choice quiz from your flashcards.</p>
                {cards.length === 0
                  ? <p style={{ color: C.light, fontSize: 13 }}>Create flashcards first.</p>
                  : <Btn variant="primary" size="lg" style={{ background: C.teal }} onClick={startTest}>Start Quiz</Btn>
                }
              </div>
            ) : testDone ? (
              <ResultScreen
                icon="🎉"
                title="Quiz Complete!"
                score={testScore}
                total={testQs.length}
                onRetry={startTest}
                onBack={() => { setTestQs([]); setTD(false); }}
                items={testQs.map((q, i) => {
                  const wrong = q.selected !== q.correct;
                  return (
                    <div key={i} style={{ ...cardStyle, padding: 14, background: wrong ? C.redBg : C.greenBg, borderColor: wrong ? C.redBdr : C.greenBdr }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Q{i + 1}: {q.question}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: wrong ? C.red : C.green, whiteSpace: "nowrap" }}>
                          {wrong ? "✗ Wrong" : "✓ Correct"}
                        </span>
                      </div>
                      {wrong && <p style={{ margin: "5px 0 0", fontSize: 12, color: C.red }}>Correct: {q.correct}</p>}
                    </div>
                  );
                })}
              />
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Question {testIdx + 1} of {testQs.length}</p>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Test Mode</h3>
                  </div>
                  <SmBadge>Score: {testScore}</SmBadge>
                </div>
                <ProgressBar value={(testIdx / testQs.length) * 100} />
                <div style={{ ...cardStyle, padding: 22 }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{testQs[testIdx].question}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {testQs[testIdx].options.map((opt) => {
                    const sel = testQs[testIdx].selected;
                    const isSel = sel === opt;
                    const isOk = opt === testQs[testIdx].correct;
                    const state: AnswerState = !sel ? null : isSel ? (isOk ? "correct" : "wrong") : "dim";
                    return <AnswerBtn key={opt} label={opt} onClick={() => handleTest(opt)} state={state} />;
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── EXPERT ─────────────────────────────────────────────────────── */}
        {tab === "expert" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {expQs.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: "center", padding: "52px 32px" }}>
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>✨</div>
                <h3 style={{ margin: "0 0 8px", fontSize: 19 }}>Expert Mode</h3>
                <p style={{ color: C.muted, fontSize: 13.5, marginBottom: 22 }}>
                  Scenario-based questions that test deeper understanding, not just memorization.
                </p>
                {cards.length === 0
                  ? <p style={{ color: C.light, fontSize: 13 }}>Create flashcards first.</p>
                  : <Btn variant="primary" size="lg" style={{ background: C.teal }} onClick={startExpert}>Start Expert</Btn>
                }
              </div>
            ) : expDone ? (
              <ResultScreen
                icon="✨"
                title="Expert Complete!"
                score={expScore}
                total={expQs.length}
                onRetry={startExpert}
                onBack={() => { setExpQs([]); setED(false); }}
                items={expQs.map((q, i) => {
                  const ok = q.selected === q.correctIdx;
                  return (
                    <div key={i} style={{ ...cardStyle, padding: 14, background: ok ? C.greenBg : C.redBg, borderColor: ok ? C.greenBdr : C.redBdr }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Q{i + 1}: {q.question}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: ok ? C.green : C.red, whiteSpace: "nowrap" }}>
                          {ok ? "✓ Correct" : "✗ Incorrect"}
                        </span>
                      </div>
                      {!ok && <p style={{ margin: "5px 0 0", fontSize: 12, color: C.red }}>Correct: {q.options[q.correctIdx]}</p>}
                      <p style={{ margin: "5px 0 0", fontSize: 12, color: C.muted, fontStyle: "italic" }}>{q.explanation}</p>
                    </div>
                  );
                })}
              />
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Question {expIdx + 1} of {expQs.length}</p>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Expert Mode</h3>
                  </div>
                  <SmBadge>Score: {expScore}</SmBadge>
                </div>
                <ProgressBar value={(expIdx / expQs.length) * 100} />
                <div style={{ ...cardStyle, padding: 22 }}>
                  <p style={{ margin: "0 0 5px", fontSize: 16, fontWeight: 600 }}>{expQs[expIdx].question}</p>
                  <p style={{ margin: 0, fontSize: 12, color: C.light }}>Select the scenario that best matches the concept.</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {expQs[expIdx].options.map((opt, idx) => {
                    const sel = expQs[expIdx].selected;
                    const isSel = sel === idx;
                    const isOk = idx === expQs[expIdx].correctIdx;
                    const state: AnswerState = sel === null ? null : isSel ? (isOk ? "correct" : "wrong") : "dim";
                    return <AnswerBtn key={opt} label={opt} onClick={() => handleExpert(idx)} state={state} />;
                  })}
                </div>
                <p style={{ textAlign: "center", fontSize: 12, color: C.light }}>
                  Read each scenario carefully — these test deeper understanding.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <ProModal open={showPro} onClose={() => setShowPro(false)} />
      <ToastContainer toasts={toasts} />
    </DashboardLayout>
  );
}
