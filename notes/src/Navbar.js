import React from "react";
import "./Navbar.css"; // Import the CSS for this component

const Navbar = ({ activeTab = "notes", onChangeTab = () => {} }) => {
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
            className={activeTab === "feed" ? "active" : ""}
            onClick={() => onChangeTab("feed")}
            aria-pressed={activeTab === "feed"}
          >
            Feed
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
