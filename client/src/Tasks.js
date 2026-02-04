import React from "react";
import Checklist from "./Checklist";

const Tasks = ({ currentUser }) => {
  return (
    <div
      style={{
        padding: "20px 16px",
        minHeight: "100vh",
      }}
    >
      <Checklist currentUser={currentUser} />
    </div>
  );
};

export default Tasks;
