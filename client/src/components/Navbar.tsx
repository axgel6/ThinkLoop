import React from "react";
import "./Navbar.css";

type TabKey = "home" | "notes" | "tasks" | "settings";

interface NavbarProps {
  activeTab?: TabKey;
  onChangeTab?: (tab: TabKey) => void;
  pomodoroTime?: number;
  isRunning?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({
  activeTab = "home",
  onChangeTab = () => {},
  pomodoroTime = 0,
  isRunning = false,
}) => {
  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <nav className="navbar">
      <ul className="nav-links">
        <li>
          <button
            className={activeTab === "home" ? "active" : ""}
            onClick={() => onChangeTab("home")}
            aria-pressed={activeTab === "home"}
          >
            {isRunning ? formatTime(pomodoroTime) : "Home"}
          </button>
        </li>
        <li>
          <button
            className={activeTab === "notes" ? "active" : ""}
            onClick={() => onChangeTab("notes")}
            aria-pressed={activeTab === "notes"}
          >
            Notes
          </button>
        </li>
        <li>
          <button
            className={activeTab === "tasks" ? "active" : ""}
            onClick={() => onChangeTab("tasks")}
            aria-pressed={activeTab === "tasks"}
          >
            Tasks
          </button>
        </li>
        <li>
          <button
            className={activeTab === "settings" ? "active" : ""}
            onClick={() => onChangeTab("settings")}
            aria-pressed={activeTab === "settings"}
          >
            Settings
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
