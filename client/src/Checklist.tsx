import React from "react";
import Button from "./Button";
import "./Checklist.css";

type Item = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
};

const STORAGE_KEY = "checklist:items";

const Checklist: React.FC = () => {
  const [items, setItems] = React.useState<Item[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch {
      return [];
    }
  });

  const [text, setText] = React.useState("");
  const [currentTime, setCurrentTime] = React.useState(new Date());

  // Update time every minute
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  // Persist to localStorage whenever items change
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore quota errors
    }
  }, [items]);

  const sortedItems = React.useMemo(() => {
    const unchecked = items
      .filter((i) => !i.completed)
      .sort((a, b) => b.createdAt - a.createdAt); // newest first
    const checked = items
      .filter((i) => i.completed)
      .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0)); // older completions first
    return [...unchecked, ...checked];
  }, [items]);

  const addItem = () => {
    const t = text.trim();
    if (!t) return;
    const now = Date.now();
    setItems((prev) => [
      {
        id: `${now}-${Math.random().toString(36).slice(2)}`,
        text: t,
        completed: false,
        createdAt: now,
      },
      ...prev,
    ]);
    setText("");
  };

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        if (!i.completed) {
          // Mark as completed and set completedAt
          return { ...i, completed: true, completedAt: Date.now() };
        }
        // Mark as not completed and remove completedAt (not set to undefined)
        const { completedAt, ...rest } = i;
        return { ...rest, completed: false };
      })
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    addItem();
  };

  return (
    <div className="tasklist" role="region" aria-label="Reminders checklist">
      <div className="checklist-header">
        <h2>Hello! Here are your tasks for today</h2>
        <p className="muted">
          Today is {currentTime.toLocaleDateString()} at{" "}
          {currentTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      <form className="checklist-add" onSubmit={onSubmit}>
        <input
          className="checklist-input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What needs to be done?"
          aria-label="New task"
        />
        <Button type="submit" className="primary" onClick={() => {}}>
                    <svg width="15" height="15" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
  <line x1="25" y1="5" x2="25" y2="45" stroke="var(--fg, white)" stroke-width="10" />
  <line x1="5" y1="25" x2="45" y2="25" stroke="var(--fg, white)" stroke-width="10" />
</svg>

        </Button>
      </form>

      <ul className="checklist-items">
        {sortedItems.length === 0 && <li className="empty">No tasks yet</li>}
        {sortedItems.map((item) => (
          <li
            key={item.id}
            className={`checklist-item ${item.completed ? "completed" : ""}`}
          >
            <label className="checklist-label">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => toggleItem(item.id)}
                aria-label={
                  item.completed ? "Mark as not done" : "Mark as done"
                }
              />
              <span className="custom-checkbox"></span>
              <span className="text">{item.text}</span>
            </label>
            <button
              className="remove-task-btn"
              onClick={() => removeItem(item.id)}
              aria-label="Remove task"
              title="Remove task"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Checklist;
