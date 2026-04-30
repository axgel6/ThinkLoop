import { useState, useEffect, useCallback, useRef, ReactElement } from "react";
import confetti from "canvas-confetti";
import Weather from "./Weather";
import "./Home.css";
import { COLOR_OPTIONS, applyTheme } from "../utils/themes";
import { FONT_OPTIONS, applyFont } from "../utils/fonts";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

// --- Types ---
type TabKey = "home" | "notes" | "tasks" | "settings";
type WidgetId = "today" | "pinned" | "recent" | "recent-code" | "tasks" | "quick-note" | "quick-actions" | "focus-stats" | "countdowns" | "pomodoro";

interface HomeProps {
  weatherCity?: string;
  currentUser?: { id?: string | number; username?: string; name?: string } | null;
  pomodoroTime?: number;
  isRunning?: boolean;
  isWorkSession?: boolean;
  fullScreenPomodoro?: boolean;
  workDuration?: number;
  breakDuration?: number;
  setPomodoroTime?: (v: number) => void;
  setFullScreenPomodoro?: (v: boolean) => void;
  setWorkDuration?: (v: number) => void;
  setBreakDuration?: (v: number) => void;
  handlePomodoroToggle?: () => void;
  handlePomodoroReset?: () => void;
  handlePomodoroSkip?: () => void;
  onNavigate?: (tab: TabKey) => void;
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

interface WidgetConfig {
  id: WidgetId;
  label: string;
  visible: boolean;
  size: "small" | "medium" | "large";
}

// --- Constants ---
const WIDGET_CONFIG_KEY = "home:widget-config-v4";
const COUNTDOWNS_KEY = "countdowns:items";
const FOCUS_SESSIONS_KEY = "focusStats:sessions";
const NON_SMALL_WIDGETS = new Set<WidgetId>(["quick-actions", "pomodoro"]);
const LARGE_ONLY_WIDGETS = new Set<WidgetId>(["focus-stats", "recent", "recent-code"]);

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "today", label: "Today", visible: true, size: "large" },
  { id: "quick-actions", label: "Quick Actions", visible: true, size: "large" },
  { id: "pomodoro", label: "Pomodoro Timer", visible: true, size: "large" },
  { id: "focus-stats", label: "Focus Stats", visible: true, size: "large" },
  { id: "recent", label: "Recent Notes", visible: true, size: "large" },
  { id: "recent-code", label: "Recent Code", visible: true, size: "large" },
  { id: "pinned", label: "Pinned Notes", visible: true, size: "medium" },
  { id: "countdowns", label: "Countdowns", visible: true, size: "medium" },
  { id: "tasks", label: "Tasks", visible: true, size: "medium" },
  { id: "quick-note", label: "Capture Note", visible: true, size: "medium" },
];

// --- Normalization ---
const cloneDefaults = (): WidgetConfig[] => DEFAULT_WIDGETS.map((w) => ({ ...w }));

const normalizeWidgetConfig = (input: unknown): WidgetConfig[] => {
  if (!Array.isArray(input)) return cloneDefaults();
  const byId = new Map(DEFAULT_WIDGETS.map((w) => [w.id, w]));
  const seen = new Set<WidgetId>();
  const out: WidgetConfig[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const { id, visible, size } = raw as Record<string, unknown>;
    if (typeof id !== "string" || !byId.has(id as WidgetId) || seen.has(id as WidgetId)) continue;
    const def = byId.get(id as WidgetId)!;
    let s: WidgetConfig["size"] = size === "medium" ? "medium" : size === "large" || size === "full" ? "large" : "small";
    if (LARGE_ONLY_WIDGETS.has(def.id)) s = "large";
    if (NON_SMALL_WIDGETS.has(def.id) && s === "small") s = "medium";
    out.push({ id: def.id, label: def.label, visible: visible !== false, size: s });
    seen.add(def.id);
  }
  for (const def of DEFAULT_WIDGETS) if (!seen.has(def.id)) out.push({ ...def });
  return out;
};

const normalizeCountdowns = (input: unknown): Countdown[] => {
  if (!Array.isArray(input)) return [];
  const dateRx = /^\d{4}-\d{2}-\d{2}$/;
  const out: Countdown[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const { id, label, targetDate } = item as Record<string, unknown>;
    const l = typeof label === "string" ? label.trim().slice(0, 80) : "";
    const t = typeof targetDate === "string" ? targetDate.trim() : "";
    if (!l || !dateRx.test(t)) continue;
    out.push({ id: typeof id === "string" && id.trim() ? id : `${Date.now()}-${Math.random().toString(36).slice(2)}`, label: l, targetDate: t });
    if (out.length >= 100) break;
  }
  return out;
};

const normalizeSessions = (input: unknown): SessionRecord[] => {
  if (!Array.isArray(input)) return [];
  const out: SessionRecord[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const { startedAt, duration, type } = item as Record<string, unknown>;
    const s = Number(startedAt), d = Number(duration);
    if (!Number.isFinite(s) || s <= 0 || !Number.isFinite(d) || d <= 0 || d > 43200) continue;
    if (type !== "work" && type !== "break") continue;
    out.push({ startedAt: s, duration: d, type });
    if (out.length >= 5000) break;
  }
  return out;
};

// --- Date helpers ---
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const getDaysInMonth = (m: number, y: number) => new Date(y, m, 0).getDate();
const buildDateStr = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const parseDateStr = (s: string) => { const [y, m, d] = s.split("-").map(Number); const n = new Date(); return { year: y ?? n.getFullYear(), month: m ?? 1, day: d ?? 1 }; };
const todayParts = () => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }; };
const YEAR_RANGE = Array.from({ length: 16 }, (_, i) => new Date().getFullYear() + i);

// --- DatePickerSelects ---
function DatePickerSelects({ month, day, year, onMonth, onDay, onYear }: {
  month: number; day: number; year: number;
  onMonth: (v: number) => void; onDay: (v: number) => void; onYear: (v: number) => void;
}) {
  const clampDay = (m: number, y: number) => { if (day > getDaysInMonth(m, y)) onDay(getDaysInMonth(m, y)); };
  return (
    <div className="date-picker-selects">
      <select className="date-select" value={month} onChange={(e) => { const v = Number(e.target.value); onMonth(v); clampDay(v, year); }}>
        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
      </select>
      <select className="date-select date-select-day" value={day} onChange={(e) => onDay(Number(e.target.value))}>
        {Array.from({ length: getDaysInMonth(month, year) }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
      <select className="date-select date-select-year" value={year} onChange={(e) => { const v = Number(e.target.value); onYear(v); clampDay(month, v); }}>
        {YEAR_RANGE.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

// --- Icons ---
const Ico = ({ size = 15, children }: { size?: number; children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const BigIco = ({ filled, children }: { filled?: boolean; children: React.ReactNode }) => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill={filled ? "currentColor" : "none"} stroke={filled ? "none" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto" }}>{children}</svg>
);

const PauseIcon = () => <BigIco filled><rect x="9" y="8" width="4" height="16" rx="2" /><rect x="19" y="8" width="4" height="16" rx="2" /></BigIco>;
const PlayIcon = () => <BigIco filled><path d="M9 9C9 7.8 10.3 7.2 11.3 7.8L23.3 14.8C24.2 15.4 24.2 16.6 23.3 17.2L11.3 24.2C10.3 24.8 9 24.2 9 23Z" /></BigIco>;
const SkipIcon = () => <BigIco filled><path d="M8 9C8 7.8 9.3 7.2 10.3 7.8L18.3 14.8C19.2 15.4 19.2 16.6 18.3 17.2L10.3 24.2C9.3 24.8 8 24.2 8 23Z" /><rect x="21" y="8" width="3" height="16" rx="1.5" /></BigIco>;
const ResetIcon = () => <BigIco><path d="M 21.65 10.35 A 8 8 0 1 1 16 8" /><path d="M 12.5 4.5 L 16 8 L 12.5 11.5" /></BigIco>;
const PencilIcon = () => <Ico><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></Ico>;
const TrashIcon = () => <Ico><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></Ico>;
const CalendarIcon = () => <Ico size={13}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Ico>;
const CloudIcon = () => <Ico size={13}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></Ico>;
const HomeNavIcon = () => <Ico><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" /><polyline points="9 21 9 12 15 12 15 21" /></Ico>;
const NotesNavIcon = () => <Ico><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></Ico>;
const TasksNavIcon = () => <Ico><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></Ico>;
const SettingsNavIcon = () => <Ico><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></Ico>;

// --- Utilities ---
const stripHtml = (v: string) => v.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const getCodePreview = (v: string) => (v || "").replace(/\r\n/g, "\n").trim().split("\n").slice(0, 5).join("\n") || "// No code yet";
const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
const fmtNoteDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const ordinal = (n: number) => { const r = n % 100; if (r >= 11 && r <= 13) return "th"; return (["th", "st", "nd", "rd"][n % 10] ?? "th"); };
const getIsoWeek = (d: Date) => { const u = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = u.getUTCDay() || 7; u.setUTCDate(u.getUTCDate() + 4 - day); const ys = new Date(Date.UTC(u.getUTCFullYear(), 0, 1)); return Math.ceil(((u.getTime() - ys.getTime()) / 86400000 + 1) / 7); };
const getDayOfYear = (d: Date) => Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
const getDaysInYear = (y: number) => new Date(y, 1, 29).getMonth() === 1 ? 366 : 365;
const getTzShort = (d: Date) => new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(d).find((p) => p.type === "timeZoneName")?.value ?? "Local";

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
  onNavigate = () => {},
}: HomeProps) {
  // --- State ---
  const [now, setNow] = useState(new Date());
  const [pinnedNotes, setPinnedNotes] = useState<Note[]>([]);
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [recentCodeNotes, setRecentCodeNotes] = useState<Note[]>([]);
  const [homeTasks, setHomeTasks] = useState<Task[]>([]);
  const [focusStats, setFocusStats] = useState<FocusStats>({ todaySessions: 0, todayMinutes: 0, weekSessions: 0, weekMinutes: 0 });
  const [quickNoteText, setQuickNoteText] = useState("");
  const [quickNoteSaving, setQuickNoteSaving] = useState(false);
  const [quickNoteSuccess, setQuickNoteSuccess] = useState(false);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [captureModalText, setCaptureModalText] = useState("");
  const [quickActionStatus, setQuickActionStatus] = useState("");
  const [expandedNote, setExpandedNote] = useState<Note | null>(null);
  const [expandedToday, setExpandedToday] = useState(false);
  const [countdowns, setCountdowns] = useState<Countdown[]>(() => {
    try { return normalizeCountdowns(JSON.parse(localStorage.getItem(COUNTDOWNS_KEY) || "[]")); } catch { return []; }
  });
  const [showAddCountdown, setShowAddCountdown] = useState(false);
  const [newCountdownLabel, setNewCountdownLabel] = useState("");
  const [newMonth, setNewMonth] = useState(() => todayParts().month);
  const [newDay, setNewDay] = useState(() => todayParts().day);
  const [newYear, setNewYear] = useState(() => todayParts().year);
  const [editingCountdown, setEditingCountdown] = useState<{ id: string; label: string; month: number; day: number; year: number } | null>(null);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig[]>(() => {
    try { return normalizeWidgetConfig(JSON.parse(localStorage.getItem(WIDGET_CONFIG_KEY) || "null")); } catch { return cloneDefaults(); }
  });
  const [isEditingWidgets, setIsEditingWidgets] = useState(false);
  const [settingsReady, setSettingsReady] = useState(!currentUser?.id);
  const [draggedId, setDraggedId] = useState<WidgetId | null>(null);
  const [dragOverId, setDragOverId] = useState<WidgetId | null>(null);
  const [showShutdownBanner, setShowShutdownBanner] = useState(() => localStorage.getItem("thinkloop-shutdown-banner-dismissed") !== "1");

  const prevUserId = useRef(currentUser?.id);

  // --- Computed ---
  const greeting = () => { const h = now.getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
  const currentTime = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const currentTimeWithSeconds = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateLabel = () => { const d = now.getDate(); return `${now.toLocaleDateString(undefined, { weekday: "long" })} ${now.toLocaleDateString(undefined, { month: "long" })} ${d}${ordinal(d)}`; };
  const dayElapsed = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const dayProgress = Math.max(0, Math.min(100, Math.round((dayElapsed / 86400) * 100)));

  // --- Data fetchers ---
  const fetchNotes = useCallback(async (): Promise<Note[]> => {
    if (currentUser?.id) {
      try { const res = await fetch(`${API_URL}/notes?userId=${currentUser.id}`); if (res.ok) return res.json(); } catch {}
      return [];
    }
    try { return JSON.parse(localStorage.getItem("localNotes") || "[]"); } catch { return []; }
  }, [currentUser]);

  const fetchTasks = useCallback(async (): Promise<Task[]> => {
    if (currentUser?.id) {
      try { const res = await fetch(`${API_URL}/tasks?userId=${currentUser.id}`); if (res.ok) { const all: Task[] = await res.json(); return all.filter((t) => !t.completed); } } catch {}
      return [];
    }
    try { return (JSON.parse(localStorage.getItem("checklist:items") || "[]") as Task[]).filter((t) => !t.completed); } catch { return []; }
  }, [currentUser]);

  const loadFocusStats = useCallback(() => {
    try {
      const sessions = normalizeSessions(JSON.parse(localStorage.getItem(FOCUS_SESSIONS_KEY) || "[]"));
      const n = new Date();
      const todayStart = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
      const weekStart = (() => { const w = new Date(n); w.setDate(w.getDate() - ((w.getDay() + 6) % 7)); w.setHours(0, 0, 0, 0); return w.getTime(); })();
      const work = sessions.filter((s) => s.type === "work");
      const today = work.filter((s) => s.startedAt >= todayStart);
      const week = work.filter((s) => s.startedAt >= weekStart);
      setFocusStats({
        todaySessions: today.length,
        todayMinutes: Math.round(today.reduce((a, r) => a + r.duration, 0) / 60),
        weekSessions: week.length,
        weekMinutes: Math.round(week.reduce((a, r) => a + r.duration, 0) / 60),
      });
    } catch {}
  }, []);

  // --- Effects ---
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Reset on logout
  useEffect(() => {
    if (prevUserId.current && !currentUser?.id) { setWidgetConfig(cloneDefaults()); setCountdowns([]); }
    prevUserId.current = currentUser?.id;
  }, [currentUser?.id]);

  // Load notes and tasks
  useEffect(() => {
    let active = true;
    const load = async () => {
      const [notes, tasks] = await Promise.all([fetchNotes(), fetchTasks()]);
      if (!active) return;
      const sorted = [...notes].sort((a, b) => (b.lastModified ?? 0) - (a.lastModified ?? 0));
      setPinnedNotes(notes.filter((n) => n.isPinned));
      setRecentNotes(sorted.filter((n) => n.noteType !== "code").slice(0, 3));
      setRecentCodeNotes(sorted.filter((n) => n.noteType === "code").slice(0, 3));
      setHomeTasks(tasks);
    };
    load();
    const id = setInterval(load, 15000);
    window.addEventListener("storage", load);
    return () => { active = false; clearInterval(id); window.removeEventListener("storage", load); };
  }, [fetchNotes, fetchTasks]);

  // Load user settings from server
  useEffect(() => {
    let active = true;
    if (!currentUser?.id) { setSettingsReady(true); return; }
    setSettingsReady(false);
    (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/user/${currentUser.id}/settings`);
        if (!res.ok) { if (active) setSettingsReady(true); return; }
        const settings = await res.json();
        if (!active) return;
        if (Array.isArray(settings.countdowns)) setCountdowns(normalizeCountdowns(settings.countdowns));
        setWidgetConfig(normalizeWidgetConfig(settings.widgetConfig));
        if (Array.isArray(settings.focusSessions)) {
          const normalized = normalizeSessions(settings.focusSessions);
          try { localStorage.setItem(FOCUS_SESSIONS_KEY, JSON.stringify(normalized)); } catch {}
          loadFocusStats();
        }
      } catch {}
      if (active) setSettingsReady(true);
    })();
    return () => { active = false; };
  }, [currentUser?.id, loadFocusStats]);

  // Focus session events
  useEffect(() => {
    loadFocusStats();
    const handler = () => {
      loadFocusStats();
      if (!currentUser?.id || !settingsReady) return;
      try {
        const sessions = normalizeSessions(JSON.parse(localStorage.getItem(FOCUS_SESSIONS_KEY) || "[]"));
        fetch(`${API_URL}/auth/user/${currentUser.id}/settings`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ focusSessions: sessions }) }).catch(() => {});
      } catch {}
    };
    window.addEventListener("focusSessionComplete", handler);
    return () => window.removeEventListener("focusSessionComplete", handler);
  }, [loadFocusStats, currentUser?.id, settingsReady]);

  // Sync countdowns
  useEffect(() => {
    try { localStorage.setItem(COUNTDOWNS_KEY, JSON.stringify(countdowns)); } catch {}
    if (!currentUser?.id || !settingsReady) return;
    fetch(`${API_URL}/auth/user/${currentUser.id}/settings`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ countdowns: normalizeCountdowns(countdowns) }) }).catch(() => {});
  }, [countdowns, currentUser?.id, settingsReady]);

  // Sync widget config
  useEffect(() => {
    try { localStorage.setItem(WIDGET_CONFIG_KEY, JSON.stringify(widgetConfig)); } catch {}
    if (!currentUser?.id || !settingsReady) return;
    fetch(`${API_URL}/auth/user/${currentUser.id}/settings`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ widgetConfig: normalizeWidgetConfig(widgetConfig) }) }).catch(() => {});
  }, [widgetConfig, currentUser?.id, settingsReady]);

  // --- Handlers ---
  const showStatus = (msg: string) => { setQuickActionStatus(msg); setTimeout(() => setQuickActionStatus(""), 2200); };
  const navigateTo = (tab: TabKey) => { onNavigate(tab); showStatus(`Opened ${tab}`); };

  const toggleHomeTask = async (id: string) => {
    setHomeTasks((prev) => prev.filter((t) => t.id !== id));
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
    if (currentUser?.id) {
      try { await fetch(`${API_URL}/tasks/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: true }) }); } catch {}
    } else {
      try {
        const raw = localStorage.getItem("checklist:items");
        if (raw) localStorage.setItem("checklist:items", JSON.stringify((JSON.parse(raw) as Task[]).map((t) => t.id === id ? { ...t, completed: true, completedAt: Date.now() } : t)));
      } catch {}
    }
  };

  const createQuickNote = async (text: string): Promise<boolean> => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    setQuickNoteSaving(true);
    const payload = { title: "", content: `<p>${trimmed}</p>`, font: "inter", fontSize: 16, theme: "default", noteType: "text", language: "python", userId: currentUser?.id ?? null };
    try {
      if (currentUser?.id) {
        await fetch(`${API_URL}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        const ts = Date.now();
        const local = { ...payload, id: `${ts}-${Math.random().toString(36).slice(2)}`, createdAt: ts, lastModified: ts };
        localStorage.setItem("localNotes", JSON.stringify([local, ...JSON.parse(localStorage.getItem("localNotes") || "[]")]));
      }
    } catch {}
    setQuickNoteText("");
    setQuickNoteSaving(false);
    setQuickNoteSuccess(true);
    setTimeout(() => setQuickNoteSuccess(false), 2000);
    return true;
  };

  const shuffleThemeAndFont = async () => {
    const pick = <T extends { id: string; label: string }>(opts: T[], cur: string): T => {
      const pool = opts.filter((o) => o.id !== cur);
      return (pool.length ? pool : opts)[Math.floor(Math.random() * (pool.length || opts.length))] ?? opts[0]!;
    };
    const theme = pick(COLOR_OPTIONS, localStorage.getItem("settings:selected") || "zero");
    const font = pick(FONT_OPTIONS, localStorage.getItem("settings:font") || "mono");
    localStorage.setItem("settings:selected", theme.id);
    localStorage.setItem("settings:font", font.id);
    applyTheme(theme.id);
    applyFont(font.id);
    if (currentUser?.id) {
      try { await fetch(`${API_URL}/auth/user/${currentUser.id}/settings`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ colorTheme: theme.id, fontTheme: font.id }) }); } catch {}
    }
    showStatus(`Shuffled ${theme.label} + ${font.label}`);
  };

  // --- Countdown handlers ---
  const resetNewDate = () => { const t = todayParts(); setNewMonth(t.month); setNewDay(t.day); setNewYear(t.year); };

  const addCountdown = () => {
    if (!newCountdownLabel.trim()) return;
    setCountdowns((prev) => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, label: newCountdownLabel.trim(), targetDate: buildDateStr(newYear, newMonth, newDay) }]);
    setNewCountdownLabel(""); resetNewDate(); setShowAddCountdown(false);
  };

  const saveEditCountdown = () => {
    if (!editingCountdown?.label.trim()) return;
    setCountdowns((prev) => prev.map((c) => c.id === editingCountdown.id
      ? { ...c, label: editingCountdown.label.trim(), targetDate: buildDateStr(editingCountdown.year, editingCountdown.month, editingCountdown.day) }
      : c));
    setEditingCountdown(null);
  };

  const getDaysUntil = (targetDate: string) => Math.ceil((new Date(targetDate + "T00:00:00").getTime() - Date.now()) / 86400000);

  // --- Widget config handlers ---
  const toggleWidgetVisible = (id: WidgetId) => setWidgetConfig((prev) => prev.map((w) => w.id === id ? { ...w, visible: !w.visible } : w));

  const setWidgetSize = (id: WidgetId, size: WidgetConfig["size"]) => setWidgetConfig((prev) => prev.map((w) => {
    if (w.id !== id || (LARGE_ONLY_WIDGETS.has(id) && size !== "large") || (NON_SMALL_WIDGETS.has(id) && size === "small")) return w;
    return { ...w, size };
  }));

  const moveWidget = (id: WidgetId, dir: -1 | 1) => setWidgetConfig((prev) => {
    const vis = prev.filter((w) => w.visible);
    const from = vis.findIndex((w) => w.id === id);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= vis.length) return prev;
    const next = [...vis];
    [next[from], next[to]] = [next[to]!, next[from]!];
    let i = 0; return prev.map((w) => w.visible ? next[i++]! : w);
  });

  const reorderWidgets = (dragId: WidgetId, targetId: WidgetId) => {
    if (dragId === targetId) return;
    setWidgetConfig((prev) => {
      const vis = prev.filter((w) => w.visible);
      const from = vis.findIndex((w) => w.id === dragId);
      const to = vis.findIndex((w) => w.id === targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...vis];
      const [moved] = next.splice(from, 1);
      if (!moved) return prev;
      next.splice(to, 0, moved);
      let i = 0; return prev.map((w) => w.visible ? next[i++]! : w);
    });
  };

  const visibleWidgets = widgetConfig.filter((w) => w.visible);
  const hiddenWidgets = widgetConfig.filter((w) => !w.visible);

  // --- Widget map ---
  const widgetMap: Record<WidgetId, ReactElement> = {
    today: (
      <div className="home-info" onClick={() => setExpandedToday(true)} style={{ cursor: "pointer" }}>
        <h2>Today</h2>
        <div className="home-info-time">{currentTime}</div>
        <div className="home-info-date-row"><CalendarIcon /><span className="home-info-date">{dateLabel()}</span></div>
        <div className="home-info-weather-row"><CloudIcon /><Weather city={weatherCity} /></div>
      </div>
    ),

    "quick-actions": (
      <div className="home-quick-actions">
        <h2>Quick Actions</h2>
        <div className="quick-actions-buttons">
          <button className="quick-action-btn" onClick={shuffleThemeAndFont}>
            <span className="action-icon"><HomeNavIcon /></span>Shuffle Theme + Font
          </button>
          <button className="quick-action-btn" onClick={() => { setCaptureModalText(quickNoteText); setShowCaptureModal(true); }}>
            <span className="action-icon"><NotesNavIcon /></span>Capture Note
          </button>
          <button className="quick-action-btn" onClick={handlePomodoroToggle}>
            <span className="action-icon play">▶</span>{isRunning ? "Pause Timer" : "Start Timer"}
          </button>
          <button className="quick-action-btn" onClick={() => navigateTo("notes")}>
            <span className="action-icon notes"><NotesNavIcon /></span>Open Notes
          </button>
          <button className="quick-action-btn" onClick={() => navigateTo("tasks")}>
            <span className="action-icon"><TasksNavIcon /></span>Open Tasks
          </button>
          <button className="quick-action-btn" onClick={() => navigateTo("settings")}>
            <span className="action-icon"><SettingsNavIcon /></span>Open Settings
          </button>
        </div>
        <div className="quick-actions-status" aria-live="polite">{quickActionStatus || " "}</div>
      </div>
    ),

    pinned: (
      <div className="home-pinned">
        <h2>Pinned Notes</h2>
        {pinnedNotes.length === 0 ? (
          <div className="home-empty-state">
            <p className="home-empty-state-text">No pinned notes yet</p>
            <p className="home-empty-state-hint">Pin a note to access it quickly</p>
          </div>
        ) : (
          <div className="home-pinned-list">
            {pinnedNotes.map((note) => (
              <div key={note.id} className="home-pinned-card" onClick={() => setExpandedNote(note)}>
                <div className="home-pinned-title">{note.title?.trim() || "Untitled"}</div>
                <div className="home-pinned-content">{stripHtml(note.content || "").slice(0, 200) || "(No content)"}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),

    recent: (
      <div className="home-recent">
        <h2>Recent Notes</h2>
        {recentNotes.length === 0 ? (
          <div className="home-empty-state">
            <p className="home-empty-state-text">No notes yet</p>
            <p className="home-empty-state-hint">Create your first note to get started</p>
          </div>
        ) : (
          <div className="home-recent-list">
            {recentNotes.map((note) => (
              <div key={note.id} className="home-recent-card" onClick={() => setExpandedNote(note)}>
                <div className="home-recent-title">{note.title?.trim() || "Untitled"}</div>
                <div className="home-recent-content">{stripHtml(note.content || "").slice(0, 150) || "(No content)"}</div>
                {note.lastModified && <div className="home-recent-time">{fmtNoteDate(note.lastModified)}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    ),

    "recent-code": (
      <div className="home-recent-code">
        <h2>Recent Code</h2>
        {recentCodeNotes.length === 0 ? (
          <div className="home-empty-state">
            <p className="home-empty-state-text">No code notes yet</p>
            <p className="home-empty-state-hint">Create a code note to see it here</p>
          </div>
        ) : (
          <div className="home-recent-list">
            {recentCodeNotes.map((note) => (
              <div key={note.id} className="home-recent-card home-recent-code-card" onClick={() => setExpandedNote(note)}>
                <div className="home-recent-title home-recent-code-title-row">
                  <span>{note.title?.trim() || "Untitled"}</span>
                  <span className="home-recent-code-lang">{(note.language || "code").toUpperCase()}</span>
                </div>
                <pre className="home-recent-code-content"><code>{getCodePreview(note.content || "")}</code></pre>
                {note.lastModified && <div className="home-recent-time">{fmtNoteDate(note.lastModified)}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    ),

    tasks: (
      <div className="home-tasks">
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
                  <input type="checkbox" checked={false} onChange={() => toggleHomeTask(task.id)} />
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
      <div className="home-quick-note">
        <h2>Capture Note</h2>
        <form onSubmit={(e) => { e.preventDefault(); createQuickNote(quickNoteText); }}>
          <textarea className="quick-note-input" placeholder="Capture something quickly..." value={quickNoteText} onChange={(e) => setQuickNoteText(e.target.value)} />
          <button type="submit" className={`quick-note-btn${quickNoteSuccess ? " success" : ""}`} disabled={quickNoteSaving || !quickNoteText.trim()}>
            {quickNoteSaving ? "Saving..." : quickNoteSuccess ? "Saved!" : "Save Capture"}
          </button>
        </form>
      </div>
    ),

    "focus-stats": (
      <div className="home-focus-stats">
        <h2>Focus Stats</h2>
        <div className="focus-stats-grid">
          {[
            { value: focusStats.todaySessions, label: "Sessions Today" },
            { value: `${focusStats.todayMinutes}m`, label: "Focus Time Today" },
            { value: focusStats.weekSessions, label: "Sessions This Week" },
            { value: `${focusStats.weekMinutes}m`, label: "Focus Time (Week)" },
          ].map(({ value, label }) => (
            <div key={label} className="focus-stat-item">
              <div className="focus-stat-value">{value}</div>
              <div className="focus-stat-label">{label}</div>
            </div>
          ))}
        </div>
      </div>
    ),

    countdowns: (
      <div className="home-countdowns">
        <div className="countdown-header">
          <h2>Countdowns</h2>
          {!showAddCountdown && <button className="countdown-top-add-btn" onClick={() => setShowAddCountdown(true)} aria-label="Add countdown">+</button>}
        </div>
        {countdowns.length === 0 && !showAddCountdown && (
          <div className="home-empty-state">
            <p className="home-empty-state-text">No countdowns yet</p>
            <p className="home-empty-state-hint">Track important dates</p>
          </div>
        )}
        {countdowns.length > 0 && (
          <div className="countdown-list">
            {countdowns.map((cd) => {
              const days = getDaysUntil(cd.targetDate);
              if (editingCountdown?.id === cd.id) {
                return (
                  <div key={cd.id} className="countdown-edit-row">
                    <input className="countdown-input" value={editingCountdown.label} onChange={(e) => setEditingCountdown({ ...editingCountdown, label: e.target.value })} placeholder="Label" autoFocus />
                    <DatePickerSelects
                      month={editingCountdown.month} day={editingCountdown.day} year={editingCountdown.year}
                      onMonth={(m) => setEditingCountdown({ ...editingCountdown, month: m })}
                      onDay={(d) => setEditingCountdown({ ...editingCountdown, day: d })}
                      onYear={(y) => setEditingCountdown({ ...editingCountdown, year: y })}
                    />
                    <div className="countdown-form-actions">
                      <button className="countdown-add-submit" onClick={saveEditCountdown}>Save</button>
                      <button className="countdown-cancel" onClick={() => setEditingCountdown(null)}>Cancel</button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={cd.id} className={`countdown-row${days <= 0 ? " ended" : days <= 3 ? " urgent" : ""}`}>
                  <div className="countdown-num-block">
                    <span className="countdown-days">{Math.max(0, days)}</span>
                    <span className="countdown-unit">days</span>
                  </div>
                  <div className="countdown-info">
                    <div className="countdown-label">{cd.label}</div>
                    <div className="countdown-date">{new Date(cd.targetDate + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div>
                  </div>
                  <div className="countdown-actions">
                    <button className="countdown-edit-btn" onClick={() => { const p = parseDateStr(cd.targetDate); setEditingCountdown({ id: cd.id, label: cd.label, month: p.month, day: p.day, year: p.year }); }} aria-label="Edit countdown"><PencilIcon /></button>
                    <button className="countdown-remove" onClick={() => { if (editingCountdown?.id === cd.id) setEditingCountdown(null); setCountdowns((prev) => prev.filter((c) => c.id !== cd.id)); }} aria-label="Remove countdown"><TrashIcon /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {showAddCountdown && (
          <form className="countdown-add-form" onSubmit={(e) => { e.preventDefault(); addCountdown(); }}>
            <input className="countdown-input" placeholder="Label (e.g. Birthday)" value={newCountdownLabel} onChange={(e) => setNewCountdownLabel(e.target.value)} required />
            <DatePickerSelects month={newMonth} day={newDay} year={newYear} onMonth={setNewMonth} onDay={setNewDay} onYear={setNewYear} />
            <div className="countdown-form-actions">
              <button type="submit" className="countdown-add-submit">Add</button>
              <button type="button" className="countdown-cancel" onClick={() => { setShowAddCountdown(false); setNewCountdownLabel(""); resetNewDate(); }}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    ),

    pomodoro: (
      <div className="home-pomodoro">
        <h2>Pomodoro Timer</h2>
        <div className="pomodoro-widget">
          <div className={`pomodoro-display ${isWorkSession ? "work" : "break"}`} onClick={() => setFullScreenPomodoro(true)} style={{ cursor: "pointer" }}>
            <div className="pomodoro-session">{isWorkSession ? "Lock In Session" : "Break Time"}</div>
            <div className="pomodoro-time">{formatTime(pomodoroTime)}</div>
          </div>
          <div className="pomodoro-controls">
            <button className="pomodoro-btn" onClick={handlePomodoroToggle} title={isRunning ? "Pause timer" : "Start timer"} aria-label={isRunning ? "Pause" : "Start"}>{isRunning ? <PauseIcon /> : <PlayIcon />}</button>
            <button className="pomodoro-btn" onClick={handlePomodoroSkip} title="Skip to next session" aria-label="Skip"><SkipIcon /></button>
            <button className="pomodoro-btn" onClick={handlePomodoroReset} title="Reset timer" aria-label="Reset"><ResetIcon /></button>
          </div>
        </div>
      </div>
    ),
  };

  // --- Render ---
  return (
    <div id="home-wrapper">
      {showShutdownBanner && (
        <div className="shutdown-banner" role="alert">
          <div className="shutdown-banner-icon" aria-hidden="true">!</div>
          <div className="shutdown-banner-body">
            <span className="shutdown-banner-label">Notice</span>
            <span className="shutdown-banner-text">ThinkLoop is ending development. Please export any data you wish to keep before servers shut down.</span>
            <span className="shutdown-banner-date">Shutdown date: May 15, 2026</span>
          </div>
          <button
            className="shutdown-banner-close"
            aria-label="Dismiss"
            onClick={() => { localStorage.setItem("thinkloop-shutdown-banner-dismissed", "1"); setShowShutdownBanner(false); }}
          >✕</button>
        </div>
      )}

      <div className="home-welcome-banner">
        <span className="home-welcome-greeting">
          {greeting()}{currentUser ? `, ${currentUser.name || currentUser.username}` : ""}
        </span>
      </div>

      <div id="home-content">
        {visibleWidgets.map((w) => (
          <div key={w.id} className={`widget-cell widget-cell-${w.size} widget-cell-${w.id}`}>
            {widgetMap[w.id]}
          </div>
        ))}

        {!isEditingWidgets && (
          <div className="widget-cell widget-cell-row">
            <button className="home-edit-btn" onClick={() => setIsEditingWidgets(true)}>
              <span className="home-edit-btn-icon"><PencilIcon /></span>
              <span className="home-edit-btn-copy">
                <span className="home-edit-btn-title">Edit widgets</span>
                <span className="home-edit-btn-subtitle">Arrange, hide, and resize</span>
              </span>
            </button>
          </div>
        )}

        {/* Widget Edit Modal */}
        {isEditingWidgets && (
          <div className="note-modal-overlay widget-edit-overlay" onClick={() => setIsEditingWidgets(false)}>
            <div className="widget-edit-popup" onClick={(e) => e.stopPropagation()}>
              <div className="widget-edit-header"><h2>Customize Widgets</h2></div>
              <div className="widget-edit-sections">
                <section className="widget-edit-section" aria-label="Visible widgets">
                  <div className="widget-edit-section-head"><h3>Visible</h3><span>{visibleWidgets.length}</span></div>
                  <ul className="widget-edit-list widget-edit-list-visible">
                    {visibleWidgets.map((w, index) => (
                      <li key={w.id}
                        className={`widget-edit-item draggable${draggedId === w.id ? " dragging" : ""}${dragOverId === w.id ? " drag-over" : ""}`}
                        draggable
                        onDragStart={() => { setDraggedId(w.id); setDragOverId(null); }}
                        onDragOver={(e) => { e.preventDefault(); if (draggedId && draggedId !== w.id) setDragOverId(w.id); }}
                        onDrop={(e) => { e.preventDefault(); if (draggedId) { reorderWidgets(draggedId, w.id); setDraggedId(null); setDragOverId(null); } }}
                        onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
                      >
                        <div className="widget-edit-main">
                          <span className="widget-drag-handle" aria-hidden="true">≡</span>
                          <div className="widget-edit-copy"><span className="widget-edit-label">{w.label}</span></div>
                        </div>
                        <div className="widget-edit-controls">
                          <div className="widget-size-group" role="group" aria-label="Widget size">
                            {(["small", "medium", "large"] as const).map((size) => (
                              <button key={size} className={`widget-size-pill${w.size === size ? " active" : ""}`}
                                onClick={() => setWidgetSize(w.id, size)}
                                disabled={LARGE_ONLY_WIDGETS.has(w.id) && size !== "large"}
                                aria-label={`Set size to ${size}`}>
                                {size[0]?.toUpperCase()}
                              </button>
                            ))}
                          </div>
                          <div className="widget-edit-arrows">
                            <button className="widget-arrow-btn" disabled={index === 0} onClick={() => moveWidget(w.id, -1)} aria-label="Move up">▲</button>
                            <button className="widget-arrow-btn" disabled={index === visibleWidgets.length - 1} onClick={() => moveWidget(w.id, 1)} aria-label="Move down">▼</button>
                          </div>
                          <button className="widget-visibility-btn" onClick={() => toggleWidgetVisible(w.id)} aria-label="Hide widget">Hide</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="widget-edit-section" aria-label="Hidden widgets">
                  <div className="widget-edit-section-head"><h3>Hidden</h3><span>{hiddenWidgets.length}</span></div>
                  <ul className="widget-edit-list">
                    {hiddenWidgets.map((w) => (
                      <li key={w.id} className="widget-edit-item hidden-item">
                        <div className="widget-edit-main">
                          <div className="widget-edit-copy">
                            <span className="widget-edit-label muted">{w.label}</span>
                            <span className="widget-edit-meta">Hidden</span>
                          </div>
                        </div>
                        <button className="widget-visibility-btn show" onClick={() => toggleWidgetVisible(w.id)} aria-label="Show widget">Show</button>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
              <div className="widget-edit-footer">
                <button className="widget-edit-reset" onClick={() => setWidgetConfig(cloneDefaults())}>Reset Layout to Default</button>
                <button className="widget-edit-done" onClick={() => setIsEditingWidgets(false)}>Done</button>
              </div>
            </div>
          </div>
        )}

        {/* Capture Modal */}
        {showCaptureModal && (
          <div className="note-modal-overlay" onClick={() => setShowCaptureModal(false)}>
            <div className="capture-modal-popup" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn capture-modal-close-btn" onClick={() => setShowCaptureModal(false)} aria-label="Close">←</button>
              <div className="capture-modal-header">
                <h2>Capture Note</h2>
                <p className="capture-modal-subtitle">Will be saved to notes.</p>
              </div>
              <textarea className="capture-modal-input" placeholder="Type your note..." value={captureModalText} onChange={(e) => setCaptureModalText(e.target.value)} autoFocus />
              <div className="capture-modal-actions">
                <button className="capture-modal-save-btn"
                  onClick={async () => { const saved = await createQuickNote(captureModalText); if (saved) { setShowCaptureModal(false); setCaptureModalText(""); showStatus("Capture saved"); } }}
                  disabled={quickNoteSaving || !captureModalText.trim()}>
                  {quickNoteSaving ? "Saving..." : "Save Capture"}
                </button>
                <button className="capture-modal-cancel-btn" onClick={() => setShowCaptureModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Expanded Note Modal */}
        {expandedNote && (
          <div className="note-modal-overlay" onClick={() => setExpandedNote(null)}>
            <div className="note-modal-popup" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={() => setExpandedNote(null)} aria-label="Close note">←</button>
              <div className="modal-note-title">{expandedNote.title?.trim() || "Untitled"}</div>
              {expandedNote.noteType === "code" ? (
                <div className="modal-note-code-wrap">
                  <div className="modal-note-code-lang">{(expandedNote.language || "code").toUpperCase()}</div>
                  <pre className="modal-note-content modal-note-content-code"><code>{expandedNote.content || "// No code content"}</code></pre>
                </div>
              ) : (
                <div className="modal-note-content" dangerouslySetInnerHTML={{ __html: expandedNote.content || "(No content)" }} />
              )}
              {expandedNote.lastModified && <div className="modal-note-footer">Last modified: {new Date(expandedNote.lastModified).toLocaleString()}</div>}
            </div>
          </div>
        )}

        {/* Full Screen Pomodoro Modal */}
        {fullScreenPomodoro && (
          <div className="note-modal-overlay widget-fullscreen-overlay" onClick={() => setFullScreenPomodoro(false)}>
            <div className="pomodoro-modal-popup" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={() => setFullScreenPomodoro(false)} aria-label="Close timer">←</button>
              <div className="pomodoro-modal-header"><h1>Pomodoro Timer</h1></div>
              <div className={`pomodoro-modal-display ${isWorkSession ? "work" : "break"}`}>
                <div className="pomodoro-modal-session">{isWorkSession ? "Work Session" : "Break Time"}</div>
                <div className="pomodoro-modal-time">{formatTime(pomodoroTime)}</div>
              </div>
              <div className="pomodoro-modal-controls">
                {([
                  { icon: isRunning ? <PauseIcon /> : <PlayIcon />, label: isRunning ? "Pause" : "Start", onClick: handlePomodoroToggle },
                  { icon: <SkipIcon />, label: "Skip", onClick: handlePomodoroSkip },
                  { icon: <ResetIcon />, label: "Reset", onClick: handlePomodoroReset },
                ] as const).map(({ icon, label, onClick }) => (
                  <button key={label} className="pomodoro-modal-btn" onClick={onClick}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>{icon} {label}</span>
                  </button>
                ))}
              </div>
              <div className="pomodoro-settings">
                <h3>Customize Duration</h3>
                <div className="setting-group">
                  <label>Work Session (minutes):
                    <input type="number" min="1" max="60" value={workDuration} onChange={(e) => { const v = Math.max(1, Math.min(60, parseInt(e.target.value) || 1)); setWorkDuration(v); if (isWorkSession && !isRunning) setPomodoroTime(v * 60); }} />
                  </label>
                </div>
                <div className="setting-group">
                  <label>Break Session (minutes):
                    <input type="number" min="1" max="30" value={breakDuration} onChange={(e) => { const v = Math.max(1, Math.min(30, parseInt(e.target.value) || 1)); setBreakDuration(v); if (!isWorkSession && !isRunning) setPomodoroTime(v * 60); }} />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expanded Today Modal */}
        {expandedToday && (
          <div className="note-modal-overlay widget-fullscreen-overlay" onClick={() => setExpandedToday(false)}>
            <div className="today-modal-popup" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={() => setExpandedToday(false)} aria-label="Close">←</button>
              <div className="today-modal-header"><h1>Today</h1></div>
              <div className="today-modal-content">
                <div className="today-modal-primary">
                  <div className="today-modal-time">{currentTimeWithSeconds}</div>
                  <div className="today-modal-date-row"><CalendarIcon /><span className="today-modal-date">{dateLabel()}</span></div>
                  <div className="today-modal-weather-row"><CloudIcon /><Weather city={weatherCity} /></div>
                </div>
                <div className="today-modal-stats">
                  {[
                    { label: "Week", value: getIsoWeek(now) },
                    { label: "Day", value: getDayOfYear(now) },
                    { label: "Timezone", value: getTzShort(now) },
                  ].map(({ label, value }) => (
                    <div key={label} className="today-modal-stat">
                      <span className="today-modal-stat-label">{label}</span>
                      <span className="today-modal-stat-value">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="today-day-progress">
                  <div className="today-day-progress-header"><span>Day Progress</span><span>{dayProgress}%</span></div>
                  <div className="today-day-progress-track"><div className="today-day-progress-fill" style={{ width: `${dayProgress}%` }} /></div>
                </div>
                <div className="today-modal-meta">{getDayOfYear(now)} of {getDaysInYear(now.getFullYear())} days this year</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
