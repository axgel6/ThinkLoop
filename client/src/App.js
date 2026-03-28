import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Tasks from "./components/Tasks";
import NotesHandler from "./components/NotesHandler";
import Settings from "./components/settings-page";
import NotFound from "./components/NotFound";
import LoginModal from "./components/Login";
import { applyTheme } from "./utils/themes";
import { applyFont } from "./utils/fonts";
import Home from "./components/Home";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

function App() {
  // Initialize activeTab from localStorage or default to "home"
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem("activeTab") || "home";
    } catch (e) {
      return "home";
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
  const [weatherCity, setWeatherCity] = useState(() => {
    try {
      return localStorage.getItem("settings:weatherCity") || "Atlanta";
    } catch (e) {
      return "Atlanta";
    }
  });

  // Pomodoro timer state
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isWorkSession, setIsWorkSession] = useState(true);
  const [fullScreenPomodoro, setFullScreenPomodoro] = useState(false);
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);

  const titles = {
    home: "Home",
    notes: "Notes",
    tasks: "Tasks",
    settings: "Settings",
  };

  const user = currentUser ? currentUser.name || currentUser.username : "Guest";

  // Save current user to localStorage when it changes
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
    localStorage.setItem("settings:weatherCity", "Atlanta");
    applyTheme("zero");
    applyFont("zero");
    setWeatherCity("Atlanta");
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

  // Pomodoro timer effect
  useEffect(() => {
    let intervalId;

    if (isRunning && pomodoroTime > 0) {
      intervalId = setInterval(() => {
        setPomodoroTime((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (isWorkSession) {
              setIsWorkSession(false);
              return breakDuration * 60;
            } else {
              setIsWorkSession(true);
              return workDuration * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(intervalId);
  }, [isRunning, pomodoroTime, isWorkSession, workDuration, breakDuration]);

  const handlePomodoroToggle = () => {
    setIsRunning(!isRunning);
  };

  const handlePomodoroReset = () => {
    setIsRunning(false);
    setIsWorkSession(true);
    setPomodoroTime(workDuration * 60);
  };

  const handlePomodoroSkip = () => {
    setIsRunning(false);
    if (isWorkSession) {
      setIsWorkSession(false);
      setPomodoroTime(breakDuration * 60);
    } else {
      setIsWorkSession(true);
      setPomodoroTime(workDuration * 60);
    }
  };

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
          const newCity = settings.weatherCity || "Atlanta";

          // Update localStorage and apply if changed
          const currentTheme = localStorage.getItem("settings:selected");
          const currentFont = localStorage.getItem("settings:font");
          const currentCity = localStorage.getItem("settings:weatherCity");

          if (newTheme !== currentTheme) {
            localStorage.setItem("settings:selected", newTheme);
            applyTheme(newTheme);
          }
          if (newFont !== currentFont) {
            localStorage.setItem("settings:font", newFont);
            applyFont(newFont);
          }
          if (newCity !== currentCity) {
            localStorage.setItem("settings:weatherCity", newCity);
            setWeatherCity(newCity);
            window.dispatchEvent(new Event("weatherCityChanged"));
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
      } else if (e.key === "settings:weatherCity") {
        setWeatherCity(e.newValue || "Atlanta");
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
      {activeTab === "home" && (
        <Home
          weatherCity={weatherCity}
          currentUser={currentUser}
          pomodoroTime={pomodoroTime}
          isRunning={isRunning}
          isWorkSession={isWorkSession}
          fullScreenPomodoro={fullScreenPomodoro}
          workDuration={workDuration}
          breakDuration={breakDuration}
          setPomodoroTime={setPomodoroTime}
          setFullScreenPomodoro={setFullScreenPomodoro}
          setWorkDuration={setWorkDuration}
          setBreakDuration={setBreakDuration}
          handlePomodoroToggle={handlePomodoroToggle}
          handlePomodoroReset={handlePomodoroReset}
          handlePomodoroSkip={handlePomodoroSkip}
        />
      )}
      {activeTab === "notes" && <NotesHandler currentUser={currentUser} />}
      {activeTab === "tasks" && <Tasks currentUser={currentUser} />}
      {activeTab === "settings" && (
        <Settings
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}
      {!["home", "notes", "tasks", "settings"].includes(activeTab) && (
        <NotFound />
      )}

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
      />

      <Navbar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        pomodoroTime={pomodoroTime}
        isRunning={isRunning}
      />
    </div>
  );
}

export default App;
