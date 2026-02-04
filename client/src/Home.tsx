import React, { useState, useEffect, useCallback } from "react";
import Weather from "./Weather";
import "./Home.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

interface HomeProps {
  weatherCity?: string;
  currentUser?: { id?: string | number } | null;
}

export default function Home({ weatherCity, currentUser }: HomeProps) {
  const [currentTime, setCurrentTime] = useState<string>("");
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

  const getCurrentTime = () => {
    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
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
    return `Today is ${weekday} ${month} ${day}${getOrdinalSuffix(day)}`;
  };

  const currentDateLabel = getCurrentDateLabel();

  const getPinnedNotes = useCallback(async () => {
    try {
      const pinnedKey = currentUser?.id
        ? `pinnedNotes:${currentUser.id}`
        : "pinnedNotes:guest";
      const rawPinned = localStorage.getItem(pinnedKey);
      const pinnedIds: string[] = rawPinned ? JSON.parse(rawPinned) : [];

      if (currentUser?.id) {
        const response = await fetch(
          `${API_URL}/notes?userId=${currentUser.id}`,
        );
        if (response.ok) {
          const serverNotes = await response.json();
          const serverMap = new Map<string, any>(
            serverNotes.map((note: any) => [String(note.id), note]),
          );
          return pinnedIds
            .map((id) => serverMap.get(String(id)))
            .filter(Boolean);
        }
      }

      const rawNotes = localStorage.getItem("notes");
      const rawLocalNotes = localStorage.getItem("localNotes");
      const notes = [
        ...(rawNotes ? JSON.parse(rawNotes) : []),
        ...(rawLocalNotes ? JSON.parse(rawLocalNotes) : []),
      ];

      const mergedMap = new Map<string, any>();
      for (const note of notes) {
        const id = String(note.id);
        const existing = mergedMap.get(id);
        if (
          !existing ||
          (note.lastModified || 0) > (existing.lastModified || 0)
        ) {
          mergedMap.set(id, note);
        }
      }

      return pinnedIds.map((id) => mergedMap.get(String(id))).filter(Boolean);
    } catch (e) {
      return [];
    }
  }, [currentUser]);

  const stripHtml = (value: string) =>
    value
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

  useEffect(() => {
    setCurrentTime(getCurrentTime());

    const intervalId = setInterval(() => {
      setCurrentTime(getCurrentTime());
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
      <h1>{currentTime}</h1>
      <Weather city={weatherCity} />
      <p className="home-date">{currentDateLabel}</p>

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
    </div>
  );
}
