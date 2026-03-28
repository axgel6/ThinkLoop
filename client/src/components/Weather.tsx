import { useState, useEffect, useCallback, useRef } from "react";
import "./Weather.css";

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  city: string;
}

interface CachedWeather {
  data: WeatherData;
  timestamp: number;
  city: string;
}

interface WeatherProps {
  city?: string | undefined;
}

// Cache duration: 10 minutes (weather doesn't change that frequently)
const CACHE_DURATION = 10 * 60 * 1000;
// Minimum time between API calls: 30 seconds
const MIN_FETCH_INTERVAL = 30 * 1000;

// Get cached weather from localStorage
const getCachedWeather = (city: string): WeatherData | null => {
  try {
    const cached = localStorage.getItem("weather:cache");
    if (!cached) return null;

    const parsedCache: CachedWeather = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is for the same city and not expired
    if (
      parsedCache.city.toLowerCase() === city.toLowerCase() &&
      now - parsedCache.timestamp < CACHE_DURATION
    ) {
      return parsedCache.data;
    }
    return null;
  } catch {
    return null;
  }
};

// Save weather to cache
const setCachedWeather = (city: string, data: WeatherData): void => {
  try {
    const cacheEntry: CachedWeather = {
      data,
      timestamp: Date.now(),
      city,
    };
    localStorage.setItem("weather:cache", JSON.stringify(cacheEntry));
  } catch {
    // Ignore storage errors
  }
};

export default function Weather({ city: propCity }: WeatherProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchTime = useRef<number>(0);
  const fetchInProgress = useRef<boolean>(false);

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

  const fetchWeather = useCallback(
    async (forceRefresh = false) => {
      const city = getCity();

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = getCachedWeather(city);
        if (cached) {
          setWeather(cached);
          setLoading(false);
          setError(null);
          return;
        }
      }

      // Rate limiting: prevent calls too close together
      const now = Date.now();
      if (!forceRefresh && now - lastFetchTime.current < MIN_FETCH_INTERVAL) {
        return;
      }

      // Prevent concurrent fetches
      if (fetchInProgress.current) {
        return;
      }

      if (!API_KEY) {
        setError("API key not configured");
        setLoading(false);
        return;
      }

      fetchInProgress.current = true;
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=imperial`,
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("City not found");
          }
          if (response.status === 429) {
            throw new Error("Rate limit exceeded. Please try again later.");
          }
          throw new Error("Failed to fetch weather data");
        }

        const data = await response.json();

        const weatherData: WeatherData = {
          temp: Math.round(data.main.temp),
          description: data.weather[0].description,
          icon: data.weather[0].icon,
          city: data.name,
        };

        setWeather(weatherData);
        setCachedWeather(city, weatherData);
        lastFetchTime.current = Date.now();
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
        fetchInProgress.current = false;
      }
    },
    [API_KEY, getCity],
  );

  // Initial fetch and when city changes
  useEffect(() => {
    fetchWeather();
  }, [fetchWeather, propCity]);

  // Also listen for custom event for same-tab updates (when no prop is provided)
  useEffect(() => {
    if (propCity) return; // Skip if city is provided via props

    const handleCityChange = () => fetchWeather(true); // Force refresh on city change
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
