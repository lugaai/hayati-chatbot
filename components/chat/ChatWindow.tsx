"use client";

import { Girlfriend } from '@/lib/models';
import { LLM_MODELS } from '@/lib/services';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { Send, User, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState, FormEvent } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface ChatWindowProps {
    girlfriend: Girlfriend;
}

export function ChatWindow({ girlfriend }: ChatWindowProps) {
    const [modelId] = useState(LLM_MODELS.GROK);
    const [mounted, setMounted] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const isStreamingRef = useRef(false); // prevent Firestore from overwriting during stream

    const GLOBAL_CHAT_ID = `global-${girlfriend.id}`;

    // 1. Mount
    useEffect(() => {
        setMounted(true);
    }, []);

    // 2. Real-time Firestore listener
    useEffect(() => {
        if (!mounted || !db) return;

        const unsub = onSnapshot(doc(db, "global_eval_chats", GLOBAL_CHAT_ID), (docSnap) => {
            if (isStreamingRef.current) return; // don't overwrite while streaming
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.messages && data.messages.length > 0) {
                    setMessages(data.messages);
                } else {
                    setMessages([{ id: '0', role: 'assistant', content: girlfriend.opener }]);
                }
            } else {
                setMessages([{ id: '0', role: 'assistant', content: girlfriend.opener }]);
            }
            setLoadingHistory(false);
        }, (error) => {
            console.error("Firestore Listen Error:", error);
            setMessages([{ id: '0', role: 'assistant', content: girlfriend.opener }]);
            setLoadingHistory(false);
        });

        return () => unsub();
    }, [mounted, GLOBAL_CHAT_ID, girlfriend.opener]);

    // 3. Auto scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // 4. Save to Firestore
    const saveToCloud = async (newMessages: Message[]) => {
        if (!db || newMessages.length <= 1) return;
        try {
            await setDoc(doc(db, "global_eval_chats", GLOBAL_CHAT_ID), {
                messages: newMessages,
                girlfriendId: girlfriend.id,
                updatedAt: new Date()
            }, { merge: true });
        } catch (e) {
            console.error("Cloud Save Error:", e);
        }
    };

    // 5. Submit: use plain fetch for full control
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);
        isStreamingRef.current = true;

        const assistantId = (Date.now() + 1).toString();
        const assistantMessage: Message = { id: assistantId, role: 'assistant', content: '' };
        setMessages([...updatedMessages, assistantMessage]);

        try {
            abortRef.current = new AbortController();
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
                    girlfriendId: girlfriend.id,
                    modelId,
                }),
                signal: abortRef.current.signal,
            });

            if (!res.ok || !res.body) throw new Error('Stream failed');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                // Parse Vercel AI data stream protocol: lines like `0:"text"\n`
                const lines = chunk.split('\n').filter(Boolean);
                for (const line of lines) {
                    if (line.startsWith('0:')) {
                        try {
                            const text = JSON.parse(line.slice(2));
                            fullText += text;
                            setMessages(prev => prev.map(m =>
                                m.id === assistantId ? { ...m, content: fullText } : m
                            ));
                        } catch { /* ignore parse errors */ }
                    }
                }
            }

            const finalMessages: Message[] = [...updatedMessages, { id: assistantId, role: 'assistant', content: fullText }];
            await saveToCloud(finalMessages);
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error('Chat error:', err);
                setMessages(prev => prev.filter(m => m.id !== assistantId));
            }
        } finally {
            isStreamingRef.current = false;
            setIsLoading(false);
        }
    };

    if (!mounted || loadingHistory) return (
        <div className="flex-1 bg-zinc-950 flex items-center justify-center text-zinc-500">
            Connecting to Global Session...
        </div>
    );

    return (
        <div className="flex-1 flex flex-col h-full bg-zinc-950">
            <header className="hidden sm:flex h-16 sm:h-20 border-b border-white/5 items-center justify-between px-4 sm:px-8 bg-black/40 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-primary text-sm">
                        {girlfriend.name[0]}
                    </div>
                    <div>
                        <h2 className="font-bold text-zinc-100 text-sm sm:text-base">{girlfriend.name}</h2>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] text-zinc-500 uppercase tracking-tighter">Online • {girlfriend.location}</span>
                        </div>
                    </div>
                </div>
                <div className="hidden sm:block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] text-primary uppercase tracking-[0.2em] font-medium">
                    Global Sync Active
                </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 sm:space-y-8 scroll-smooth">
                <AnimatePresence>
                    {messages.filter(m => m.content !== '').map((m) => (
                        <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn("flex gap-3 sm:gap-4 w-full max-w-xl sm:max-w-2xl", m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto")}
                        >
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1", m.role === 'user' ? "bg-white/10 text-zinc-400" : "bg-primary/20 text-primary")}>
                                {m.role === 'user' ? <User size={16} /> : <Brain size={16} />}
                            </div>
                            <div className={cn("group relative p-4 rounded-2xl", m.role === 'user' ? "bg-zinc-800 text-zinc-100 rounded-tr-none" : "bg-white/5 border border-white/10 text-zinc-200 rounded-tl-none")}>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {isLoading && (
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                            <Brain size={16} className="text-primary opacity-50" />
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none italic text-zinc-500 text-sm">Thinking...</div>
                    </div>
                )}
            </div>

            <div className="p-3 sm:p-6 pb-4 sm:pb-6">
                <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Send a message..."
                        disabled={isLoading}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 pr-14 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 ring-primary/20 transition-all backdrop-blur-sm disabled:opacity-50 text-sm sm:text-base"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="absolute right-2 top-2 bottom-2 w-10 sm:w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                    >
                        <Send size={16} />
                    </button>
                </form>
            </div>
        </div>
    );
}
