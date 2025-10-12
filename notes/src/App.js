import React, { useState } from "react";
import Navbar from "./Navbar";
import Feed from "./Feed";
import Tasks from "./Tasks";
import NotesHandler from "./NotesHandler";

function App() {
  const [activeTab, setActiveTab] = useState("notes");
  const titles = { notes: "Notes", tasks: "Tasks", feed: "Feed" };

  return (
    <div className="App">
      <h1 id="title">{titles[activeTab]}</h1>

      {activeTab === "notes" && <NotesHandler />}
      {activeTab === "tasks" && <Tasks />}
      {activeTab === "feed" && <Feed />}

      <Navbar activeTab={activeTab} onChangeTab={setActiveTab} />
    </div>
  );
}

export default App;
