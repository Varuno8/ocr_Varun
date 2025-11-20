import React from 'react';
import * as Icons from 'lucide-react';
import { ModuleId } from '@/lib/types';
import { motion } from 'framer-motion';

interface ModuleCardProps {
    id: ModuleId;
    title: string;
    description: string;
    iconName: string;
    onClick: (id: ModuleId) => void;
    isActive: boolean;
}

export function ModuleCard({ id, title, description, iconName, onClick, isActive }: ModuleCardProps) {
    // Dynamically get icon
    const Icon = (Icons as any)[iconName] || Icons.FileText;

    return (
        <motion.button
            onClick={() => onClick(id)}
            whileHover={{ scale: 1.02, rotateX: 5, rotateY: 5 }}
            whileTap={{ scale: 0.98 }}
            className={`relative w-full text-left p-6 rounded-2xl transition-all duration-300 overflow-hidden group
                ${isActive
                    ? 'bg-cf-surface-glass border-cf-accent-teal/50 shadow-glow'
                    : 'bg-cf-surface-glass border-white/5 hover:border-cf-accent-teal/30 hover:bg-cf-surface-hover/50'
                }
                border backdrop-blur-md
            `}
        >
            {/* Active Indicator / Glow */}
            {isActive && (
                <div className="absolute inset-0 bg-cf-accent-teal/5 animate-pulse-glow pointer-events-none" />
            )}

            <div className="relative z-10 flex items-start gap-5">
                <div className={`p-3.5 rounded-xl transition-all duration-300 shrink-0
                    ${isActive
                        ? 'bg-cf-accent-teal text-cf-bg shadow-glow'
                        : 'bg-cf-surface-hover text-cf-text-secondary group-hover:text-cf-accent-teal group-hover:bg-cf-surface-hover/80'
                    }
                `}>
                    <Icon size={24} strokeWidth={1.5} className={isActive ? 'animate-pulse' : 'group-hover:animate-bounce'} />
                </div>

                <div className="flex-1">
                    <h3 className={`font-bold text-base mb-1.5 tracking-tight transition-colors ${isActive ? 'text-cf-accent-teal text-glow' : 'text-cf-text-primary'}`}>
                        {title}
                    </h3>
                    <p className="text-xs text-cf-text-secondary leading-relaxed font-mono opacity-80">
                        {description}
                    </p>
                </div>
            </div>

            {/* Holographic Corner Accents */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cf-accent-teal/30 rounded-tl-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cf-accent-teal/30 rounded-br-lg opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
    );
}

