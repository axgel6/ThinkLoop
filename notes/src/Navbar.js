import React, { useEffect, useRef, useState } from "react";
import "./Navbar.css"; // Import the CSS for this component

const Navbar = ({ activeTab = "notes", onChangeTab = () => {} }) => {
  const navRef = useRef(null);
  const bubbleRef = useRef(null);
  const [bubbleStyle, setBubbleStyle] = useState({ left: 0, width: 0 });
  const [isMoving, setIsMoving] = useState(false);
  const previousStyle = useRef({ left: 0, width: 0 });

  const updateBubblePosition = () => {
    const nav = navRef.current;
    if (!nav) return;

    const activeButton = nav.querySelector("button.active");
    if (!activeButton) return;

    const navRect = nav.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();

    const left = buttonRect.left - navRect.left - 1; // Shift 1px left to center
    const width = buttonRect.width;

    // Only trigger moving state if position actually changed
    if (
      left !== previousStyle.current.left ||
      width !== previousStyle.current.width
    ) {
      setIsMoving(true);
      previousStyle.current = { left, width };
    }

    setBubbleStyle({ left, width });
  };

  useEffect(() => {
    updateBubblePosition();
    const handleResize = () => updateBubblePosition();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    updateBubblePosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    const bubble = bubbleRef.current;
    if (!bubble) return;

    const handleTransitionEnd = (e) => {
      // Wait for the position transitions to complete, not the transform
      if (e.propertyName === "left" || e.propertyName === "width") {
        // Small delay to ensure transform finishes too
        setTimeout(() => setIsMoving(false), 0);
      }
    };

    bubble.addEventListener("transitionend", handleTransitionEnd);
    return () =>
      bubble.removeEventListener("transitionend", handleTransitionEnd);
  }, []);

  return (
    <nav className="navbar">
      <ul className="nav-links" ref={navRef}>
        <div
          ref={bubbleRef}
          className={`nav-bubble ${isMoving ? "moving" : ""}`}
          style={{ left: bubbleStyle.left, width: bubbleStyle.width }}
          aria-hidden="true"
        />
        <li>
          <button
            className={activeTab === "notes" ? "active" : ""}
            onMouseEnter={() => {
              if (activeTab === "notes" && bubbleRef.current) {
                bubbleRef.current.classList.add("hovering");
              }
            }}
            onMouseLeave={() => {
              if (bubbleRef.current) {
                bubbleRef.current.classList.remove("hovering");
              }
            }}
            onClick={() => onChangeTab("notes")}
            aria-pressed={activeTab === "notes"}
          >
            Notes
          </button>
        </li>
        <li>
          <button
            className={activeTab === "tasks" ? "active" : ""}
            onMouseEnter={() => {
              if (activeTab === "tasks" && bubbleRef.current) {
                bubbleRef.current.classList.add("hovering");
              }
            }}
            onMouseLeave={() => {
              if (bubbleRef.current) {
                bubbleRef.current.classList.remove("hovering");
              }
            }}
            onClick={() => onChangeTab("tasks")}
            aria-pressed={activeTab === "tasks"}
          >
            Tasks
          </button>
        </li>
        <li>
          <button
            className={activeTab === "feed" ? "active" : ""}
            onMouseEnter={() => {
              if (activeTab === "feed" && bubbleRef.current) {
                bubbleRef.current.classList.add("hovering");
              }
            }}
            onMouseLeave={() => {
              if (bubbleRef.current) {
                bubbleRef.current.classList.remove("hovering");
              }
            }}
            onClick={() => onChangeTab("feed")}
            aria-pressed={activeTab === "feed"}
          >
            Feed
          </button>
        </li>
        <li>
          <button
            className={activeTab === "settings" ? "active" : ""}
            onMouseEnter={() => {
              if (activeTab === "settings" && bubbleRef.current) {
                bubbleRef.current.classList.add("hovering");
              }
            }}
            onMouseLeave={() => {
              if (bubbleRef.current) {
                bubbleRef.current.classList.remove("hovering");
              }
            }}
            onClick={() => onChangeTab("settings")}
            aria-pressed={activeTab === "settings"}
          >
            Settings
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
