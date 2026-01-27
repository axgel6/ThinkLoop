import express from "express";
import cors from "cors";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
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

// Connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    db = client.db("notesapp");
    notesCollection = db.collection("notes");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

// Routes

// Get all notes
app.get("/notes", async (req, res) => {
  try {
    const notes = await notesCollection
      .find()
      .sort({ createdAt: -1 })
      .toArray();
    res.json(notes);
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
    const { title, content } = req.body;
    const newNote = {
      title,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await notesCollection.insertOne(newNote);
    res.status(201).json({ _id: result.insertedId, ...newNote });
  } catch (error) {
    res.status(500).json({ error: "Failed to create note" });
  }
});

// Update note
app.put("/notes/:id", async (req, res) => {
  try {
    const { title, content } = req.body;
    const result = await notesCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { title, content, updatedAt: new Date() } },
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

// Start server - listen first, connect to DB in background
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectDB();
});
