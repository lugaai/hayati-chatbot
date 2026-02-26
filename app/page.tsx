"use client";

import { useState } from "react";
import { GirlfriendSidebar } from "@/components/chat/GirlfriendSidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { GIRLFRIENDS, Girlfriend } from "@/lib/models";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

export default function Home() {
  const [selectedGirlfriend, setSelectedGirlfriend] = useState<Girlfriend>(GIRLFRIENDS[0]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSelect = (g: Girlfriend) => {
    setSelectedGirlfriend(g);
    setSidebarOpen(false); // auto-close on mobile after selection
  };

  return (
    <main className="flex h-screen w-full bg-black overflow-hidden font-sans selection:bg-primary/30 selection:text-white">

      {/* ── Desktop Sidebar (always visible on sm+) ── */}
      <div className="hidden sm:flex">
        <GirlfriendSidebar selectedId={selectedGirlfriend.id} onSelect={handleSelect} />
      </div>

      {/* ── Mobile Sidebar Drawer ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 left-0 z-50 h-full flex sm:hidden"
            >
              <GirlfriendSidebar selectedId={selectedGirlfriend.id} onSelect={handleSelect} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Chat Area ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">

        {/* Mobile top bar with hamburger */}
        <div className="sm:hidden flex items-center gap-3 h-14 px-4 border-b border-white/5 bg-black/40 backdrop-blur-md z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <Menu size={18} />
          </button>
          <span className="text-xs text-zinc-500 uppercase tracking-widest font-medium">
            {selectedGirlfriend.name} · {selectedGirlfriend.dialect}
          </span>
        </div>

        <motion.div
          key={selectedGirlfriend.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <ChatWindow girlfriend={selectedGirlfriend} />
        </motion.div>
      </div>

      {/* Decorative Orbs */}
      <div className="fixed top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
      <div className="fixed bottom-[-10%] left-[20%] w-[30%] h-[30%] bg-accent/5 rounded-full blur-[120px] pointer-events-none -z-10" />
    </main>
  );
}
