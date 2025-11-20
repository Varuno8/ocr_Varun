import React from 'react';
import { TopBar } from './TopBar';

export function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col min-h-screen">
            <TopBar />
            <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
                {children}
            </main>
        </div>
    );
}
