import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Tasks from "./Tasks";
import NotesHandler from "./NotesHandler";
import Settings from "./settings-page";
import NotFound from "./NotFound";
import LoginModal from "./Login";
import { applyTheme } from "./themes";
import { applyFont } from "./fonts";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

function App() {
  // Initialize activeTab from localStorage or default to "notes"
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem("activeTab") || "notes";
    } catch (e) {
      return "notes";
    }
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem("currentUser");
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const titles = {
    notes: "Notes",
    tasks: "Tasks",
    settings: "Settings",
  };

  const user = currentUser ? currentUser.name || currentUser.username : "Guest";

  // Save current user to localStorage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
      } else {
        localStorage.removeItem("currentUser");
      }
    } catch (e) {
      // ignore
    }
  }, [currentUser]);

  const handleLogin = (userData) => {
    setCurrentUser(userData);
    setIsLoginModalOpen(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("currentUser");

    // Reset to default theme and apply immediately
    localStorage.setItem("settings:selected", "zero");
    localStorage.setItem("settings:font", "zero");
    applyTheme("zero");
    applyFont("zero");
  };

  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("activeTab", activeTab);
    } catch (e) {
      // ignore
    }
  }, [activeTab]);

  // Initialize theme and font on app startup
  useEffect(() => {
    const savedTheme = localStorage.getItem("settings:selected") || "zero";
    const savedFont = localStorage.getItem("settings:font") || "mono";
    applyTheme(savedTheme);
    applyFont(savedFont);
  }, []);

  // Fetch settings from server when user is logged in (on mount and periodically)
  useEffect(() => {
    const fetchSettingsFromServer = async () => {
      if (!currentUser) return;

      try {
        const response = await fetch(
          `${API_URL}/auth/user/${currentUser.id}/settings`,
        );
        if (response.ok) {
          const settings = await response.json();
          const newTheme = settings.colorTheme || "zero";
          const newFont = settings.fontTheme || "zero";

          // Update localStorage and apply if changed
          const currentTheme = localStorage.getItem("settings:selected");
          const currentFont = localStorage.getItem("settings:font");

          if (newTheme !== currentTheme) {
            localStorage.setItem("settings:selected", newTheme);
            applyTheme(newTheme);
          }
          if (newFont !== currentFont) {
            localStorage.setItem("settings:font", newFont);
            applyFont(newFont);
          }
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      }
    };

    // Fetch immediately on mount
    fetchSettingsFromServer();

    // Poll every 5 seconds for updates from other devices
    const interval = setInterval(fetchSettingsFromServer, 5000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Listen for storage changes from other browser tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "settings:selected") {
        applyTheme(e.newValue || "zero");
      } else if (e.key === "settings:font") {
        applyFont(e.newValue || "mono");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <div className="App">
      <div id="top-bar">
        <h1 id="title">{"ThinkLoop / " + titles[activeTab]}</h1>
        <h1
          id="user"
          onClick={() => !currentUser && setIsLoginModalOpen(true)}
          style={{ cursor: "pointer" }}
        >
          {"Hello, " + user + "!"}
        </h1>
      </div>
      {activeTab === "notes" && <NotesHandler currentUser={currentUser} />}
      {activeTab === "tasks" && <Tasks />}
      {activeTab === "settings" && (
        <Settings
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}
      {!["notes", "tasks", "settings"].includes(activeTab) && <NotFound />}

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
      />

      <Navbar activeTab={activeTab} onChangeTab={setActiveTab} />
    </div>
  );
}

export default App;
