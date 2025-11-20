import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
    label: string;
    value: string | number;
    icon?: LucideIcon;
    trend?: {
        value: string;
        isPositive: boolean;
    };
    index?: number;
    type?: 'default' | 'accuracy' | 'pending';
}

export function StatCard({ label, value, icon: Icon, trend, index = 0, type = 'default' }: StatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="relative group"
        >
            <div className="absolute inset-0 bg-cf-accent-teal/5 rounded-2xl blur-xl group-hover:bg-cf-accent-teal/10 transition-all duration-500" />

            <div className="relative h-full glass-panel rounded-2xl p-6 overflow-hidden transition-all duration-300 group-hover:translate-y-[-4px] group-hover:shadow-glow">
                {/* Background Effects */}
                <div className="absolute top-0 right-0 p-20 bg-cf-accent-blue/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

                {/* Header */}
                <div className="flex justify-between items-start mb-6 relative z-10">
                    <span className="text-xs font-bold tracking-widest text-cf-text-secondary uppercase">{label}</span>
                    {Icon && (
                        <div className="p-2 rounded-lg bg-cf-surface-hover/50 text-cf-accent-teal border border-white/5">
                            <Icon size={16} />
                        </div>
                    )}
                </div>

                {/* Value */}
                <div className="relative z-10">
                    <div className="flex items-baseline gap-2">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                            className="text-5xl font-bold font-mono text-cf-text-primary tracking-tighter text-glow"
                        >
                            {value}
                        </motion.div>
                    </div>

                    {/* Trend / Footer */}
                    {trend && (
                        <div className="mt-4 flex items-center gap-2">
                            <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-md border ${trend.isPositive
                                    ? 'text-cf-accent-teal bg-cf-accent-teal/10 border-cf-accent-teal/20'
                                    : 'text-cf-accent-amber bg-cf-accent-amber/10 border-cf-accent-amber/20'
                                }`}>
                                {trend.isPositive ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
                                {trend.value}
                            </div>
                            <span className="text-[10px] text-cf-text-muted uppercase tracking-wider">vs yesterday</span>
                        </div>
                    )}
                </div>

                {/* Decorative Scan Line */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cf-accent-teal/50 to-transparent animate-scan-line" />
                </div>
            </div>
        </motion.div>
    );
}
