import React from "react";
import "./Navbar.css";

type TabKey = "home" | "notes" | "tasks" | "settings";

interface NavbarProps {
  activeTab?: TabKey;
  onChangeTab?: (tab: TabKey) => void;
  pomodoroTime?: number;
  isRunning?: boolean;
  isWorkSession?: boolean;
}

const IconHome = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
    <polyline points="9 21 9 12 15 12 15 21" />
  </svg>
);

const IconNotes = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="13" y2="17" />
  </svg>
);

const IconTasks = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const IconSettings = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const Navbar: React.FC<NavbarProps> = ({
  activeTab = "home",
  onChangeTab = () => {},
  pomodoroTime = 0,
  isRunning = false,
  isWorkSession = true,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "home",     label: "Home",     icon: <IconHome /> },
    { key: "notes",    label: "Notes",    icon: <IconNotes /> },
    { key: "tasks",    label: "Tasks",    icon: <IconTasks /> },
    { key: "settings", label: "Settings", icon: <IconSettings /> },
  ];


  return (
    <nav className="navbar">
      <ul className="nav-links">
        <li>
          <span className="nav-brand">ThinkLoop</span>
        </li>
        <li className="nav-divider" aria-hidden="true" />
        {tabs.map(({ key, label, icon }) => (
          <li key={key}>
            <button
              className={activeTab === key ? "active" : ""}
              onClick={() => onChangeTab(key)}
              aria-label={label}
            >
              {key === "home" && isRunning ? (
                <span className={`nav-timer-pill${isWorkSession ? " nav-timer-pill--work" : " nav-timer-pill--break"}`}>
                  <span className="nav-timer-time">{formatTime(pomodoroTime)}</span>
                </span>
              ) : (
                icon
              )}
              <span className="nav-tooltip">{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navbar;
