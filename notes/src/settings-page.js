import React from "react";
import Dropdown from "./Dropdown";
import Button from "./Button";

const OPTIONS = [
  { id: "one", label: "Dark (Default)" },
  { id: "two", label: "Blue" },
  { id: "three", label: "Gray" },
  { id: "four", label: "Cream" },
  { id: "five", label: "Purple" },
];

const Settings = () => {
  const [val, setVal] = React.useState(() => {
    try {
      return localStorage.getItem("settings:selected") ?? OPTIONS[0].id;
    } catch (e) {
      return OPTIONS[0].id;
    }
  });

  // persist selection and apply theme
  React.useEffect(() => {
    try {
      localStorage.setItem("settings:selected", val);
      
      // Apply theme immediately
      const root = document.documentElement;
      root.classList.remove("theme-dark", "theme-blue", "theme-gray", "theme-cream", "theme-purple");
      if (val === "one") root.classList.add("theme-dark");
      else if (val === "two") root.classList.add("theme-blue");
      else if (val === "three") root.classList.add("theme-gray");
      else if (val === "four") root.classList.add("theme-cream");
      else if (val === "five") root.classList.add("theme-purple");
    } catch (e) {
      /* ignore */
    }
  }, [val]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Display & Visuals</h2>

      <div style={{ marginTop: 12 }}>
        <label style={{ marginRight: 8 }}>Color Theme:</label>
        <Dropdown options={OPTIONS} value={val} onChange={(v) => setVal(v)} />
      </div>

      <br></br>
      <h2>User Account</h2>

            <br></br>
      <h2>Export</h2>

            <br></br>
      <h2>Credits</h2>
      <Button onClick={() => window.open("https://aynjel.com")}>Created by Angel Gutierrez</Button>
    </div>



    
  );
};

export default Settings;


