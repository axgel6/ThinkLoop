import express from "express";
import cors from "cors";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5173;
const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined in environment variables");
}

// Middleware
app.use(cors());
app.use(express.json());

// Create MongoDB client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db: any;
let notesCollection: any;
let tasksCollection: any;
let userInfoCollection: any;

// Connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    db = client.db("ThinkLoop");
    notesCollection = db.collection("notes");
    tasksCollection = db.collection("tasks");
    userInfoCollection = db.collection("users");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

// Routes for notes

// Get all notes (filtered by user if userId provided)
app.get("/notes", async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = userId ? { userId } : {};

    const notes = await notesCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    // Transform MongoDB _id to id for client compatibility
    const transformedNotes = notes.map((note: any) => ({
      id: note._id.toString(),
      title: note.title || "",
      content: note.content || "",
      font: note.font || "inter",
      fontSize: note.fontSize || 16,
      theme: note.theme || "default",
      createdAt: note.createdAt || Date.now(),
      lastModified: note.lastModified || note.createdAt || Date.now(),
      userId: note.userId || null,
    }));

    res.json(transformedNotes);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

// Get single note
app.get("/notes/:id", async (req, res) => {
  try {
    const note = await notesCollection.findOne({
      _id: new ObjectId(req.params.id),
    });
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch note" });
  }
});

// Create note
app.post("/notes", async (req, res) => {
  try {
    const { title, content, font, fontSize, theme, userId } = req.body;
    const now = Date.now();
    const newNote = {
      title: title || "",
      content: content || "",
      font: font || "inter",
      fontSize: fontSize || 16,
      theme: theme || "default",
      userId: userId || null,
      createdAt: now,
      lastModified: now,
    };
    const result = await notesCollection.insertOne(newNote);
    res.status(201).json({
      id: result.insertedId.toString(),
      ...newNote,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create note" });
  }
});

// Update note
app.put("/notes/:id", async (req, res) => {
  try {
    const { title, content, font, fontSize, theme } = req.body;
    const updateFields: any = {
      lastModified: Date.now(),
    };

    if (title !== undefined) updateFields.title = title;
    if (content !== undefined) updateFields.content = content;
    if (font !== undefined) updateFields.font = font;
    if (fontSize !== undefined) updateFields.fontSize = fontSize;
    if (theme !== undefined) updateFields.theme = theme;

    const result = await notesCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateFields },
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Note not found" });
    }
    res.json({ message: "Note updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update note" });
  }
});

// Delete note
app.delete("/notes/:id", async (req, res) => {
  try {
    const result = await notesCollection.deleteOne({
      _id: new ObjectId(req.params.id),
    });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Note not found" });
    }
    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete note" });
  }
});

// Routes for tasks

// Get all tasks (filtered by user if userId provided)
app.get("/tasks", async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = userId ? { userId } : {};

    const tasks = await tasksCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.json(
      tasks.map((task: any) => ({
        id: task._id.toString(),
        ...task,
      })),
    );
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// Get single task
app.get("/tasks/:id", async (req, res) => {
  try {
    const task = await tasksCollection.findOne({
      _id: new ObjectId(req.params.id),
    });
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json({ id: task._id.toString(), ...task });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

// Create task
app.post("/tasks", async (req, res) => {
  try {
    const { text, completed, userId } = req.body;
    const now = Date.now();
    const newTask = {
      text: text || "",
      completed: completed || false,
      userId: userId || null,
      createdAt: now,
      completedAt: completed ? now : null,
    };
    const result = await tasksCollection.insertOne(newTask);
    res.status(201).json({
      id: result.insertedId.toString(),
      ...newTask,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create task" });
  }
});

// Update task
app.put("/tasks/:id", async (req, res) => {
  try {
    const { text, completed } = req.body;
    const updateData: any = {};
    if (typeof text !== "undefined") updateData.text = text;
    if (typeof completed !== "undefined") {
      updateData.completed = completed;
      updateData.completedAt = completed ? Date.now() : null;
    }

    const result = await tasksCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json({ message: "Task updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

// Delete task
app.delete("/tasks/:id", async (req, res) => {
  try {
    const result = await tasksCollection.deleteOne({
      _id: new ObjectId(req.params.id),
    });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// Routes for user info

// Register new user
app.post("/auth/register", async (req, res) => {
  try {
    const { username, password, name } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    // Check if user already exists
    const existingUser = await userInfoCollection.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: "Username already exists" });
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = {
      username,
      password: hashedPassword,
      name: name || username,
      createdAt: Date.now(),
    };

    const result = await userInfoCollection.insertOne(newUser);
    res.status(201).json({
      id: result.insertedId.toString(),
      username,
      name,
      message: "User created successfully",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to register user" });
  }
});

// Login user
app.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const user = await userInfoCollection.findOne({ username });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Compare password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({
      id: user._id.toString(),
      username: user.username,
      name: user.name || user.username,
      message: "Login successful",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to login" });
  }
});

// Get user info
app.get("/auth/user/:userId", async (req, res) => {
  try {
    const user = await userInfoCollection.findOne({
      _id: new ObjectId(req.params.userId),
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user._id.toString(),
      username: user.username,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Update username
app.put("/auth/user/:userId/username", async (req, res) => {
  try {
    const { newUsername } = req.body;

    if (!newUsername) {
      return res.status(400).json({ error: "New username required" });
    }

    // Check if username already exists
    const existingUser = await userInfoCollection.findOne({
      username: newUsername,
    });
    if (existingUser) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const result = await userInfoCollection.updateOne(
      { _id: new ObjectId(req.params.userId) },
      { $set: { username: newUsername } },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Username updated successfully",
      username: newUsername,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update username" });
  }
});

// Update user name
app.put("/auth/user/:userId/name", async (req, res) => {
  try {
    const { newName } = req.body;

    if (!newName) {
      return res.status(400).json({ error: "New name required" });
    }

    const result = await userInfoCollection.updateOne(
      { _id: new ObjectId(req.params.userId) },
      { $set: { name: newName } },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Name updated successfully",
      name: newName,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update name" });
  }
});

// Update password
app.put("/auth/user/:userId/password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Current and new password required" });
    }

    const user = await userInfoCollection.findOne({
      _id: new ObjectId(req.params.userId),
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await userInfoCollection.updateOne(
      { _id: new ObjectId(req.params.userId) },
      { $set: { password: hashedPassword } },
    );

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update password" });
  }
});

// Delete account
app.delete("/auth/user/:userId", async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res
        .status(400)
        .json({ error: "Password required to delete account" });
    }

    const user = await userInfoCollection.findOne({
      _id: new ObjectId(req.params.userId),
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify password before deletion
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    // Delete all user's notes
    await notesCollection.deleteMany({ userId: req.params.userId });

    // Delete user account
    await userInfoCollection.deleteOne({
      _id: new ObjectId(req.params.userId),
    });

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete account" });
  }
});

// Get user settings (themes, fonts, weather)
app.get("/auth/user/:userId/settings", async (req, res) => {
  try {
    const user = await userInfoCollection.findOne({
      _id: new ObjectId(req.params.userId),
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      colorTheme: user.colorTheme || "zero",
      fontTheme: user.fontTheme || "zero",
      weatherCity: user.weatherCity || "Atlanta",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// Update user settings (themes, fonts, weather)
app.put("/auth/user/:userId/settings", async (req, res) => {
  try {
    const { colorTheme, fontTheme, weatherCity } = req.body;

    const updateFields: any = {};
    if (colorTheme !== undefined) updateFields.colorTheme = colorTheme;
    if (fontTheme !== undefined) updateFields.fontTheme = fontTheme;
    if (weatherCity !== undefined) updateFields.weatherCity = weatherCity;

    const result = await userInfoCollection.updateOne(
      { _id: new ObjectId(req.params.userId) },
      { $set: updateFields },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "Settings updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// Start server - listen first, connect to DB in background
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectDB();
});
