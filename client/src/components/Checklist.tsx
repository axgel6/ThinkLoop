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
  const [currentTime, setCurrentTime] = React.useState(new Date());

  // Fetch tasks from server on mount
  React.useEffect(() => {
    const fetchTasks = async () => {
      try {
        if (!currentUser) {
          return;
        }

        const mergeKey = `tasksmerged:${currentUser.id}`;
        const alreadyMerged = localStorage.getItem(mergeKey) === "true";

        const url = `${API_URL}/tasks?userId=${currentUser.id}`;
        const response = await fetch(url);
        if (response.ok) {
          const serverTasks = await response.json();

          // Only merge local tasks once per user
          if (!alreadyMerged) {
            const localTasks = localStorage.getItem(STORAGE_KEY);
            if (localTasks) {
              const parsedLocalTasks = JSON.parse(localTasks);

              // Upload each local task to the server
              for (const localTask of parsedLocalTasks) {
                try {
                  const taskToUpload: any = {
                    text: localTask.text,
                    completed: localTask.completed,
                    userId: currentUser.id,
                  };
                  if (localTask.completedAt) {
                    taskToUpload.completedAt = localTask.completedAt;
                  }

                  await fetch(`${API_URL}/tasks`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(taskToUpload),
                  });
                } catch (error) {
                  console.error("Failed to upload local task:", error);
                }
              }

              // Clear local tasks after uploading
              localStorage.removeItem(STORAGE_KEY);

              // Re-fetch to get all tasks including newly uploaded ones
              const refreshResponse = await fetch(url);
              if (refreshResponse.ok) {
                const allTasks = await refreshResponse.json();
                setItems(allTasks);
              } else {
                setItems(serverTasks);
              }
            } else {
              setItems(serverTasks);
            }

            // Mark as merged for this user
            localStorage.setItem(mergeKey, "true");
          } else {
            // Already merged, just load server tasks
            setItems(serverTasks);
          }
        }
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
      }
    };
    fetchTasks();
  }, [currentUser]);

  // Update time every second
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

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

  const addItem = async () => {
    const t = text.trim();
    if (!t) return;
    const now = Date.now();
    const id = `${now}-${Math.random().toString(36).slice(2)}`;
    const newItem = {
      id,
      text: t,
      completed: false,
      createdAt: now,
    };

    setItems((prev) => [newItem, ...prev]);
    setText("");

    // If logged in, create on server
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
        const createdTask = await response.json();
        // Replace local ID with server ID
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, id: createdTask.id } : item,
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
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        if (!i.completed) {
          return { ...i, completed: true, completedAt: Date.now() };
        }
        const { completedAt, ...rest } = i;
        return { ...rest, completed: false };
      }),
    );

    // If logged in, update on server
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

    // If logged in, delete from server
    if (!currentUser) return;

    try {
      await fetch(`${API_URL}/tasks/${id}`, { method: "DELETE" });
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    addItem();
  };

  return (
    <div
      style={{
        padding: "20px 16px",
        minHeight: "100vh",
      }}
    >
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
            <svg
              width="15"
              height="15"
              viewBox="0 0 50 50"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line
                x1="25"
                y1="5"
                x2="25"
                y2="45"
                stroke="var(--fg, white)"
                strokeWidth="10"
              />
              <line
                x1="5"
                y1="25"
                x2="45"
                y2="25"
                stroke="var(--fg, white)"
                strokeWidth="10"
              />
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
                x
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Tasks;
