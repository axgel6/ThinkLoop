import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Feed from "./Feed";
import Tasks from "./Tasks";
import NotesHandler from "./NotesHandler";
import Settings from "./settings-page";
import NotFound from "./NotFound";

function App() {
  const [activeTab, setActiveTab] = useState("notes");
  const titles = { notes: "Notes", tasks: "Tasks", feed: "Feed", settings: "Settings"  };

  // Initialize theme on app startup and listen for changes
  useEffect(() => {
    const applyTheme = () => {
      const savedTheme = localStorage.getItem("settings:selected") || "one";
      const root = document.documentElement;
      root.classList.remove("theme-dark", "theme-blue", "theme-gray", "theme-cream", "theme-purple");
      
      if (savedTheme === "one") root.classList.add("theme-dark");
      else if (savedTheme === "two") root.classList.add("theme-blue");
      else if (savedTheme === "three") root.classList.add("theme-gray");
      else if (savedTheme === "four") root.classList.add("theme-cream");
      else if (savedTheme === "five") root.classList.add("theme-purple");
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
