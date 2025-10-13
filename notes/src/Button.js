import React from "react";
import "./Button.css";

// Simple themed button component
// Props: children, onClick, className, type
const Button = ({ children, onClick, className = "", type = "button", ...rest }) => {
  return (
    <button type={type} className={`btn ${className}`} onClick={onClick} {...rest}>
      {children}
    </button>
  );
};

export default Button;
