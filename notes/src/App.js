import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Feed from "./Feed";
import Tasks from "./Tasks";
import NotesHandler from "./NotesHandler";
import Settings from "./settings-page";
import NotFound from "./NotFound";

function App() {
  // Initialize activeTab from localStorage or default to "notes"
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem("activeTab") || "notes";
    } catch (e) {
      return "notes";
    }
  });
  const titles = { notes: "Notes", tasks: "Tasks", feed: "Feed", settings: "Settings"  };

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
      const savedTheme = localStorage.getItem("settings:selected") || "one";
      const root = document.documentElement;
      root.classList.remove("theme-dark", "theme-blue", "theme-gray", "theme-cream", "theme-purple", "theme-pink", "theme-skyblue", "theme-sage");
      
      if (savedTheme === "one") root.classList.add("theme-dark");
      else if (savedTheme === "two") root.classList.add("theme-blue");
      else if (savedTheme === "three") root.classList.add("theme-gray");
      else if (savedTheme === "four") root.classList.add("theme-cream");
      else if (savedTheme === "five") root.classList.add("theme-purple");
      else if (savedTheme === "six") root.classList.add("theme-pink");
      else if (savedTheme === "seven") root.classList.add("theme-skyblue");
      else if (savedTheme === "eight") root.classList.add("theme-sage");
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

  return (
    <div className="App">
      <h1 id="title">{"ThinkLoop / " + titles[activeTab]}</h1>

  {activeTab === "notes" && <NotesHandler />}
  {activeTab === "tasks" && <Tasks />}
  {activeTab === "feed" && <Feed />}
  {activeTab === "settings" && <Settings />}
  {!["notes", "tasks", "feed", "settings"].includes(activeTab) && <NotFound />}

      <Navbar activeTab={activeTab} onChangeTab={setActiveTab} />
    </div>
  );
}

export default App;
