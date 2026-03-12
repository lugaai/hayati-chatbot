"use client";

import { useState, useEffect } from "react";
import { CharacterSidebar } from "@/components/chat/CharacterSidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatSession, CHARACTERS, Character } from "@/lib/models";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy, doc, getDoc } from "firebase/firestore";

export default function Home() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState("");
  const [newChatCharacterId, setNewChatCharacterId] = useState(CHARACTERS[0].id);
  const [isCreating, setIsCreating] = useState(false);

  // Firestore listener for Sessions
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "eval_sessions"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const loaded: ChatSession[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        loaded.push({
          id: doc.id,
          title: data.title,
          characterId: data.characterId || data.girlfriendId,
          createdAt: data.createdAt,
        } as ChatSession);
      });
      setSessions(loaded);
      // Auto-select first session if none selected and sessions exist
      if (loaded.length > 0 && !selectedSessionId) {
        setSelectedSessionId(loaded[0].id);
      }
    }, (err) => {
      console.error("Sessions snapshot err:", err);
    });
    return () => unsub();
  }, [selectedSessionId]);

  const handleSelect = (session: ChatSession) => {
    setSelectedSessionId(session.id);
    setSidebarOpen(false);
  };

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatTitle.trim() || !db) return;
    setIsCreating(true);
    try {
      const docRef = await addDoc(collection(db, "eval_sessions"), {
        title: newChatTitle,
        characterId: newChatCharacterId,
        girlfriendId: newChatCharacterId, // backward compat with existing data
        createdAt: serverTimestamp()
      });
      setSelectedSessionId(docRef.id);
      setIsModalOpen(false);
      setNewChatTitle("");
      setSidebarOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  const selectedSession = sessions.find(s => s.id === selectedSessionId) || sessions[0];
  const selectedCharacter = selectedSession ? (CHARACTERS.find(c => c.id === selectedSession.characterId) || CHARACTERS[0]) : null;

  return (
    <main className="flex h-screen w-full bg-black overflow-hidden font-sans selection:bg-primary/30 selection:text-white relative">

      {/* ── Desktop Sidebar (always visible on sm+) ── */}
      <div className="hidden sm:flex">
        <CharacterSidebar
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelect={handleSelect}
          onCreateNewChat={() => setIsModalOpen(true)}
        />
      </div>

      {/* ── Mobile Sidebar Drawer ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 left-0 z-50 h-full flex sm:hidden"
            >
              <CharacterSidebar
                sessions={sessions}
                selectedSessionId={selectedSessionId}
                onSelect={handleSelect}
                onCreateNewChat={() => setIsModalOpen(true)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Create Chat Modal ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl z-50"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">New Chat Session</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateChat} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Session Name</label>
                  <input
                    type="text"
                    required
                    value={newChatTitle}
                    onChange={e => setNewChatTitle(e.target.value)}
                    placeholder="e.g. Translation test, Friendly chat..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Select Character</label>
                  <div className="grid grid-cols-2 gap-3">
                    {CHARACTERS.map(g => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setNewChatCharacterId(g.id)}
                        className={`flex flex-col items-center p-3 rounded-xl border transition-all ${newChatCharacterId === g.id ? 'bg-primary/20 border-primary text-white' : 'bg-black/30 border-white/5 text-zinc-400 hover:bg-white/5'}`}
                      >
                        <span className="font-semibold">{g.name}</span>
                        <span className="text-xs opacity-70">{g.location} ({g.dialect})</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-white text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newChatTitle.trim()}
                    className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {isCreating ? 'Creating...' : 'Create Chat'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {selectedSession && selectedCharacter ? (
          <>
            <div className="sm:hidden flex items-center gap-3 h-14 px-4 border-b border-white/5 bg-black/40 backdrop-blur-md z-30">
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <Menu size={18} />
              </button>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-zinc-100 leading-tight">
                  {selectedSession.title}
                </span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium leading-tight">
                  {selectedCharacter.name} · {selectedCharacter.dialect}
                </span>
              </div>
            </div>

            <motion.div
              key={selectedSession.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <ChatWindow character={selectedCharacter} sessionId={selectedSession.id} />
            </motion.div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col gap-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center animate-pulse" />
            <p className="text-zinc-500">Loading sessions...</p>
            <button onClick={() => setIsModalOpen(true)} className="px-6 py-2 mt-4 bg-primary text-black font-bold rounded-lg hover:opacity-90">
              Create First Chat
            </button>
          </div>
        )}
      </div>

      {/* Decorative Orbs */}
      <div className="fixed top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
      <div className="fixed bottom-[-10%] left-[20%] w-[30%] h-[30%] bg-accent/5 rounded-full blur-[120px] pointer-events-none -z-10" />
    </main>
  );
}
