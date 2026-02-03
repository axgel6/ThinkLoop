import React, { useState, useEffect } from "react";
import Weather from "./Weather";
import "./Home.css";

interface HomeProps {
  weatherCity?: string;
}

export default function Home({ weatherCity }: HomeProps) {
  const [currentTime, setCurrentTime] = useState<string>("");

  const getCurrentTime = () => {
    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date().toLocaleTimeString(undefined, options);
  };

  useEffect(() => {
    setCurrentTime(getCurrentTime());

    const intervalId = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div id="home-content">
      <h1>{currentTime}</h1>
      <Weather city={weatherCity} />
    </div>
  );
}
