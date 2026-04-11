import express from "express";
import cors from "cors";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined in environment variables");
}

// Storage limits
const LIMITS = {
  MAX_NOTES_PER_USER: 500,
  MAX_TASKS_PER_USER: 1000,
  MAX_NOTE_CONTENT_SIZE: 102400, // 100KB in bytes
  MAX_TASK_TEXT_SIZE: 5120, // 5KB in bytes
  MAX_NOTE_TITLE_SIZE: 500, // 500 bytes
  MAX_TASK_TEXT_SIZE_CHARS: 2000, // 2000 characters for task text
};

const NOTE_RETENTION_MS = 10 * 24 * 60 * 60 * 1000;

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
let foldersCollection: any;

// Connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    db = client.db("ThinkLoop");
    notesCollection = db.collection("notes");
    tasksCollection = db.collection("tasks");
    userInfoCollection = db.collection("users");
    foldersCollection = db.collection("folders");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

// Health check
app.get("/health", (_req, res) => {
  res.sendStatus(200);
});

// Routes for notes

// Get all notes (filtered by user and optionally by folderId)
app.get("/notes", async (req, res) => {
  try {
    const { userId, folderId } = req.query;
    const includeDeleted = req.query.includeDeleted === "true";
    const filter: any = userId ? { userId } : {};

    if (userId) {
      const deleteBefore = Date.now() - NOTE_RETENTION_MS;
      await notesCollection.deleteMany({
        userId,
        deletedAt: { $lte: deleteBefore },
      });
    }

    if (!includeDeleted) {
      filter.$or = [{ deletedAt: null }, { deletedAt: { $exists: false } }];
    }

    if (folderId !== undefined) {
      filter.folderId = folderId === "null" ? null : folderId;
    }

    const notes = await notesCollection
      .find(filter)
      .sort({ isPinned: -1, createdAt: -1 })
      .toArray();

    // Transform MongoDB _id to id for client compatibility
    const transformedNotes = notes.map((note: any) => ({
      id: note._id.toString(),
      title: note.title || "",
      content: note.content || "",
      font: note.font || "inter",
      fontSize: note.fontSize || 16,
      theme: note.theme || "default",
      noteType: note.noteType || "text",
      language: note.language || "python",
      showLineNumbers: Boolean(note.showLineNumbers),
      createdAt: note.createdAt || Date.now(),
      lastModified: note.lastModified || note.createdAt || Date.now(),
      userId: note.userId || null,
      isPinned: note.isPinned || false,
      folderId: note.folderId || null,
      deletedAt: note.deletedAt || null,
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
    const {
      title,
      content,
      font,
      fontSize,
      theme,
      userId,
      isPinned,
      noteType,
      language,
      showLineNumbers,
      folderId,
      deletedAt,
    } = req.body;

    // Validate userId is provided for limit checking
    if (!userId) {
      return res
        .status(400)
        .json({ error: "userId is required to create a note" });
    }

    // Check content size limits
    const titleSize = Buffer.byteLength(title || "", "utf8");
    const contentSize = Buffer.byteLength(content || "", "utf8");

    if (titleSize > LIMITS.MAX_NOTE_TITLE_SIZE) {
      return res.status(413).json({
        error: `Title exceeds size limit (max ${LIMITS.MAX_NOTE_TITLE_SIZE} bytes)`,
      });
    }

    if (contentSize > LIMITS.MAX_NOTE_CONTENT_SIZE) {
      return res.status(413).json({
        error: `Note content exceeds size limit (max ${LIMITS.MAX_NOTE_CONTENT_SIZE} bytes)`,
      });
    }

    // Check user's note count
    const userNoteCount = await notesCollection.countDocuments({ userId });
    if (userNoteCount >= LIMITS.MAX_NOTES_PER_USER) {
      return res.status(429).json({
        error: `Note limit reached. Maximum ${LIMITS.MAX_NOTES_PER_USER} notes per user.`,
      });
    }

    const now = Date.now();
    const newNote = {
      title: title || "",
      content: content || "",
      font: font || "inter",
      fontSize: fontSize || 16,
      theme: theme || "default",
      noteType: noteType || "text",
      language: language || "python",
      showLineNumbers: Boolean(showLineNumbers),
      userId: userId || null,
      isPinned: isPinned || false,
      folderId: folderId || null,
      deletedAt: deletedAt || null,
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
    const {
      title,
      content,
      font,
      fontSize,
      theme,
      isPinned,
      language,
      showLineNumbers,
      folderId,
      deletedAt,
      lastModified,
    } = req.body;
    const updateFields: any = {
      lastModified: Date.now(),
    };

    // Validate content size if being updated
    if (content !== undefined) {
      const contentSize = Buffer.byteLength(content, "utf8");
      if (contentSize > LIMITS.MAX_NOTE_CONTENT_SIZE) {
        return res.status(413).json({
          error: `Note content exceeds size limit (max ${LIMITS.MAX_NOTE_CONTENT_SIZE} bytes)`,
        });
      }
      updateFields.content = content;
    }

    if (title !== undefined) {
      const titleSize = Buffer.byteLength(title, "utf8");
      if (titleSize > LIMITS.MAX_NOTE_TITLE_SIZE) {
        return res.status(413).json({
          error: `Title exceeds size limit (max ${LIMITS.MAX_NOTE_TITLE_SIZE} bytes)`,
        });
      }
      updateFields.title = title;
    }

    if (font !== undefined) updateFields.font = font;
    if (fontSize !== undefined) updateFields.fontSize = fontSize;
    if (theme !== undefined) updateFields.theme = theme;
    if (isPinned !== undefined) updateFields.isPinned = isPinned;
    if (language !== undefined) updateFields.language = language;
    if (showLineNumbers !== undefined)
      updateFields.showLineNumbers = Boolean(showLineNumbers);
    if (folderId !== undefined) updateFields.folderId = folderId;
    if (deletedAt !== undefined) updateFields.deletedAt = deletedAt;
    if (lastModified !== undefined) updateFields.lastModified = lastModified;

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

// Restore a soft-deleted note
app.put("/notes/:id/restore", async (req, res) => {
  try {
    const updateFields: any = {
      deletedAt: null,
      lastModified: req.body?.lastModified || Date.now(),
    };

    const result = await notesCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateFields },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.json({ message: "Note restored successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to restore note" });
  }
});

// Empty recently deleted notes for a user
app.delete("/notes/recently-deleted", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    await notesCollection.deleteMany({
      userId,
      deletedAt: { $ne: null },
    });

    res.json({ message: "Recently deleted emptied successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to empty recently deleted" });
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

// Routes for folders

// Helper: collect all descendant folder ids recursively
async function getFolderDescendantIds(folderId: string): Promise<string[]> {
  const ids: string[] = [];
  const queue: string[] = [folderId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    ids.push(current);
    const children = await foldersCollection
      .find({ parentId: current })
      .toArray();
    for (const child of children) {
      queue.push(child._id.toString());
    }
  }
  return ids;
}

// Get all folders for a user
app.get("/folders", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    const folders = await foldersCollection
      .find({ userId })
      .sort({ createdAt: 1 })
      .toArray();
    res.json(
      folders.map((f: any) => ({
        id: f._id.toString(),
        name: f.name,
        parentId: f.parentId || null,
        userId: f.userId,
        createdAt: f.createdAt,
        color: f.color || null,
      })),
    );
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch folders" });
  }
});

// Create folder
app.post("/folders", async (req, res) => {
  try {
    const { name, parentId, userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Folder name is required" });
    }
    const nameSize = Buffer.byteLength(name.trim(), "utf8");
    if (nameSize > 500) {
      return res
        .status(413)
        .json({ error: "Folder name is too long (max 500 bytes)" });
    }
    const now = Date.now();
    const newFolder: any = {
      name: name.trim(),
      parentId: parentId || null,
      userId,
      createdAt: now,
    };
    const { color } = req.body;
    if (color !== undefined)
      newFolder.color = typeof color === "string" ? color : null;
    const result = await foldersCollection.insertOne(newFolder);
    res.status(201).json({
      id: result.insertedId.toString(),
      ...newFolder,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create folder" });
  }
});

// Rename or move a folder (update name and/or parentId)
app.put("/folders/:id", async (req, res) => {
  try {
    const { name, parentId, color } = req.body;
    const updateFields: any = {};
    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ error: "Folder name cannot be empty" });
      }
      const nameSize = Buffer.byteLength(name.trim(), "utf8");
      if (nameSize > 500) {
        return res
          .status(413)
          .json({ error: "Folder name is too long (max 500 bytes)" });
      }
      updateFields.name = name.trim();
    }
    if (parentId !== undefined) {
      // Prevent a folder from being moved into one of its own descendants
      if (parentId !== null) {
        const descendants = await getFolderDescendantIds(req.params.id);
        if (descendants.includes(parentId)) {
          return res.status(400).json({
            error: "Cannot move a folder into one of its own subfolders",
          });
        }
      }
      updateFields.parentId = parentId;
    }
    if (color !== undefined) {
      updateFields.color = typeof color === "string" ? color : null;
    }
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }
    const result = await foldersCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateFields },
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Folder not found" });
    }
    res.json({ message: "Folder updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update folder" });
  }
});

// Delete folder (and all descendants; notes are moved to root)
app.delete("/folders/:id", async (req, res) => {
  try {
    const allIds = await getFolderDescendantIds(req.params.id);
    // Move all notes in these folders back to root (null folderId)
    await notesCollection.updateMany(
      { folderId: { $in: allIds } },
      { $set: { folderId: null } },
    );
    // Delete all descendant folders
    const objectIds = allIds.map((id) => new ObjectId(id));
    const result = await foldersCollection.deleteMany({
      _id: { $in: objectIds },
    });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Folder not found" });
    }
    res.json({ message: "Folder deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete folder" });
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

    // Validate userId is provided for limit checking
    if (!userId) {
      return res
        .status(400)
        .json({ error: "userId is required to create a task" });
    }

    // Check text size limits
    const textSize = Buffer.byteLength(text || "", "utf8");
    const textLength = (text || "").length;

    if (textLength > LIMITS.MAX_TASK_TEXT_SIZE_CHARS) {
      return res.status(413).json({
        error: `Task text exceeds size limit (max ${LIMITS.MAX_TASK_TEXT_SIZE_CHARS} characters)`,
      });
    }

    if (textSize > LIMITS.MAX_TASK_TEXT_SIZE) {
      return res.status(413).json({
        error: `Task text exceeds size limit (max ${LIMITS.MAX_TASK_TEXT_SIZE} bytes)`,
      });
    }

    // Check user's task count
    const userTaskCount = await tasksCollection.countDocuments({ userId });
    if (userTaskCount >= LIMITS.MAX_TASKS_PER_USER) {
      // Auto-delete oldest completed tasks to make room
      const oldestCompleted = await tasksCollection
        .find({ userId, completed: true })
        .sort({ completedAt: 1 })
        .limit(Math.ceil(LIMITS.MAX_TASKS_PER_USER * 0.1)) // Delete 10% of limit
        .toArray();

      if (oldestCompleted.length > 0) {
        const idsToDelete = oldestCompleted.map((t: any) => t._id);
        await tasksCollection.deleteMany({ _id: { $in: idsToDelete } });
      } else {
        // If there are no completed tasks to delete, reject
        return res.status(429).json({
          error: `Task limit reached. Maximum ${LIMITS.MAX_TASKS_PER_USER} tasks per user. Please delete some completed tasks.`,
        });
      }
    }

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

    // Validate text size if being updated
    if (typeof text !== "undefined") {
      const textLength = text.length;
      const textSize = Buffer.byteLength(text, "utf8");

      if (textLength > LIMITS.MAX_TASK_TEXT_SIZE_CHARS) {
        return res.status(413).json({
          error: `Task text exceeds size limit (max ${LIMITS.MAX_TASK_TEXT_SIZE_CHARS} characters)`,
        });
      }

      if (textSize > LIMITS.MAX_TASK_TEXT_SIZE) {
        return res.status(413).json({
          error: `Task text exceeds size limit (max ${LIMITS.MAX_TASK_TEXT_SIZE} bytes)`,
        });
      }

      updateData.text = text;
    }

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

    // Delete all user's folders
    await foldersCollection.deleteMany({ userId: req.params.userId });

    // Delete user account
    await userInfoCollection.deleteOne({
      _id: new ObjectId(req.params.userId),
    });

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete account" });
  }
});

// Get user storage usage
app.get("/auth/user/:userId/usage", async (req, res) => {
  try {
    const userId = req.params.userId;

    const noteCount = await notesCollection.countDocuments({ userId });
    const taskCount = await tasksCollection.countDocuments({ userId });

    // Calculate total storage by summing note and task sizes
    const notes = await notesCollection
      .find({ userId })
      .project({ title: 1, content: 1 })
      .toArray();
    const tasks = await tasksCollection
      .find({ userId })
      .project({ text: 1 })
      .toArray();

    let notesStorage = 0;
    notes.forEach((note: any) => {
      notesStorage += Buffer.byteLength(note.title || "", "utf8");
      notesStorage += Buffer.byteLength(note.content || "", "utf8");
    });

    let tasksStorage = 0;
    tasks.forEach((task: any) => {
      tasksStorage += Buffer.byteLength(task.text || "", "utf8");
    });

    res.json({
      notes: {
        count: noteCount,
        limit: LIMITS.MAX_NOTES_PER_USER,
        storage: notesStorage,
        storageLimit: LIMITS.MAX_NOTES_PER_USER * LIMITS.MAX_NOTE_CONTENT_SIZE,
      },
      tasks: {
        count: taskCount,
        limit: LIMITS.MAX_TASKS_PER_USER,
        storage: tasksStorage,
        storageLimit: LIMITS.MAX_TASKS_PER_USER * LIMITS.MAX_TASK_TEXT_SIZE,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch usage" });
  }
});

// Get server storage limits
app.get("/server/limits", async (req, res) => {
  res.json({
    notes: {
      maxPerUser: LIMITS.MAX_NOTES_PER_USER,
      maxContentSize: LIMITS.MAX_NOTE_CONTENT_SIZE,
      maxTitleSize: LIMITS.MAX_NOTE_TITLE_SIZE,
    },
    tasks: {
      maxPerUser: LIMITS.MAX_TASKS_PER_USER,
      maxTextSize: LIMITS.MAX_TASK_TEXT_SIZE,
      maxTextSizeChars: LIMITS.MAX_TASK_TEXT_SIZE_CHARS,
    },
  });
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
      fontSize: user.fontSize || 16,
      weatherCity: user.weatherCity || "Atlanta",
      sidebarCollapsed: user.sidebarCollapsed ?? false,
      countdowns: Array.isArray(user.countdowns) ? user.countdowns : [],
      widgetConfig: Array.isArray(user.widgetConfig) ? user.widgetConfig : [],
      focusSessions: Array.isArray(user.focusSessions)
        ? user.focusSessions
        : [],
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// Update user settings (themes, fonts, weather)
app.put("/auth/user/:userId/settings", async (req, res) => {
  try {
    const {
      colorTheme,
      fontTheme,
      fontSize,
      weatherCity,
      sidebarCollapsed,
      countdowns,
      widgetConfig,
      focusSessions,
    } = req.body;

    const updateFields: any = {};
    if (colorTheme !== undefined) updateFields.colorTheme = colorTheme;
    if (fontTheme !== undefined) updateFields.fontTheme = fontTheme;
    if (sidebarCollapsed !== undefined)
      updateFields.sidebarCollapsed = Boolean(sidebarCollapsed);
    if (fontSize !== undefined) {
      const parsedFontSize = Number(fontSize);
      const allowedFontSizes = [14, 16, 18, 20];
      if (!allowedFontSizes.includes(parsedFontSize)) {
        return res.status(400).json({
          error: "Invalid fontSize. Allowed values are 14, 16, 18, 20",
        });
      }
      updateFields.fontSize = parsedFontSize;
    }
    if (weatherCity !== undefined) updateFields.weatherCity = weatherCity;

    if (countdowns !== undefined) {
      if (!Array.isArray(countdowns)) {
        return res.status(400).json({ error: "countdowns must be an array" });
      }
      const validDate = /^\d{4}-\d{2}-\d{2}$/;
      updateFields.countdowns = countdowns
        .slice(0, 100)
        .map((c: any) => ({
          id: typeof c?.id === "string" ? c.id : "",
          label:
            typeof c?.label === "string" ? c.label.trim().slice(0, 80) : "",
          targetDate:
            typeof c?.targetDate === "string" ? c.targetDate.trim() : "",
        }))
        .filter((c: any) => c.id && c.label && validDate.test(c.targetDate));
    }

    if (widgetConfig !== undefined) {
      if (!Array.isArray(widgetConfig)) {
        return res.status(400).json({ error: "widgetConfig must be an array" });
      }
      const allowedIds = new Set([
        "today",
        "pinned",
        "recent",
        "recent-code",
        "tasks",
        "quick-note",
        "quick-actions",
        "focus-stats",
        "countdowns",
        "pomodoro",
      ]);
      const seen = new Set<string>();
      const cleaned = widgetConfig
        .slice(0, 20)
        .map((w: any) => {
          const id = typeof w?.id === "string" ? w.id : "";
          if (!id || !allowedIds.has(id) || seen.has(id)) return null;
          seen.add(id);
          return {
            id,
            label: typeof w?.label === "string" ? w.label.slice(0, 60) : id,
            visible: w?.visible !== false,
            size: w?.size === "full" ? "full" : "half",
          };
        })
        .filter(Boolean);
      updateFields.widgetConfig = cleaned;
    }

    if (focusSessions !== undefined) {
      if (!Array.isArray(focusSessions)) {
        return res
          .status(400)
          .json({ error: "focusSessions must be an array" });
      }
      updateFields.focusSessions = focusSessions
        .slice(-5000)
        .map((s: any) => ({
          startedAt: Number(s?.startedAt),
          duration: Number(s?.duration),
          type: s?.type,
        }))
        .filter(
          (s: any) =>
            Number.isFinite(s.startedAt) &&
            s.startedAt > 0 &&
            Number.isFinite(s.duration) &&
            s.duration > 0 &&
            s.duration <= 43200 &&
            (s.type === "work" || s.type === "break"),
        );
    }

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
