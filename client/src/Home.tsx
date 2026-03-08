import React, { useState, useEffect, useCallback } from "react";
import Weather from "./Weather";
import "./Home.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

// --- Types ---
interface HomeProps {
  weatherCity?: string;
  currentUser?: { id?: string | number } | null;
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
}

// --- Reusable Icons ---
const PauseIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="currentColor"
    style={{ display: "block", margin: "0 auto" }}
  >
    <rect x="9" y="8" width="4" height="16" rx="2" />
    <rect x="19" y="8" width="4" height="16" rx="2" />
  </svg>
);

const PlayIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="currentColor"
    style={{ display: "block", margin: "0 auto" }}
  >
    <path d="M9 9C9 7.8 10.3 7.2 11.3 7.8L23.3 14.8C24.2 15.4 24.2 16.6 23.3 17.2L11.3 24.2C10.3 24.8 9 24.2 9 23Z" />
  </svg>
);

const SkipIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="currentColor"
    style={{ display: "block", margin: "0 auto" }}
  >
    <path d="M8 9C8 7.8 9.3 7.2 10.3 7.8L18.3 14.8C19.2 15.4 19.2 16.6 18.3 17.2L10.3 24.2C9.3 24.8 8 24.2 8 23Z" />
    <rect x="21" y="8" width="3" height="16" rx="1.5" />
  </svg>
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
  // State
  const [now, setNow] = useState<Date>(new Date());
  const [pinnedNotes, setPinnedNotes] = useState<Note[]>([]);
  const [expandedNote, setExpandedNote] = useState<Note | null>(null);
  const [expandedToday, setExpandedToday] = useState<boolean>(false);

  // Derived Time & Date values
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
    const remainder = day % 100;
    if (remainder >= 11 && remainder <= 13) return "th";
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

  // Utilities
  const stripHtml = (value: string) =>
    value
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const getPinnedNotes = useCallback(async () => {
    if (!currentUser?.id) return [];
    try {
      const response = await fetch(`${API_URL}/notes?userId=${currentUser.id}`);
      if (!response.ok) throw new Error("Failed to fetch notes");

      const serverNotes: Note[] = await response.json();
      return serverNotes.filter((note) => note.isPinned) || [];
    } catch (e) {
      console.error("Failed to fetch pinned notes:", e);
      return [];
    }
  }, [currentUser]);

  // Effects
  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadPinned = async () => {
      const next = await getPinnedNotes();
      if (isActive) setPinnedNotes(next);
    };

    loadPinned();
    const intervalId = setInterval(loadPinned, 15000);
    window.addEventListener("storage", loadPinned);

    return () => {
      isActive = false;
      clearInterval(intervalId);
      window.removeEventListener("storage", loadPinned);
    };
  }, [getPinnedNotes]);

  return (
    <div id="home-content">
      {/* --- Today Widget --- */}
      <div
        className="home-info"
        onClick={() => setExpandedToday(true)}
        style={{ cursor: "pointer" }}
      >
        <h2>Today</h2>
        <div className="home-info-time">{currentTime}</div>
        <Weather city={weatherCity} />
        <div className="home-info-date">{getCurrentDateLabel()}</div>
      </div>

      {/* --- Pinned Notes Widget --- */}
      <div className="home-pinned">
        <h2>Pinned Notes</h2>
        {pinnedNotes.length === 0 ? (
          <p className="home-pinned-empty">No pinned notes yet</p>
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

      {/* --- Mini Pomodoro Widget --- */}
      <div className="home-pomodoro">
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
              ✕
            </button>
            <div className="modal-note-title">
              {expandedNote.title?.trim() || "Untitled"}
            </div>
            <div
              className="modal-note-content"
              dangerouslySetInnerHTML={{
                __html: expandedNote.content || "(No content)",
              }}
            />
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
              ✕
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
                title={isRunning ? "Pause" : "Start"}
                aria-label={isRunning ? "Pause" : "Start"}
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
                title="Skip to next session"
                aria-label="Skip"
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
                title="Reset timer"
                aria-label="Reset"
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
                      const val = Math.max(
                        1,
                        Math.min(60, parseInt(e.target.value) || 1),
                      );
                      setWorkDuration(val);
                      if (isWorkSession && !isRunning)
                        setPomodoroTime(val * 60);
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
                      const val = Math.max(
                        1,
                        Math.min(30, parseInt(e.target.value) || 1),
                      );
                      setBreakDuration(val);
                      if (!isWorkSession && !isRunning)
                        setPomodoroTime(val * 60);
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
              ✕
            </button>

            <div className="today-modal-header">
              <h1>Today</h1>
            </div>

            <div className="today-modal-content">
              <div className="today-modal-time">{currentTimeWithSeconds}</div>
              <div className="today-modal-date">{getCurrentDateLabel()}</div>
              <div className="today-modal-weather">
                <Weather city={weatherCity} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
