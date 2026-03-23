import express from "express";
import Notes from "../models/notes.model.js";

const router = express.Router();

/**
 * Save notes from a session
 * POST /api/v1/notes/save
 */
router.post("/save", async (req, res) => {
  try {
    const { studentId, callId, roomName, title, content } = req.body;

    if (!studentId || !content) {
      return res.status(400).json({
        ok: false,
        error: "studentId and content are required",
      });
    }

    const notes = new Notes({
      studentId,
      callId,
      roomName,
      title,
      content,
    });

    await notes.save();

    return res.status(201).json({
      ok: true,
      message: "Notes saved successfully",
      notes,
    });
  } catch (error) {
    console.error("Error saving notes:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to save notes",
    });
  }
});

/**
 * Get all notes for a student
 * GET /api/v1/notes/:studentId
 */
router.get("/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    const notes = await Notes.find({ studentId })
      .sort({ createdAt: -1 })
      .select("title content sessionDate roomName createdAt");

    return res.status(200).json({
      ok: true,
      notes,
      count: notes.length,
    });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to fetch notes",
    });
  }
});

/**
 * Get a specific note
 * GET /api/v1/notes/detail/:noteId
 */
router.get("/detail/:noteId", async (req, res) => {
  try {
    const { noteId } = req.params;

    const note = await Notes.findById(noteId);

    if (!note) {
      return res.status(404).json({
        ok: false,
        error: "Note not found",
      });
    }

    return res.status(200).json({
      ok: true,
      note,
    });
  } catch (error) {
    console.error("Error fetching note:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to fetch note",
    });
  }
});

/**
 * Update a note
 * PUT /api/v1/notes/:noteId
 */
router.put("/:noteId", async (req, res) => {
  try {
    const { noteId } = req.params;
    const { title, content } = req.body;

    const note = await Notes.findByIdAndUpdate(
      noteId,
      { title, content },
      { new: true }
    );

    if (!note) {
      return res.status(404).json({
        ok: false,
        error: "Note not found",
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Note updated successfully",
      note,
    });
  } catch (error) {
    console.error("Error updating note:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to update note",
    });
  }
});

/**
 * Delete a note
 * DELETE /api/v1/notes/:noteId
 */
router.delete("/:noteId", async (req, res) => {
  try {
    const { noteId } = req.params;

    const note = await Notes.findByIdAndDelete(noteId);

    if (!note) {
      return res.status(404).json({
        ok: false,
        error: "Note not found",
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Note deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting note:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to delete note",
    });
  }
});

export default router;
