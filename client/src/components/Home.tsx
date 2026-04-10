import { useState, useEffect, useCallback, useRef, ReactElement } from "react";
import confetti from "canvas-confetti";
import Weather from "./Weather";
import "./Home.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

// --- Types ---
interface HomeProps {
  weatherCity?: string;
  currentUser?: {
    id?: string | number;
    username?: string;
    name?: string;
  } | null;
  pomodoroTime?: number;
  isRunning?: boolean;
  isWorkSession?: boolean;
  fullScreenPomodoro?: boolean;
  workDuration?: number;
  breakDuration?: number;
  setPomodoroTime?: (value: number) => void;
  setFullScreenPomodoro?: (value: boolean) => void;
  setWorkDuration?: (value: number) => void;
  setBreakDuration?: (value: number) => void;
  handlePomodoroToggle?: () => void;
  handlePomodoroReset?: () => void;
  handlePomodoroSkip?: () => void;
}

interface Note {
  id: string;
  title?: string;
  content?: string;
  lastModified?: number;
  isPinned?: boolean;
  noteType?: "text" | "code";
  language?: string;
}

interface Task {
  id: string;
  _clientId?: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
}

interface Countdown {
  id: string;
  label: string;
  targetDate: string;
}

interface SessionRecord {
  startedAt: number;
  duration: number;
  type: "work" | "break";
}

interface FocusStats {
  todaySessions: number;
  todayMinutes: number;
  weekSessions: number;
  weekMinutes: number;
}

type WidgetId =
  | "today"
  | "pinned"
  | "recent"
  | "recent-code"
  | "tasks"
  | "quick-note"
  | "quick-actions"
  | "focus-stats"
  | "countdowns"
  | "pomodoro";

interface WidgetConfig {
  id: WidgetId;
  label: string;
  visible: boolean;
  size: "full" | "half";
}

const DEFAULT_WIDGET_CONFIG: WidgetConfig[] = [
  // Row 1: today(1) + quick-actions(2) = 3
  { id: "today", label: "Today", visible: true, size: "half" },
  { id: "quick-actions", label: "Quick Actions", visible: true, size: "full" },
  // Row 2: pinned(1) + recent(1) + recent-code(1) = 3
  { id: "pinned", label: "Pinned Notes", visible: true, size: "half" },
  { id: "recent", label: "Recent Notes", visible: true, size: "half" },
  { id: "recent-code", label: "Recent Code", visible: true, size: "half" },
  // Row 3: tasks(1) + quick-note(1) + countdowns(1) = 3
  { id: "tasks", label: "Tasks", visible: true, size: "half" },
  { id: "quick-note", label: "Quick Note", visible: true, size: "half" },
  { id: "countdowns", label: "Countdowns", visible: true, size: "half" },
  // Row 4: focus-stats(2) + pomodoro(1) = 3
  { id: "focus-stats", label: "Focus Stats", visible: true, size: "full" },
  { id: "pomodoro", label: "Pomodoro Timer", visible: true, size: "half" },
];

const WIDGET_CONFIG_KEY = "home:widget-config-v2";
const COUNTDOWNS_KEY = "countdowns:items";
const FOCUS_SESSIONS_KEY = "focusStats:sessions";

const normalizeWidgetConfig = (input: unknown): WidgetConfig[] => {
  if (!Array.isArray(input)) return DEFAULT_WIDGET_CONFIG;

  const defaultById = new Map(DEFAULT_WIDGET_CONFIG.map((w) => [w.id, w]));
  const seen = new Set<WidgetId>();
  const normalized: WidgetConfig[] = [];

  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const maybeId = (raw as { id?: unknown }).id;
    if (typeof maybeId !== "string") continue;
    if (!defaultById.has(maybeId as WidgetId)) continue;
    if (seen.has(maybeId as WidgetId)) continue;

    const def = defaultById.get(maybeId as WidgetId)!;
    normalized.push({
      id: def.id,
      label: def.label,
      visible: (raw as { visible?: unknown }).visible !== false,
      size: (raw as { size?: unknown }).size === "full" ? "full" : "half",
    });
    seen.add(def.id);
  }

  for (const def of DEFAULT_WIDGET_CONFIG) {
    if (!seen.has(def.id)) normalized.push(def);
  }

  return normalized;
};

const normalizeCountdowns = (input: unknown): Countdown[] => {
  if (!Array.isArray(input)) return [];
  const validDate = /^\d{4}-\d{2}-\d{2}$/;
  const out: Countdown[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const raw = item as { id?: unknown; label?: unknown; targetDate?: unknown };
    const label =
      typeof raw.label === "string" ? raw.label.trim().slice(0, 80) : "";
    const targetDate =
      typeof raw.targetDate === "string" ? raw.targetDate.trim() : "";
    if (!label || !validDate.test(targetDate)) continue;
    const id =
      typeof raw.id === "string" && raw.id.trim()
        ? raw.id
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    out.push({ id, label, targetDate });
    if (out.length >= 100) break;
  }
  return out;
};

const normalizeFocusSessions = (input: unknown): SessionRecord[] => {
  if (!Array.isArray(input)) return [];
  const out: SessionRecord[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const raw = item as {
      startedAt?: unknown;
      duration?: unknown;
      type?: unknown;
    };
    const startedAt = Number(raw.startedAt);
    const duration = Number(raw.duration);
    const type = raw.type;
    if (!Number.isFinite(startedAt) || startedAt <= 0) continue;
    if (!Number.isFinite(duration) || duration <= 0 || duration > 43200) {
      continue;
    }
    if (type !== "work" && type !== "break") continue;
    out.push({ startedAt, duration, type });
    if (out.length >= 5000) break;
  }
  return out;
};

// --- Date helpers ---
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const getDaysInMonth = (month: number, year: number) =>
  new Date(year, month, 0).getDate();
const buildDateStr = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const parseDateStr = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return { year: y ?? new Date().getFullYear(), month: m ?? 1, day: d ?? 1 };
};
const todayParts = () => {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
};
const YEAR_RANGE = Array.from(
  { length: 16 },
  (_, i) => new Date().getFullYear() + i,
);

// --- DatePickerSelects ---
function DatePickerSelects({
  month,
  day,
  year,
  onMonth,
  onDay,
  onYear,
}: {
  month: number;
  day: number;
  year: number;
  onMonth: (v: number) => void;
  onDay: (v: number) => void;
  onYear: (v: number) => void;
}) {
  const maxDay = getDaysInMonth(month, year);
  return (
    <div className="date-picker-selects">
      <select
        className="date-select"
        value={month}
        onChange={(e) => {
          const v = Number(e.target.value);
          onMonth(v);
          if (day > getDaysInMonth(v, year)) onDay(getDaysInMonth(v, year));
        }}
      >
        {MONTHS.map((m, i) => (
          <option key={i} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <select
        className="date-select date-select-day"
        value={day}
        onChange={(e) => onDay(Number(e.target.value))}
      >
        {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <select
        className="date-select date-select-year"
        value={year}
        onChange={(e) => {
          const v = Number(e.target.value);
          onYear(v);
          if (day > getDaysInMonth(month, v)) onDay(getDaysInMonth(month, v));
        }}
      >
        {YEAR_RANGE.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

// --- Icons ---
const SvgIcon = ({ children }: { children: React.ReactNode }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="currentColor"
    style={{ display: "block", margin: "0 auto" }}
  >
    {children}
  </svg>
);

const PauseIcon = () => (
  <SvgIcon>
    <rect x="9" y="8" width="4" height="16" rx="2" />
    <rect x="19" y="8" width="4" height="16" rx="2" />
  </SvgIcon>
);

const PlayIcon = () => (
  <SvgIcon>
    <path d="M9 9C9 7.8 10.3 7.2 11.3 7.8L23.3 14.8C24.2 15.4 24.2 16.6 23.3 17.2L11.3 24.2C10.3 24.8 9 24.2 9 23Z" />
  </SvgIcon>
);

const SkipIcon = () => (
  <SvgIcon>
    <path d="M8 9C8 7.8 9.3 7.2 10.3 7.8L18.3 14.8C19.2 15.4 19.2 16.6 18.3 17.2L10.3 24.2C9.3 24.8 8 24.2 8 23Z" />
    <rect x="21" y="8" width="3" height="16" rx="1.5" />
  </SvgIcon>
);

const ResetIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: "block", margin: "0 auto" }}
  >
    <path d="M 21.65 10.35 A 8 8 0 1 1 16 8" />
    <path d="M 12.5 4.5 L 16 8 L 12.5 11.5" />
  </svg>
);

const PencilIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const CalendarIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const CloudIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </svg>
);

// --- Main Component ---
export default function Home({
  weatherCity,
  currentUser,
  pomodoroTime = 25 * 60,
  isRunning = false,
  isWorkSession = true,
  fullScreenPomodoro = false,
  workDuration = 25,
  breakDuration = 5,
  setPomodoroTime = () => {},
  setFullScreenPomodoro = () => {},
  setWorkDuration = () => {},
  setBreakDuration = () => {},
  handlePomodoroToggle = () => {},
  handlePomodoroReset = () => {},
  handlePomodoroSkip = () => {},
}: HomeProps) {
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const [now, setNow] = useState<Date>(new Date());
  const [pinnedNotes, setPinnedNotes] = useState<Note[]>([]);
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [recentCodeNotes, setRecentCodeNotes] = useState<Note[]>([]);
  const [expandedNote, setExpandedNote] = useState<Note | null>(null);
  const [expandedToday, setExpandedToday] = useState(false);

  const [homeTasks, setHomeTasks] = useState<Task[]>([]);

  const [quickNoteText, setQuickNoteText] = useState("");
  const [quickNoteSaving, setQuickNoteSaving] = useState(false);
  const [quickNoteSuccess, setQuickNoteSuccess] = useState(false);

  const [focusStats, setFocusStats] = useState<FocusStats>({
    todaySessions: 0,
    todayMinutes: 0,
    weekSessions: 0,
    weekMinutes: 0,
  });

  const [countdowns, setCountdowns] = useState<Countdown[]>(() => {
    try {
      return normalizeCountdowns(
        JSON.parse(localStorage.getItem(COUNTDOWNS_KEY) || "[]"),
      );
    } catch {
      return [];
    }
  });
  const [showAddCountdown, setShowAddCountdown] = useState(false);
  const [newCountdownLabel, setNewCountdownLabel] = useState("");
  const [newMonth, setNewMonth] = useState(() => todayParts().month);
  const [newDay, setNewDay] = useState(() => todayParts().day);
  const [newYear, setNewYear] = useState(() => todayParts().year);
  const [editingCountdownId, setEditingCountdownId] = useState<string | null>(
    null,
  );
  const [editLabel, setEditLabel] = useState("");
  const [editMonth, setEditMonth] = useState(1);
  const [editDay, setEditDay] = useState(1);
  const [editYear, setEditYear] = useState(() => todayParts().year);

  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig[]>(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(WIDGET_CONFIG_KEY) || "null",
      );
      return normalizeWidgetConfig(saved);
    } catch {
      return DEFAULT_WIDGET_CONFIG;
    }
  });
  const [isEditingWidgets, setIsEditingWidgets] = useState(false);
  const [homeSettingsReady, setHomeSettingsReady] = useState(!currentUser?.id);

  const prevUserIdRef = useRef<string | number | undefined>(currentUser?.id);

  // Reset widget/countdown state when user logs out
  useEffect(() => {
    if (prevUserIdRef.current && !currentUser?.id) {
      setWidgetConfig(DEFAULT_WIDGET_CONFIG);
      setCountdowns([]);
    }
    prevUserIdRef.current = currentUser?.id;
  }, [currentUser?.id]);

  // --- Time ---
  const currentTime = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const currentTimeWithSeconds = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const getOrdinalSuffix = (day: number) => {
    const r = day % 100;
    if (r >= 11 && r <= 13) return "th";
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };
  const getCurrentDateLabel = () => {
    const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
    const month = now.toLocaleDateString(undefined, { month: "long" });
    const day = now.getDate();
    return `${weekday} ${month} ${day}${getOrdinalSuffix(day)}`;
  };

  const getTimeZoneShort = (d: Date) => {
    const part = new Intl.DateTimeFormat(undefined, {
      timeZoneName: "short",
    })
      .formatToParts(d)
      .find((p) => p.type === "timeZoneName")?.value;
    return part || "Local";
  };

  const getIsoWeek = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(
      ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    );
  };

  const getDayOfYear = (d: Date) => {
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = d.getTime() - start.getTime();
    return Math.floor(diff / 86400000);
  };

  const getDaysInYear = (year: number) =>
    new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;

  const dayElapsedSeconds =
    now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const dayProgressPercent = Math.max(
    0,
    Math.min(100, Math.round((dayElapsedSeconds / 86400) * 100)),
  );
  const isoWeek = getIsoWeek(now);
  const dayOfYear = getDayOfYear(now);
  const daysInYear = getDaysInYear(now.getFullYear());
  const timezoneLabel = getTimeZoneShort(now);

  const stripHtml = (v: string) =>
    v
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const getCodePreview = (v: string) => {
    const plain = (v || "").replace(/\r\n/g, "\n").trim();
    if (!plain) return "// No code yet";
    return plain.split("\n").slice(0, 5).join("\n");
  };
  const formatTime = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // --- Pinned notes ---
  const getPinnedNotes = useCallback(async () => {
    if (!currentUser?.id) return [];
    try {
      const res = await fetch(`${API_URL}/notes?userId=${currentUser.id}`);
      if (!res.ok) return [];
      const notes: Note[] = await res.json();
      return notes.filter((n) => n.isPinned) || [];
    } catch {
      return [];
    }
  }, [currentUser]);

  // --- Recent notes ---
  const getRecentNotes = useCallback(async () => {
    const splitRecent = (allNotes: Note[]) => {
      const sorted = [...allNotes].sort(
        (a, b) => (b.lastModified ?? 0) - (a.lastModified ?? 0),
      );
      return {
        recentText: sorted.filter((n) => n.noteType !== "code").slice(0, 3),
        recentCode: sorted.filter((n) => n.noteType === "code").slice(0, 3),
      };
    };

    if (!currentUser?.id) {
      try {
        const raw = localStorage.getItem("localNotes");
        if (!raw) return { recentText: [], recentCode: [] };
        const local: Note[] = JSON.parse(raw);
        return splitRecent(local);
      } catch {
        return { recentText: [], recentCode: [] };
      }
    }
    try {
      const res = await fetch(`${API_URL}/notes?userId=${currentUser.id}`);
      if (!res.ok) return { recentText: [], recentCode: [] };
      const notes: Note[] = await res.json();
      return splitRecent(notes);
    } catch {
      return { recentText: [], recentCode: [] };
    }
  }, [currentUser]);

  // --- Tasks ---
  const getTasks = useCallback(async () => {
    if (currentUser?.id) {
      try {
        const res = await fetch(`${API_URL}/tasks?userId=${currentUser.id}`);
        if (res.ok) {
          const all: Task[] = await res.json();
          return all.filter((t) => !t.completed);
        }
      } catch {}
      return [];
    }
    try {
      const raw = localStorage.getItem("checklist:items");
      if (!raw) return [];
      return (JSON.parse(raw) as Task[]).filter((t) => !t.completed);
    } catch {
      return [];
    }
  }, [currentUser]);

  const toggleHomeTask = async (id: string) => {
    setHomeTasks((prev) => prev.filter((t) => t.id !== id));
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
    if (currentUser?.id) {
      try {
        await fetch(`${API_URL}/tasks/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: true }),
        });
      } catch {}
    } else {
      try {
        const raw = localStorage.getItem("checklist:items");
        if (raw) {
          const updated = (JSON.parse(raw) as Task[]).map((t) =>
            t.id === id
              ? { ...t, completed: true, completedAt: Date.now() }
              : t,
          );
          localStorage.setItem("checklist:items", JSON.stringify(updated));
        }
      } catch {}
    }
  };

  // --- Focus stats ---
  const loadFocusStats = useCallback(() => {
    try {
      const sessions: SessionRecord[] = JSON.parse(
        localStorage.getItem(FOCUS_SESSIONS_KEY) || "[]",
      );
      const d = new Date();
      const todayStart = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
      ).getTime();
      const weekStart = (() => {
        const w = new Date(d);
        w.setDate(w.getDate() - ((w.getDay() + 6) % 7));
        w.setHours(0, 0, 0, 0);
        return w.getTime();
      })();
      const work = sessions.filter((s) => s.type === "work");
      const today = work.filter((s) => s.startedAt >= todayStart);
      const week = work.filter((s) => s.startedAt >= weekStart);
      setFocusStats({
        todaySessions: today.length,
        todayMinutes: Math.round(
          today.reduce((s, r) => s + r.duration, 0) / 60,
        ),
        weekSessions: week.length,
        weekMinutes: Math.round(week.reduce((s, r) => s + r.duration, 0) / 60),
      });
    } catch {}
  }, []);

  // --- Countdowns ---
  const resetNewDate = () => {
    const t = todayParts();
    setNewMonth(t.month);
    setNewDay(t.day);
    setNewYear(t.year);
  };

  const addCountdown = () => {
    if (!newCountdownLabel.trim()) return;
    setCountdowns((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        label: newCountdownLabel.trim(),
        targetDate: buildDateStr(newYear, newMonth, newDay),
      },
    ]);
    setNewCountdownLabel("");
    resetNewDate();
    setShowAddCountdown(false);
  };

  const startEditCountdown = (cd: Countdown) => {
    const p = parseDateStr(cd.targetDate);
    setEditingCountdownId(cd.id);
    setEditLabel(cd.label);
    setEditMonth(p.month);
    setEditDay(p.day);
    setEditYear(p.year);
  };

  const saveEditCountdown = () => {
    if (!editLabel.trim() || !editingCountdownId) return;
    setCountdowns((prev) =>
      prev.map((c) =>
        c.id === editingCountdownId
          ? {
              ...c,
              label: editLabel.trim(),
              targetDate: buildDateStr(editYear, editMonth, editDay),
            }
          : c,
      ),
    );
    setEditingCountdownId(null);
  };

  const removeCountdown = (id: string) => {
    if (editingCountdownId === id) setEditingCountdownId(null);
    setCountdowns((prev) => prev.filter((c) => c.id !== id));
  };
  const getDaysUntil = (targetDate: string) =>
    Math.ceil(
      (new Date(targetDate + "T00:00:00").getTime() - Date.now()) / 86400000,
    );

  // --- Quick note ---
  const createQuickNote = async () => {
    const text = quickNoteText.trim();
    if (!text) return;
    setQuickNoteSaving(true);
    const ts = Date.now();
    const payload = {
      title: "",
      content: `<p>${text}</p>`,
      font: "inter",
      fontSize: 16,
      theme: "default",
      noteType: "text",
      language: "python",
      userId: currentUser?.id ?? null,
    };
    try {
      if (currentUser?.id) {
        await fetch(`${API_URL}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        const local = {
          ...payload,
          id: `${ts}-${Math.random().toString(36).slice(2)}`,
          createdAt: ts,
          lastModified: ts,
        };
        const existing = JSON.parse(localStorage.getItem("localNotes") || "[]");
        localStorage.setItem(
          "localNotes",
          JSON.stringify([local, ...existing]),
        );
      }
    } catch {}
    setQuickNoteText("");
    setQuickNoteSaving(false);
    setQuickNoteSuccess(true);
    setTimeout(() => setQuickNoteSuccess(false), 2000);
  };

  // --- Widget config helpers ---
  const moveWidget = (index: number, dir: -1 | 1) => {
    const next = [...widgetConfig];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const tmp = next[index]!;
    next[index] = next[target]!;
    next[target] = tmp;
    setWidgetConfig(next);
  };
  const toggleWidgetVisible = (id: WidgetId) => {
    setWidgetConfig((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)),
    );
  };

  const toggleWidgetSize = (id: WidgetId) => {
    setWidgetConfig((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, size: w.size === "full" ? "half" : "full" } : w,
      ),
    );
  };

  // --- Effects ---
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const n = await getPinnedNotes();
      if (active) setPinnedNotes(n);
    };
    load();
    const id = setInterval(load, 15000);
    window.addEventListener("storage", load);
    return () => {
      active = false;
      clearInterval(id);
      window.removeEventListener("storage", load);
    };
  }, [getPinnedNotes]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const n = await getRecentNotes();
      if (active) {
        setRecentNotes(n.recentText);
        setRecentCodeNotes(n.recentCode);
      }
    };
    load();
    const id = setInterval(load, 15000);
    window.addEventListener("storage", load);
    return () => {
      active = false;
      clearInterval(id);
      window.removeEventListener("storage", load);
    };
  }, [getRecentNotes]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const t = await getTasks();
      if (active) setHomeTasks(t);
    };
    load();
    const id = setInterval(load, 15000);
    window.addEventListener("storage", load);
    return () => {
      active = false;
      clearInterval(id);
      window.removeEventListener("storage", load);
    };
  }, [getTasks]);

  useEffect(() => {
    let active = true;
    const loadHomeSettings = async () => {
      if (!currentUser?.id) {
        setHomeSettingsReady(true);
        return;
      }

      setHomeSettingsReady(false);
      try {
        const res = await fetch(
          `${API_URL}/auth/user/${currentUser.id}/settings`,
        );
        if (!res.ok) return;
        const settings = await res.json();

        if (Array.isArray(settings.countdowns) && active) {
          setCountdowns(normalizeCountdowns(settings.countdowns));
        }
        if (Array.isArray(settings.widgetConfig) && active) {
          setWidgetConfig(normalizeWidgetConfig(settings.widgetConfig));
        }
        if (Array.isArray(settings.focusSessions)) {
          const normalized = normalizeFocusSessions(settings.focusSessions);
          try {
            localStorage.setItem(
              FOCUS_SESSIONS_KEY,
              JSON.stringify(normalized),
            );
          } catch {}
          if (active) loadFocusStats();
        }
      } catch {}
      if (active) setHomeSettingsReady(true);
    };

    loadHomeSettings();
    return () => {
      active = false;
    };
  }, [currentUser?.id, loadFocusStats]);

  useEffect(() => {
    loadFocusStats();
    const h = () => {
      loadFocusStats();
      if (!currentUser?.id || !homeSettingsReady) return;
      try {
        const sessions = normalizeFocusSessions(
          JSON.parse(localStorage.getItem(FOCUS_SESSIONS_KEY) || "[]"),
        );
        fetch(`${API_URL}/auth/user/${currentUser.id}/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ focusSessions: sessions }),
        }).catch(() => {});
      } catch {}
    };
    h();
    window.addEventListener("focusSessionComplete", h);
    return () => window.removeEventListener("focusSessionComplete", h);
  }, [loadFocusStats, currentUser?.id, homeSettingsReady]);

  useEffect(() => {
    try {
      localStorage.setItem(COUNTDOWNS_KEY, JSON.stringify(countdowns));
    } catch {}
    if (!currentUser?.id || !homeSettingsReady) return;
    fetch(`${API_URL}/auth/user/${currentUser.id}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countdowns: normalizeCountdowns(countdowns) }),
    }).catch(() => {});
  }, [countdowns, currentUser?.id, homeSettingsReady]);

  useEffect(() => {
    try {
      localStorage.setItem(WIDGET_CONFIG_KEY, JSON.stringify(widgetConfig));
    } catch {}
    if (!currentUser?.id || !homeSettingsReady) return;
    fetch(`${API_URL}/auth/user/${currentUser.id}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        widgetConfig: normalizeWidgetConfig(widgetConfig),
      }),
    }).catch(() => {});
  }, [widgetConfig, currentUser?.id, homeSettingsReady]);

  // --- Widget JSX map ---
  const widgetMap: Record<WidgetId, ReactElement> = {
    today: (
      <div
        key="today"
        className="home-info"
        onClick={() => setExpandedToday(true)}
        style={{ cursor: "pointer" }}
      >
        <h2>Today</h2>
        <div className="home-info-time">{currentTime}</div>
        <div className="home-info-date-row">
          <CalendarIcon />
          <span className="home-info-date">{getCurrentDateLabel()}</span>
        </div>
        <div className="home-info-weather-row">
          <CloudIcon />
          <Weather city={weatherCity} />
        </div>
      </div>
    ),

    "quick-actions": (
      <div key="quick-actions" className="home-quick-actions">
        <h2>Quick Actions</h2>
        <div className="quick-actions-buttons">
          <button
            className="quick-action-btn"
            onClick={() => console.log("New note - navigate to editor")}
            title="Create a new note"
          >
            <span className="action-icon">+</span>
            New Note
          </button>
          <button
            className="quick-action-btn"
            onClick={handlePomodoroToggle}
            title="Start Pomodoro timer"
          >
            <span className="action-icon play">▶</span>
            Start Timer
          </button>
          <button
            className="quick-action-btn"
            onClick={() => console.log("Navigate to notes")}
            title="View all notes"
          >
            <span className="action-icon notes">≡</span>
            All Notes
          </button>
        </div>
      </div>
    ),

    pinned: (
      <div key="pinned" className="home-pinned">
        <h2>Pinned Notes</h2>
        {pinnedNotes.length === 0 ? (
          <div className="home-empty-state">
            <p className="home-empty-state-text">No pinned notes yet</p>
            <p className="home-empty-state-hint">
              Pin a note to access it quickly
            </p>
          </div>
        ) : (
          <div className="home-pinned-list">
            {pinnedNotes.map((note) => (
              <div
                key={note.id}
                className="home-pinned-card"
                onClick={() => setExpandedNote(note)}
              >
                <div className="home-pinned-title">
                  {note.title?.trim() || "Untitled"}
                </div>
                <div className="home-pinned-content">
                  {stripHtml(note.content || "").slice(0, 200) ||
                    "(No content)"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),

    recent: (
      <div key="recent" className="home-recent">
        <h2>Recent Notes</h2>
        {recentNotes.length === 0 ? (
          <div className="home-empty-state">
            <p className="home-empty-state-text">No notes yet</p>
            <p className="home-empty-state-hint">
              Create your first note to get started
            </p>
          </div>
        ) : (
          <div className="home-recent-list">
            {recentNotes.map((note) => (
              <div
                key={note.id}
                className="home-recent-card"
                onClick={() => setExpandedNote(note)}
              >
                <div className="home-recent-title">
                  {note.title?.trim() || "Untitled"}
                </div>
                <div className="home-recent-content">
                  {stripHtml(note.content || "").slice(0, 150) ||
                    "(No content)"}
                </div>
                <div className="home-recent-time">
                  {note.lastModified
                    ? new Date(note.lastModified).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )
                    : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),

    "recent-code": (
      <div key="recent-code" className="home-recent-code">
        <h2>Recent Code</h2>
        {recentCodeNotes.length === 0 ? (
          <div className="home-empty-state">
            <p className="home-empty-state-text">No code notes yet</p>
            <p className="home-empty-state-hint">
              Create a code note to see it here
            </p>
          </div>
        ) : (
          <div className="home-recent-list">
            {recentCodeNotes.map((note) => (
              <div
                key={note.id}
                className="home-recent-card home-recent-code-card"
                onClick={() => setExpandedNote(note)}
              >
                <div className="home-recent-title home-recent-code-title-row">
                  <span>{note.title?.trim() || "Untitled"}</span>
                  <span className="home-recent-code-lang">
                    {(note.language || "code").toUpperCase()}
                  </span>
                </div>
                <pre className="home-recent-code-content">
                  <code>{getCodePreview(note.content || "")}</code>
                </pre>
                <div className="home-recent-time">
                  {note.lastModified
                    ? new Date(note.lastModified).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )
                    : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),

    tasks: (
      <div key="tasks" className="home-tasks">
        <h2>Tasks</h2>
        {homeTasks.length === 0 ? (
          <div className="home-empty-state">
            <p className="home-empty-state-text">All caught up</p>
            <p className="home-empty-state-hint">Your tasks are all done</p>
          </div>
        ) : (
          <ul className="home-tasks-list">
            {homeTasks.slice(0, 5).map((task) => (
              <li key={task._clientId ?? task.id} className="home-tasks-item">
                <label className="home-tasks-label">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleHomeTask(task.id)}
                  />
                  <span className="home-tasks-checkbox"></span>
                  <span className="home-tasks-text">{task.text}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    ),

    "quick-note": (
      <div key="quick-note" className="home-quick-note">
        <h2>Quick Note</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createQuickNote();
          }}
        >
          <textarea
            className="quick-note-input"
            placeholder="Write something down..."
            value={quickNoteText}
            onChange={(e) => setQuickNoteText(e.target.value)}
          />
          <button
            type="submit"
            className={`quick-note-btn${quickNoteSuccess ? " success" : ""}`}
            disabled={quickNoteSaving || !quickNoteText.trim()}
          >
            {quickNoteSaving
              ? "Saving..."
              : quickNoteSuccess
                ? "Saved!"
                : "Save Note"}
          </button>
        </form>
      </div>
    ),

    "focus-stats": (
      <div key="focus-stats" className="home-focus-stats">
        <h2>Focus Stats</h2>
        <div className="focus-stats-grid">
          <div className="focus-stat-item">
            <div className="focus-stat-value">{focusStats.todaySessions}</div>
            <div className="focus-stat-label">Sessions Today</div>
          </div>
          <div className="focus-stat-item">
            <div className="focus-stat-value">{focusStats.todayMinutes}m</div>
            <div className="focus-stat-label">Focus Time Today</div>
          </div>
          <div className="focus-stat-item">
            <div className="focus-stat-value">{focusStats.weekSessions}</div>
            <div className="focus-stat-label">Sessions This Week</div>
          </div>
          <div className="focus-stat-item">
            <div className="focus-stat-value">{focusStats.weekMinutes}m</div>
            <div className="focus-stat-label">Focus Time (Week)</div>
          </div>
        </div>
      </div>
    ),

    countdowns: (
      <div key="countdowns" className="home-countdowns">
        <h2>Countdowns</h2>
        {countdowns.length > 0 && (
          <div className="countdown-list">
            {countdowns.map((cd) => {
              const days = getDaysUntil(cd.targetDate);
              if (editingCountdownId === cd.id) {
                return (
                  <div key={cd.id} className="countdown-edit-row">
                    <input
                      className="countdown-input"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="Label"
                      autoFocus
                    />
                    <DatePickerSelects
                      month={editMonth}
                      day={editDay}
                      year={editYear}
                      onMonth={setEditMonth}
                      onDay={setEditDay}
                      onYear={setEditYear}
                    />
                    <div className="countdown-form-actions">
                      <button
                        className="countdown-add-submit"
                        onClick={saveEditCountdown}
                      >
                        Save
                      </button>
                      <button
                        className="countdown-cancel"
                        onClick={() => setEditingCountdownId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={cd.id}
                  className={`countdown-row${days <= 0 ? " ended" : days <= 3 ? " urgent" : ""}`}
                >
                  <div className="countdown-num-block">
                    <span className="countdown-days">
                      {days > 0 ? days : 0}
                    </span>
                    <span className="countdown-unit">days</span>
                  </div>
                  <div className="countdown-info">
                    <div className="countdown-label">{cd.label}</div>
                    <div className="countdown-date">
                      {new Date(cd.targetDate + "T00:00:00").toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </div>
                  </div>
                  <div className="countdown-actions">
                    <button
                      className="countdown-edit-btn"
                      onClick={() => startEditCountdown(cd)}
                      aria-label="Edit countdown"
                      title="Edit countdown"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      className="countdown-remove"
                      onClick={() => removeCountdown(cd.id)}
                      aria-label="Remove countdown"
                      title="Remove countdown"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {countdowns.length === 0 && !showAddCountdown && (
          <div className="home-empty-state">
            <p className="home-empty-state-text">No countdowns yet</p>
            <p className="home-empty-state-hint">Track important dates</p>
          </div>
        )}
        {showAddCountdown ? (
          <form
            className="countdown-add-form"
            onSubmit={(e) => {
              e.preventDefault();
              addCountdown();
            }}
          >
            <input
              className="countdown-input"
              placeholder="Label (e.g. Birthday)"
              value={newCountdownLabel}
              onChange={(e) => setNewCountdownLabel(e.target.value)}
              required
            />
            <DatePickerSelects
              month={newMonth}
              day={newDay}
              year={newYear}
              onMonth={setNewMonth}
              onDay={setNewDay}
              onYear={setNewYear}
            />
            <div className="countdown-form-actions">
              <button type="submit" className="countdown-add-submit">
                Add
              </button>
              <button
                type="button"
                className="countdown-cancel"
                onClick={() => {
                  setShowAddCountdown(false);
                  setNewCountdownLabel("");
                  resetNewDate();
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            className="countdown-add-btn"
            onClick={() => setShowAddCountdown(true)}
          >
            + Add Countdown
          </button>
        )}
      </div>
    ),

    pomodoro: (
      <div key="pomodoro" className="home-pomodoro">
        <h2>Pomodoro Timer</h2>
        <div className="pomodoro-widget">
          <div
            className={`pomodoro-display ${isWorkSession ? "work" : "break"}`}
            onClick={() => setFullScreenPomodoro(true)}
            style={{ cursor: "pointer" }}
          >
            <div className="pomodoro-session">
              {isWorkSession ? "Lock In Session" : "Break Time"}
            </div>
            <div className="pomodoro-time">{formatTime(pomodoroTime)}</div>
          </div>
          <div className="pomodoro-controls">
            <button
              className="pomodoro-btn"
              onClick={handlePomodoroToggle}
              title={isRunning ? "Pause timer" : "Start timer"}
              aria-label={isRunning ? "Pause" : "Start"}
            >
              {isRunning ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button
              className="pomodoro-btn"
              onClick={handlePomodoroSkip}
              title="Skip to next session"
              aria-label="Skip"
            >
              <SkipIcon />
            </button>
            <button
              className="pomodoro-btn"
              onClick={handlePomodoroReset}
              title="Reset timer"
              aria-label="Reset"
            >
              <ResetIcon />
            </button>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div id="home-wrapper">
      <div className="home-welcome-banner">
        <span className="home-welcome-greeting">
          {getGreeting()}
          {currentUser ? `, ${currentUser.name || currentUser.username}` : ""}
        </span>
      </div>
      <div id="home-content">
        {/* Render widgets in configured order */}
        {widgetConfig
          .filter((w) => w.visible)
          .map((w) => (
            <div
              key={w.id}
              className={`widget-cell${w.size === "full" ? " widget-cell-full" : ""}`}
            >
              {widgetMap[w.id]}
            </div>
          ))}

        {/* Edit widgets button */}
        <div className="widget-cell widget-cell-row">
          <button
            className="home-edit-btn"
            onClick={() => setIsEditingWidgets(true)}
            aria-label="Customize widgets"
            title="Customize widgets"
          >
            <PencilIcon />
            <span>Edit Widgets</span>
          </button>
        </div>

        {/* --- Widget Edit Modal --- */}
        {isEditingWidgets && (
          <div
            className="note-modal-overlay"
            onClick={() => setIsEditingWidgets(false)}
          >
            <div
              className="widget-edit-popup"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close-btn"
                onClick={() => setIsEditingWidgets(false)}
                aria-label="Close"
              >
                ←
              </button>
              <div className="widget-edit-header">
                <h2>Customize Widgets</h2>
                <p>Toggle visibility and reorder</p>
              </div>
              <ul className="widget-edit-list">
                {widgetConfig.map((w, i) => (
                  <li key={w.id} className="widget-edit-item">
                    <button
                      className={`widget-toggle${w.visible ? " on" : " off"}`}
                      onClick={() => toggleWidgetVisible(w.id)}
                      aria-label={w.visible ? "Hide" : "Show"}
                    >
                      <span className="widget-toggle-knob" />
                    </button>
                    <span
                      className={`widget-edit-label${!w.visible ? " muted" : ""}`}
                    >
                      {w.label}
                    </span>
                    <button
                      className={`widget-size-btn${w.size === "half" ? " is-half" : ""}`}
                      onClick={() => toggleWidgetSize(w.id)}
                      title={w.size === "half" ? "Half width" : "Full width"}
                      aria-label="Toggle width"
                    >
                      <span className="size-icon-block" />
                      <span className="size-icon-block" />
                    </button>
                    <div className="widget-edit-arrows">
                      <button
                        className="widget-arrow-btn"
                        disabled={i === 0}
                        onClick={() => moveWidget(i, -1)}
                        aria-label="Move up"
                      >
                        ▲
                      </button>
                      <button
                        className="widget-arrow-btn"
                        disabled={i === widgetConfig.length - 1}
                        onClick={() => moveWidget(i, 1)}
                        aria-label="Move down"
                      >
                        ▼
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                className="widget-edit-done"
                onClick={() => setIsEditingWidgets(false)}
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* --- Expanded Note Modal --- */}
        {expandedNote && (
          <div
            className="note-modal-overlay"
            onClick={() => setExpandedNote(null)}
          >
            <div
              className="note-modal-popup"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close-btn"
                onClick={() => setExpandedNote(null)}
                aria-label="Close note"
              >
                ←
              </button>
              <div className="modal-note-title">
                {expandedNote.title?.trim() || "Untitled"}
              </div>
              {expandedNote.noteType === "code" ? (
                <div className="modal-note-code-wrap">
                  <div className="modal-note-code-lang">
                    {(expandedNote.language || "code").toUpperCase()}
                  </div>
                  <pre className="modal-note-content modal-note-content-code">
                    <code>{expandedNote.content || "// No code content"}</code>
                  </pre>
                </div>
              ) : (
                <div
                  className="modal-note-content"
                  dangerouslySetInnerHTML={{
                    __html: expandedNote.content || "(No content)",
                  }}
                />
              )}
              {expandedNote.lastModified && (
                <div className="modal-note-footer">
                  Last modified:{" "}
                  {new Date(expandedNote.lastModified).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- Full Screen Pomodoro Modal --- */}
        {fullScreenPomodoro && (
          <div
            className="note-modal-overlay"
            onClick={() => setFullScreenPomodoro(false)}
          >
            <div
              className="pomodoro-modal-popup"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close-btn"
                onClick={() => setFullScreenPomodoro(false)}
                aria-label="Close timer"
              >
                ←
              </button>
              <div className="pomodoro-modal-header">
                <h1>Pomodoro Timer</h1>
              </div>
              <div
                className={`pomodoro-modal-display ${isWorkSession ? "work" : "break"}`}
              >
                <div className="pomodoro-modal-session">
                  {isWorkSession ? "Work Session" : "Break Time"}
                </div>
                <div className="pomodoro-modal-time">
                  {formatTime(pomodoroTime)}
                </div>
              </div>
              <div className="pomodoro-modal-controls">
                <button
                  className="pomodoro-modal-btn"
                  onClick={handlePomodoroToggle}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {isRunning ? (
                      <>
                        <PauseIcon /> Pause
                      </>
                    ) : (
                      <>
                        <PlayIcon /> Start
                      </>
                    )}
                  </span>
                </button>
                <button
                  className="pomodoro-modal-btn"
                  onClick={handlePomodoroSkip}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <SkipIcon /> Skip
                  </span>
                </button>
                <button
                  className="pomodoro-modal-btn"
                  onClick={handlePomodoroReset}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <ResetIcon /> Reset
                  </span>
                </button>
              </div>
              <div className="pomodoro-settings">
                <h3>Customize Duration</h3>
                <div className="setting-group">
                  <label>
                    Work Session (minutes):
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={workDuration}
                      onChange={(e) => {
                        const v = Math.max(
                          1,
                          Math.min(60, parseInt(e.target.value) || 1),
                        );
                        setWorkDuration(v);
                        if (isWorkSession && !isRunning)
                          setPomodoroTime(v * 60);
                      }}
                    />
                  </label>
                </div>
                <div className="setting-group">
                  <label>
                    Break Session (minutes):
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={breakDuration}
                      onChange={(e) => {
                        const v = Math.max(
                          1,
                          Math.min(30, parseInt(e.target.value) || 1),
                        );
                        setBreakDuration(v);
                        if (!isWorkSession && !isRunning)
                          setPomodoroTime(v * 60);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- Expanded Today Modal --- */}
        {expandedToday && (
          <div
            className="note-modal-overlay"
            onClick={() => setExpandedToday(false)}
          >
            <div
              className="today-modal-popup"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close-btn"
                onClick={() => setExpandedToday(false)}
                aria-label="Close"
              >
                ←
              </button>
              <div className="today-modal-header">
                <h1>Today</h1>
              </div>
              <div className="today-modal-content">
                <div className="today-modal-primary">
                  <div className="today-modal-time">
                    {currentTimeWithSeconds}
                  </div>
                  <div className="today-modal-date-row">
                    <CalendarIcon />
                    <span className="today-modal-date">
                      {getCurrentDateLabel()}
                    </span>
                  </div>
                  <div className="today-modal-weather-row">
                    <CloudIcon />
                    <Weather city={weatherCity} />
                  </div>
                </div>

                <div className="today-modal-stats">
                  <div className="today-modal-stat">
                    <span className="today-modal-stat-label">Week</span>
                    <span className="today-modal-stat-value">{isoWeek}</span>
                  </div>
                  <div className="today-modal-stat">
                    <span className="today-modal-stat-label">Day</span>
                    <span className="today-modal-stat-value">{dayOfYear}</span>
                  </div>
                  <div className="today-modal-stat">
                    <span className="today-modal-stat-label">Timezone</span>
                    <span className="today-modal-stat-value">
                      {timezoneLabel}
                    </span>
                  </div>
                </div>

                <div className="today-day-progress">
                  <div className="today-day-progress-header">
                    <span>Day Progress</span>
                    <span>{dayProgressPercent}%</span>
                  </div>
                  <div className="today-day-progress-track">
                    <div
                      className="today-day-progress-fill"
                      style={{ width: `${dayProgressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="today-modal-meta">
                  {dayOfYear} of {daysInYear} days this year
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
