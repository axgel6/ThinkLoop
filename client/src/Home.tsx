import React, { useState, useEffect, useCallback } from "react";
import Weather from "./Weather";
import "./Home.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

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
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentTimeWithSeconds, setCurrentTimeWithSeconds] =
    useState<string>("");
  const [pinnedNotes, setPinnedNotes] = useState<
    Array<{
      id: string;
      title?: string;
      content?: string;
      lastModified?: number;
    }>
  >([]);
  const [expandedNote, setExpandedNote] = useState<{
    id: string;
    title?: string;
    content?: string;
    lastModified?: number;
  } | null>(null);
  const [expandedToday, setExpandedToday] = useState<boolean>(false);

  const getCurrentTime = () => {
    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date().toLocaleTimeString(undefined, options);
  };

  const getCurrentTimeWithSeconds = () => {
    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    return new Date().toLocaleTimeString(undefined, options);
  };

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
    const now = new Date();
    const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
    const month = now.toLocaleDateString(undefined, { month: "long" });
    const day = now.getDate();
    return `${weekday} ${month} ${day}${getOrdinalSuffix(day)}`;
  };

  const currentDateLabel = getCurrentDateLabel();

  const getPinnedNotes = useCallback(async () => {
    if (!currentUser?.id) return [];
    try {
      const response = await fetch(`${API_URL}/notes?userId=${currentUser.id}`);
      if (!response.ok) throw new Error("Failed to fetch notes");

      const serverNotes = await response.json();
      return (serverNotes.filter((note: any) => note.isPinned) || []) as Array<{
        id: string;
        title?: string;
        content?: string;
        lastModified?: number;
      }>;
    } catch (e) {
      console.error("Failed to fetch pinned notes:", e);
      return [];
    }
  }, [currentUser]);

  const stripHtml = (value: string) =>
    value
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    setCurrentTime(getCurrentTime());
    setCurrentTimeWithSeconds(getCurrentTimeWithSeconds());

    const intervalId = setInterval(() => {
      setCurrentTime(getCurrentTime());
      setCurrentTimeWithSeconds(getCurrentTimeWithSeconds());
    }, 1000);

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

    const handleStorage = () => loadPinned();
    window.addEventListener("storage", handleStorage);
    return () => {
      isActive = false;
      clearInterval(intervalId);
      window.removeEventListener("storage", handleStorage);
    };
  }, [getPinnedNotes]);

  return (
    <div id="home-content">
      <div
        className="home-info"
        onClick={() => setExpandedToday(true)}
        style={{ cursor: "pointer" }}
      >
        <h2>Today</h2>
        <div className="home-info-time">{currentTime}</div>
        <Weather city={weatherCity} />
        <div className="home-info-date">{currentDateLabel}</div>
      </div>

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
              title={isRunning ? "Pause" : "Start"}
            >
              {isRunning ? "⏸" : "▶"}
            </button>
            <button
              className="pomodoro-btn"
              onClick={handlePomodoroSkip}
              title="Skip to next session"
            >
              ⏭
            </button>
            <button
              className="pomodoro-btn"
              onClick={handlePomodoroReset}
              title="Reset timer"
            >
              ↻
            </button>
          </div>
        </div>
      </div>

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
              >
                {isRunning ? "⏸ Pause" : "▶ Start"}
              </button>
              <button
                className="pomodoro-modal-btn"
                onClick={handlePomodoroSkip}
                title="Skip to next session"
              >
                ⏭ Skip
              </button>
              <button
                className="pomodoro-modal-btn"
                onClick={handlePomodoroReset}
                title="Reset timer"
              >
                ↻ Reset
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
                      if (isWorkSession && !isRunning) {
                        setPomodoroTime(val * 60);
                      }
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
                      if (!isWorkSession && !isRunning) {
                        setPomodoroTime(val * 60);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <div className="today-modal-date">{currentDateLabel}</div>
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
