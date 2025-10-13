import React from "react";
import "./Checklist.css";

const Checklist: React.FC = () => {
  return (
    <div className="task-list">
      <p>
        Today is {new Date().toLocaleDateString()} and the time is{" "}
        {new Date().toLocaleTimeString()}
      </p>
      <p>"Tasks" is currently under development</p>
    </div>
  );
};

export default Checklist;
