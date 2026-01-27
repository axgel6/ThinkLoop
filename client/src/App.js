import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Tasks from "./Tasks";
import NotesHandler from "./NotesHandler";
import Settings from "./settings-page";
import NotFound from "./NotFound";
import LoginModal from "./Login";

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
  };

  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("activeTab", activeTab);
    } catch (e) {
      // ignore
    }
  }, [activeTab]);

  // Initialize theme on app startup and listen for changes
  useEffect(() => {
    const applyTheme = () => {
      const savedTheme = localStorage.getItem("settings:selected") || "zero";
      const root = document.documentElement;
      root.classList.remove(
        "theme-default",
        "theme-dark",
        "theme-blue",
        "theme-gray",
        "theme-cream",
        "theme-purple",
        "theme-pink",
        "theme-skyblue",
        "theme-sage",
        "theme-brown",
        "theme-sunset",
        "theme-burgundy",
        "theme-forestgreen",
        "theme-gold",
        "theme-ai",
        "theme-snowleopard",
      );

      if (savedTheme === "zero") root.classList.add("theme-default");
      else if (savedTheme === "one") root.classList.add("theme-dark");
      else if (savedTheme === "two") root.classList.add("theme-blue");
      else if (savedTheme === "three") root.classList.add("theme-gray");
      else if (savedTheme === "four") root.classList.add("theme-cream");
      else if (savedTheme === "five") root.classList.add("theme-purple");
      else if (savedTheme === "six") root.classList.add("theme-pink");
      else if (savedTheme === "seven") root.classList.add("theme-skyblue");
      else if (savedTheme === "eight") root.classList.add("theme-sage");
      else if (savedTheme === "nine") root.classList.add("theme-brown");
      else if (savedTheme === "ten") root.classList.add("theme-sunset");
      else if (savedTheme === "eleven") root.classList.add("theme-burgundy");
      else if (savedTheme === "twelve") root.classList.add("theme-forestgreen");
      else if (savedTheme === "thirteen") root.classList.add("theme-gold");
      else if (savedTheme === "fourteen") root.classList.add("theme-ai");
      else if (savedTheme === "fifteen")
        root.classList.add("theme-snowleopard");
    };

    // Apply theme on mount
    applyTheme();

    // Listen for storage changes (when theme changes in Settings)
    const handleStorageChange = (e) => {
      if (e.key === "settings:selected") {
        applyTheme();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Initialize font theme on app startup and listen for changes
  useEffect(() => {
    const applyFont = () => {
      const savedFont = localStorage.getItem("settings:font") || "mono";
      const root = document.documentElement;
      // A list of all possible font theme classes
      const fontClasses = [
        "font-mono",
        "font-inter",
        "font-paper",
        "font-handwritten",
        "font-lora",
        "font-poppins",
        "font-cormorant",
        "font-space",
        "font-orbitron",
        "font-amatic",
        "font-greatvibes",
      ];
      root.classList.remove(...fontClasses);

      if (savedFont) {
        root.classList.add(`font-${savedFont}`);
      }
    };

    // Apply font on mount
    applyFont();

    // Listen for storage changes (when font changes in Settings)
    const handleStorageChange = (e) => {
      if (e.key === "settings:font") {
        applyFont();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Also listen for the custom 'fontchange' event from the settings page
    window.addEventListener("fontchange", applyFont);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("fontchange", applyFont);
    };
  }, []);

  return (
    <div className="App">
      <div id="top-bar">
        <h1 id="title">{"ThinkLoop / " + titles[activeTab]}</h1>
        <h1
          id="user"
          onClick={() =>
            currentUser ? handleLogout() : setIsLoginModalOpen(true)
          }
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
