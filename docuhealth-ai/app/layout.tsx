import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/layout/Shell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "DocuHealth AI",
    description: "AI-Powered Document Digitization for Government Medical Institutions",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.className} bg-slate-50 min-h-screen`}>
                <Shell>{children}</Shell>
            </body>
        </html>
    );
}
