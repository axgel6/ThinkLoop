import { useState, useEffect, useCallback } from "react";
import "./Weather.css";

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  city: string;
}

interface WeatherProps {
  city?: string | undefined;
}

export default function Weather({ city: propCity }: WeatherProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_KEY =
    process.env.REACT_APP_OPENWEATHER_API_KEY ||
    process.env.OPENWEATHER_API_KEY;

  const getCity = useCallback(() => {
    // Use prop if provided, otherwise fall back to localStorage
    if (propCity) return propCity;
    try {
      return localStorage.getItem("settings:weatherCity") || "Atlanta";
    } catch {
      return "Atlanta";
    }
  }, [propCity]);

  const fetchWeather = useCallback(async () => {
    const city = getCity();
    setLoading(true);
    setError(null);

    if (!API_KEY) {
      setError("API key not configured");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=imperial`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("City not found");
        }
        throw new Error("Failed to fetch weather data");
      }

      const data = await response.json();

      setWeather({
        temp: Math.round(data.main.temp),
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        city: data.name,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [API_KEY, getCity]);

  // Refetch when propCity changes
  useEffect(() => {
    fetchWeather();
  }, [fetchWeather, propCity]);

  // Also listen for custom event for same-tab updates (when no prop is provided)
  useEffect(() => {
    if (propCity) return; // Skip if city is provided via props

    const handleCityChange = () => fetchWeather();
    window.addEventListener("weatherCityChanged", handleCityChange);
    return () =>
      window.removeEventListener("weatherCityChanged", handleCityChange);
  }, [fetchWeather, propCity]);

  if (loading) {
    return <p className="weather-text weather-loading">Loading weather...</p>;
  }

  if (error) {
    return <p className="weather-text weather-error">⚠️ {error}</p>;
  }

  if (!weather) return null;

  // Capitalize each word in description
  const capitalizedDescription = weather.description
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <p className="weather-text">
      {weather.city} <span className="weather-separator">·</span> {weather.temp}
      °F <span className="weather-separator">·</span> {capitalizedDescription}
    </p>
  );
}
