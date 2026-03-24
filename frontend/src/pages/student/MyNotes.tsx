import { motion } from "framer-motion";
import { FileText, Trash2, ExternalLink, ArrowLeft, Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { API_V1_BASE_URL } from "@/lib/api-client";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopNav } from "@/components/dashboard/TopNav";

const API_URL = API_V1_BASE_URL;

type Note = {
  _id: string;
  title: string;
  content: string;
  roomName?: string;
  createdAt: string;
  sessionDate?: string;
};

type StoredUser = {
  _id: string;
  name: string;
  role?: string;
};

export default function MyNotesPage() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (authUser?._id) {
      setCurrentUser({
        _id: authUser._id,
        name: authUser.name,
        role: authUser.role,
      });
    }
  }, [authUser]);

  useEffect(() => {
    if (!currentUser?._id) return;

    const fetchNotes = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/notes/${currentUser._id}`);
        const data = await response.json();

        if (data.ok) {
          setNotes(data.notes || []);
        }
      } catch (error) {
        console.error("Error fetching notes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [currentUser?._id]);

  const deleteNote = async (noteId: string) => {
    if (!window.confirm("Are you sure you want to delete this note?")) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/notes/${noteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setNotes((prev) => prev.filter((note) => note._id !== noteId));
        if (selectedNote?._id === noteId) {
          setSelectedNote(null);
        }
      }
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />

        <main className="flex-1 p-2 md:p-4 overflow-y-auto">
          {selectedNote ? (
            <div className="w-full">
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedNote(null)}
                className="mb-6 px-4 py-2 rounded-lg bg-muted hover:bg-accent transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Notes
              </motion.button>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-background border border-border rounded-xl p-4 md:p-5"
              >
                <div className="mb-4">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    {selectedNote.title}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {new Date(selectedNote.createdAt).toLocaleString()}
                    {selectedNote.roomName && ` • Session: ${selectedNote.roomName}`}
                  </p>
                </div>

                <div className="prose prose-invert max-w-none mb-6">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed font-mono">
                    {selectedNote.content}
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => deleteNote(selectedNote._id)}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Note
                </motion.button>
              </motion.div>
            </div>
          ) : (
            <div className="w-full">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => navigate(-1)}
                  className="mb-4 px-4 py-2 rounded-lg bg-muted hover:bg-accent transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </motion.button>

                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                  My Class Notes
                </h1>
                <p className="text-muted-foreground">
                  View all your notes from live sessions
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <input
                  type="text"
                  placeholder="Search your notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                />
              </motion.div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
                    <Loader className="w-8 h-8 text-primary" />
                  </motion.div>
                </div>
              ) : filteredNotes.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    {searchTerm ? "No notes found" : "No notes yet"}
                  </h2>
                  <p className="text-muted-foreground">
                    {searchTerm
                      ? "Try searching with different keywords"
                      : "Join a live session and save notes to see them here"}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid gap-4"
                >
                  {filteredNotes.map((note, index) => (
                    <motion.div
                      key={note._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-background border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground mb-1 truncate">
                            {note.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {note.content}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>
                              {new Date(note.createdAt).toLocaleDateString()}
                            </span>
                            {note.roomName && (
                              <>
                                <span>•</span>
                                <span>{note.roomName}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setSelectedNote(note)}
                            className="p-2 rounded-lg bg-muted hover:bg-accent transition-colors"
                            title="View note"
                          >
                            <ExternalLink className="w-4 h-4 text-foreground" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => deleteNote(note._id)}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
                            title="Delete note"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
