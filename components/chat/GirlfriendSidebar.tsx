"use client";

import { GIRLFRIENDS, Girlfriend } from '@/lib/models';
import Image from 'next/image';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface SidebarProps {
    selectedId: string;
    onSelect: (girlfriend: Girlfriend) => void;
}

export function GirlfriendSidebar({ selectedId, onSelect }: SidebarProps) {
    return (
        <div className="w-80 border-r border-white/10 flex flex-col h-full bg-black/40 backdrop-blur-xl">
            <div className="p-6">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Evaluation Platform</p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-6">
                {GIRLFRIENDS.map((g) => (
                    <button
                        key={g.id}
                        onClick={() => onSelect(g)}
                        className={cn(
                            "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                            selectedId === g.id
                                ? "bg-white/10 ring-1 ring-white/20 shadow-xl"
                                : "hover:bg-white/5 opacity-60 hover:opacity-100"
                        )}
                    >
                        {selectedId === g.id && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                        )}

                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-800 border border-white/10 flex-shrink-0">
                            {/* Note: In a real app we'd use g.avatar. Here we'll show initial if image fails */}
                            <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold uppercase text-lg">
                                {g.name[0]}
                            </div>
                        </div>

                        <div className="flex flex-col items-start transition-all duration-300">
                            <span className="font-semibold text-zinc-100">{g.name}</span>
                            <span className="text-xs text-zinc-500">{g.location} ({g.dialect})</span>
                        </div>
                    </button>
                ))}
            </div>

            <div className="p-4 border-t border-white/5 bg-black/20 text-[10px] text-zinc-600">
                <p>VERSION 1.0.0-EVAL</p>
            </div>
        </div>
    );
}
