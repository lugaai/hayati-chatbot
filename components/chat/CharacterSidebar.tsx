"use client";

import { ChatSession, Character, CHARACTERS } from '@/lib/models';
import Image from 'next/image';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Plus } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface SidebarProps {
    sessions: ChatSession[];
    selectedSessionId: string | null;
    onSelect: (session: ChatSession) => void;
    onCreateNewChat: () => void;
}

export function CharacterSidebar({ sessions, selectedSessionId, onSelect, onCreateNewChat }: SidebarProps) {
    return (
        <div className="w-80 border-r border-white/10 flex flex-col h-full bg-black/40 backdrop-blur-xl">
            <div className="p-6 flex items-center justify-between">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Evaluation Platform</p>
                <button
                    onClick={onCreateNewChat}
                    className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors"
                >
                    <Plus size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-6">
                {sessions.map((session) => {
                    const g = CHARACTERS.find(c => c.id === session.characterId) || CHARACTERS[0];
                    return (
                        <button
                            key={session.id}
                            onClick={() => onSelect(session)}
                            className={cn(
                                "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                                selectedSessionId === session.id
                                    ? "bg-white/10 ring-1 ring-white/20 shadow-xl"
                                    : "hover:bg-white/5 opacity-60 hover:opacity-100"
                            )}
                        >
                            {selectedSessionId === session.id && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                            )}

                            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-800 border border-white/10 flex-shrink-0">
                                <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold uppercase text-lg">
                                    {g.name[0]}
                                </div>
                            </div>

                            <div className="flex flex-col items-start transition-all duration-300 text-left">
                                <span className="font-semibold text-zinc-100">{session.title}</span>
                                <span className="text-xs text-zinc-500">{g.name} · {g.location} ({g.dialect})</span>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="p-4 border-t border-white/5 bg-black/20 text-[10px] text-zinc-600">
                <p>VERSION 1.0.0-EVAL</p>
            </div>
        </div>
    );
}
