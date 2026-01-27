import React from "react";
import "./Navbar.css";

type TabKey = "notes" | "tasks" | "settings";

interface NavbarProps {
  activeTab?: TabKey;
  onChangeTab?: (tab: TabKey) => void;
}

const Navbar: React.FC<NavbarProps> = ({
  activeTab = "notes",
  onChangeTab = () => {},
}) => {
  return (
    <nav className="navbar">
      <ul className="nav-links">
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
