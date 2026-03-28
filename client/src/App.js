import React, { useState, useEffect, useRef } from "react";
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

const TITLES = {
  home: "Home",
  notes: "Notes",
  tasks: "Tasks",
  settings: "Settings",
};

function App() {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem("activeTab") || "home";
    } catch {
      return "home";
    }
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem("currentUser");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isConnected, setIsConnected] = useState(null);
  const [weatherCity, setWeatherCity] = useState(() => {
    try {
      return localStorage.getItem("settings:weatherCity") || "Atlanta";
    } catch {
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
  const isWorkSessionRef = useRef(isWorkSession);
  const workDurationRef = useRef(workDuration);
  const breakDurationRef = useRef(breakDuration);
  isWorkSessionRef.current = isWorkSession;
  workDurationRef.current = workDuration;
  breakDurationRef.current = breakDuration;

  const user = currentUser ? currentUser.name || currentUser.username : "Guest";

  // Sync currentUser to localStorage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
      } else {
        localStorage.removeItem("currentUser");
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  const handleLogin = (userData) => {
    setCurrentUser(userData);
    setIsLoginModalOpen(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
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
    } catch {
      // ignore
    }
  }, [activeTab]);

  // Check backend connectivity (Render free tier sleeps).
  // Run once: use a ref so the interval doesn't restart on every state change.
  useEffect(() => {
    const connectedRef = { current: false };

    const checkConnection = async () => {
      try {
        const res = await fetch(`${API_URL}/health`, { method: "GET" });
        connectedRef.current = res.ok;
        setIsConnected(res.ok);
      } catch {
        connectedRef.current = false;
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(async () => {
      if (!connectedRef.current) await checkConnection();
      else clearInterval(interval);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Initialize theme and font on app startup
  useEffect(() => {
    const savedTheme = localStorage.getItem("settings:selected") || "zero";
    const savedFont = localStorage.getItem("settings:font") || "mono";
    applyTheme(savedTheme);
    applyFont(savedFont);
  }, []);

  // Pomodoro timer — only restarts when isRunning changes, not every tick
  useEffect(() => {
    if (!isRunning) return;

    const intervalId = setInterval(() => {
      setPomodoroTime((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          if (isWorkSessionRef.current) {
            setIsWorkSession(false);
            return breakDurationRef.current * 60;
          } else {
            setIsWorkSession(true);
            return workDurationRef.current * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isRunning]);

  // Update browser tab title when pomodoro is running
  useEffect(() => {
    if (!isRunning) {
      document.title = "ThinkLoop";
      return;
    }
    const mins = Math.floor(pomodoroTime / 60)
      .toString()
      .padStart(2, "0");
    const secs = (pomodoroTime % 60).toString().padStart(2, "0");
    document.title = `${mins}:${secs} - ${isWorkSession ? "Focus" : "Break"}`;
  }, [pomodoroTime, isRunning, isWorkSession]);

  const handlePomodoroToggle = () => setIsRunning((r) => !r);

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

  // Fetch settings from server when user is logged in
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

    fetchSettingsFromServer();
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

    // Same-tab updates from settings dispatch this custom event
    const handleCityChanged = () => {
      const city = localStorage.getItem("settings:weatherCity") || "Atlanta";
      setWeatherCity(city);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("weatherCityChanged", handleCityChanged);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("weatherCityChanged", handleCityChanged);
    };
  }, []);

  return (
    <div className="App">
      {isConnected === false && (
        <div className="connection-banner">
          Waiting for backend to wake up... (This may take a moment)
        </div>
      )}
      <div id="top-bar">
        <h1 id="title" style={{ fontWeight: "bold" }}>
          {"ThinkLoop/" + TITLES[activeTab]}
        </h1>
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
          onUpdateUser={setCurrentUser}
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
