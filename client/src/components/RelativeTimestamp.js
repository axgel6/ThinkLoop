import React, { useState, useEffect } from "react";

const formatRelative = (ts, now) => {
  if (!ts) return "";
  const diffSec = Math.floor((now - ts) / 1000);
  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec} seconds ago`;
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return m === 1 ? "1 minute ago" : `${m} minutes ago`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return h === 1 ? "1 hour ago" : `${h} hours ago`;
  }
  if (diffSec < 172800) return "yesterday";
  if (diffSec < 604800) {
    const d = Math.floor(diffSec / 86400);
    return `${d} days ago`;
  }
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
};

const RelativeTimestamp = ({ timestamp }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!timestamp) return undefined;
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, [timestamp]);

  if (!timestamp) return null;
  return <>{formatRelative(timestamp, now)}</>;
};

export default RelativeTimestamp;
