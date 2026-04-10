import React, { useMemo } from "react";
import confetti from "canvas-confetti";
import "./Tasks.css";

type Item = {
  id: string;
  _clientId?: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
};

const STORAGE_KEY = "checklist:items";
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

interface TasksProps {
  currentUser?: { id?: string | number } | null;
}

const Tasks: React.FC<TasksProps> = ({ currentUser }) => {
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

  // Fetch tasks from server on mount
  React.useEffect(() => {
    const fetchTasks = async () => {
      try {
        if (!currentUser) return;

        const mergeKey = `tasksmerged:${currentUser.id}`;
        const alreadyMerged = localStorage.getItem(mergeKey) === "true";
        const url = `${API_URL}/tasks?userId=${currentUser.id}`;
        const response = await fetch(url);

        if (response.ok) {
          const serverTasks = await response.json();

          if (!alreadyMerged) {
            const localTasks = localStorage.getItem(STORAGE_KEY);
            if (localTasks) {
              const parsedLocalTasks = JSON.parse(localTasks);
              for (const localTask of parsedLocalTasks) {
                try {
                  const taskToUpload: any = {
                    text: localTask.text,
                    completed: localTask.completed,
                    userId: currentUser.id,
                  };
                  if (localTask.completedAt)
                    taskToUpload.completedAt = localTask.completedAt;
                  await fetch(`${API_URL}/tasks`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(taskToUpload),
                  });
                } catch (error) {
                  console.error("Failed to upload local task:", error);
                }
              }
              localStorage.removeItem(STORAGE_KEY);
              const refreshResponse = await fetch(url);
              if (refreshResponse.ok) {
                setItems(await refreshResponse.json());
              } else {
                setItems(serverTasks);
              }
            } else {
              setItems(serverTasks);
            }
            localStorage.setItem(mergeKey, "true");
          } else {
            setItems(serverTasks);
          }
        }
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
      }
    };
    fetchTasks();
  }, [currentUser]);

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore quota errors
    }
  }, [items]);

  const active = React.useMemo(
    () =>
      items
        .filter((i) => !i.completed)
        .sort((a, b) => b.createdAt - a.createdAt),
    [items],
  );
  const completed = React.useMemo(
    () =>
      items
        .filter((i) => i.completed)
        .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0)),
    [items],
  );

  const total = items.length;
  const doneCount = completed.length;
  const progressPct = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  const addItem = async () => {
    const t = text.trim();
    if (!t) return;
    const now = Date.now();
    const id = `${now}-${Math.random().toString(36).slice(2)}`;
    const newItem: Item = {
      id,
      _clientId: id,
      text: t,
      completed: false,
      createdAt: now,
    };
    setItems((prev) => [newItem, ...prev]);
    setText("");

    if (!currentUser) return;
    try {
      const response = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: t,
          completed: false,
          userId: currentUser.id,
        }),
      });
      if (response.ok) {
        const created = await response.json();
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, id: created.id } : item,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const toggleItem = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const newCompleted = !item.completed;
    if (newCompleted) {
      confetti({ particleCount: 100, spread: 2000, origin: { y: 0 } });
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        if (!i.completed)
          return { ...i, completed: true, completedAt: Date.now() };
        const { completedAt, ...rest } = i;
        return { ...rest, completed: false };
      }),
    );

    if (!currentUser) return;
    try {
      await fetch(`${API_URL}/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: newCompleted }),
      });
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const removeItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (!currentUser) return;
    try {
      await fetch(`${API_URL}/tasks/${id}`, { method: "DELETE" });
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const onSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    addItem();
  };

  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    [],
  );

  const hasBothCols = active.length > 0 && completed.length > 0;

  return (
    <div className="tasks-page">
      <div className="tasks-inner">
        <div className="tasks-header">
          <h2 className="tasks-title">Tasks</h2>
          <span className="tasks-date">{dateLabel}</span>
        </div>

        {total > 0 && (
          <div className="tasks-progress-row">
            <div className="tasks-progress-track">
              <div
                className="tasks-progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="tasks-progress-label">
              {doneCount}/{total}
            </span>
          </div>
        )}

        <form className="tasks-add-form" onSubmit={onSubmit}>
          <input
            className="tasks-input"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a task..."
            aria-label="New task"
          />
          <button type="submit" className="tasks-add-btn" aria-label="Add task">
            <svg
              width="14"
              height="14"
              viewBox="0 0 50 50"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line
                x1="25"
                y1="5"
                x2="25"
                y2="45"
                stroke="currentColor"
                strokeWidth="10"
              />
              <line
                x1="5"
                y1="25"
                x2="45"
                y2="25"
                stroke="currentColor"
                strokeWidth="10"
              />
            </svg>
          </button>
        </form>

        <div
          className={`tasks-body${hasBothCols ? "" : " single-col"}`}
          role="region"
          aria-label="Tasks"
        >
          <div className="tasks-col">
            {hasBothCols && (
              <p className="tasks-col-label">To do — {active.length}</p>
            )}
            <ul className="tasks-list">
              {active.length === 0 && completed.length === 0 && (
                <li className="tasks-empty">No tasks yet — add one above</li>
              )}
              {active.length === 0 && completed.length > 0 && (
                <li className="tasks-empty">All done!</li>
              )}
              {active.map((item) => (
                <TaskRow
                  key={item._clientId ?? item.id}
                  item={item}
                  onToggle={toggleItem}
                  onRemove={removeItem}
                />
              ))}
            </ul>
          </div>

          {completed.length > 0 && (
            <div className="tasks-col">
              {hasBothCols && (
                <p className="tasks-col-label">
                  Completed — {completed.length}
                </p>
              )}
              {!hasBothCols && <p className="tasks-col-label">Completed</p>}
              <ul className="tasks-list">
                {completed.map((item) => (
                  <TaskRow
                    key={item._clientId ?? item.id}
                    item={item}
                    onToggle={toggleItem}
                    onRemove={removeItem}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface TaskRowProps {
  item: { id: string; _clientId?: string; text: string; completed: boolean };
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

const TaskRow: React.FC<TaskRowProps> = ({ item, onToggle, onRemove }) => (
  <li className={`task-item${item.completed ? " completed" : ""}`}>
    <label className="task-label">
      <input
        type="checkbox"
        checked={item.completed}
        onChange={() => onToggle(item.id)}
        aria-label={item.completed ? "Mark as not done" : "Mark as done"}
      />
      <span className="task-checkbox" aria-hidden="true">
        <svg
          className="task-checkbox-check"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 8.2L6.3 11.2L13 4.8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="task-text" title={item.text}>
        {item.text}
      </span>
    </label>
    <button
      className="task-remove-btn"
      onClick={() => onRemove(item.id)}
      aria-label="Remove task"
      title="Remove task"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M3 6H21"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 6V4.6C8 3.72 8.72 3 9.6 3H14.4C15.28 3 16 3.72 16 4.6V6"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M18.4 6L17.65 18.15C17.58 19.32 16.61 20.22 15.44 20.22H8.56C7.39 20.22 6.42 19.32 6.35 18.15L5.6 6"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  </li>
);

export default Tasks;
