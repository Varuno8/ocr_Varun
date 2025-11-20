import React from 'react';
import { Activity, Bell, Search, Settings, Menu, Wifi } from 'lucide-react';

export function TopBar() {
    return (
        <header className="h-16 border-b border-white/5 bg-cf-surface-glass backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between shadow-glass">
            <div className="flex items-center gap-4">
                <div className="p-2 bg-cf-accent-teal/10 rounded-lg border border-cf-accent-teal/20">
                    <Activity className="text-cf-accent-teal animate-pulse" size={20} />
                </div>
                <div>
                    <h1 className="text-lg font-bold tracking-tight text-cf-text-primary">
                        DOCUHEALTH<span className="text-cf-accent-teal">.AI</span>
                    </h1>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cf-accent-teal animate-pulse shadow-[0_0_8px_rgba(0,212,170,0.8)]"></span>
                        <span className="text-[10px] font-mono text-cf-accent-teal tracking-wider uppercase">System Online</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 max-w-xl mx-12 hidden md:block relative group">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-cf-text-muted group-focus-within:text-cf-accent-teal transition-colors" />
                </div>
                <input
                    type="text"
                    placeholder="Search patient records, scans, or logs..."
                    className="w-full bg-cf-surface-hover/50 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-cf-text-primary placeholder:text-cf-text-muted focus:outline-none focus:ring-1 focus:ring-cf-accent-teal/50 focus:bg-cf-surface-hover transition-all"
                />
            </div>

            <div className="flex items-center gap-4">
                {/* Biometric Monitor / ECG */}
                <div className="hidden lg:flex items-center gap-3 px-4 py-1.5 bg-cf-surface-hover/30 rounded-full border border-white/5">
                    <Activity size={14} className="text-cf-accent-teal" />
                    <div className="h-8 w-24 relative overflow-hidden">
                        {/* Simulated ECG Line */}
                        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                            <path d="M0 20 L10 20 L15 10 L20 30 L25 20 L40 20 L45 5 L50 35 L55 20 L100 20" fill="none" stroke="#00D4AA" strokeWidth="1.5" className="animate-scan-line" style={{ strokeDasharray: '100', strokeDashoffset: '0' }} />
                        </svg>
                    </div>
                    <span className="text-xs font-mono text-cf-accent-teal">98ms</span>
                </div>

                <button className="p-2 text-cf-text-secondary hover:text-cf-text-primary hover:bg-white/5 rounded-lg transition-colors relative">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-cf-accent-coral rounded-full shadow-glow"></span>
                </button>

                <div className="h-8 w-[1px] bg-white/10 mx-1"></div>

                <div className="flex items-center gap-3 pl-2 cursor-pointer group">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cf-accent-teal to-cf-accent-blue p-[1px]">
                        <div className="w-full h-full bg-cf-bg rounded-[7px] flex items-center justify-center text-xs font-bold text-white group-hover:bg-transparent transition-colors">
                            VT
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
