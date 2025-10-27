import React, { useEffect, useRef, useState } from "react";
import "./Navbar.css";

type TabKey = "notes" | "tasks" | "feed" | "settings";

interface NavbarProps {
  activeTab?: TabKey;
  onChangeTab?: (tab: TabKey) => void;
}

const Navbar: React.FC<NavbarProps> = ({
  activeTab = "notes",
  onChangeTab = () => {},
}) => {
  const navRef = useRef<HTMLUListElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const [bubbleStyle, setBubbleStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });
  const [isMoving, setIsMoving] = useState(false);
  const previousStyle = useRef<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  const updateBubblePosition = () => {
    const nav = navRef.current;
    if (!nav) return;

    const activeButton = nav.querySelector(
      "button.active"
    ) as HTMLButtonElement | null;
    if (!activeButton) return;

    const navRect = nav.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();

    const left = buttonRect.left - navRect.left - 1; // Shift 1px left to center
    const width = buttonRect.width;

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
    requestAnimationFrame(() => updateBubblePosition());
    const handleResize = () => updateBubblePosition();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => updateBubblePosition());
  }, [activeTab]);

  useEffect(() => {
    const bubble = bubbleRef.current;
    if (!bubble) return;

    const handleTransitionEnd = (e: TransitionEvent) => {
      if (
        (e as TransitionEvent).propertyName === "left" ||
        (e as TransitionEvent).propertyName === "width"
      ) {
        setTimeout(() => setIsMoving(false), 0);
      }
    };

    bubble.addEventListener(
      "transitionend",
      handleTransitionEnd as EventListener
    );
    return () =>
      bubble.removeEventListener(
        "transitionend",
        handleTransitionEnd as EventListener
      );
  }, []);

  useEffect(() => {
    const onFontChange = () => {
      const bubble = bubbleRef.current;
      if (!bubble) return;
      bubble.classList.add("no-transition");
      requestAnimationFrame(() => {
        updateBubblePosition();
        requestAnimationFrame(() => bubble.classList.remove("no-transition"));
      });
    };

    window.addEventListener("fontchange", onFontChange);
    return () => window.removeEventListener("fontchange", onFontChange);
  }, []);

  return (
    <nav className="navbar">
      <ul
        className="nav-links"
        ref={(el) => {
          navRef.current = el;
        }}
      >
        <div
          ref={(el) => {
            bubbleRef.current = el;
          }}
          className={`nav-bubble ${isMoving ? "moving" : ""}`}
          style={
            {
              left: bubbleStyle.left,
              width: bubbleStyle.width,
            } as React.CSSProperties
          }
          aria-hidden="true"
        />
        <li>
          <button
            className={activeTab === "notes" ? "active" : ""}
            onMouseEnter={() => {
              if (activeTab === "notes" && bubbleRef.current)
                bubbleRef.current.classList.add("hovering");
            }}
            onMouseLeave={() => {
              if (bubbleRef.current)
                bubbleRef.current.classList.remove("hovering");
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
              if (activeTab === "tasks" && bubbleRef.current)
                bubbleRef.current.classList.add("hovering");
            }}
            onMouseLeave={() => {
              if (bubbleRef.current)
                bubbleRef.current.classList.remove("hovering");
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
              if (activeTab === "feed" && bubbleRef.current)
                bubbleRef.current.classList.add("hovering");
            }}
            onMouseLeave={() => {
              if (bubbleRef.current)
                bubbleRef.current.classList.remove("hovering");
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
              if (activeTab === "settings" && bubbleRef.current)
                bubbleRef.current.classList.add("hovering");
            }}
            onMouseLeave={() => {
              if (bubbleRef.current)
                bubbleRef.current.classList.remove("hovering");
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
