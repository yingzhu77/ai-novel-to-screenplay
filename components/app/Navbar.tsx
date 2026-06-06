"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export function Navbar() {
  const { theme, setTheme } = useTheme();

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.webp" alt="AI Screenwriter" className="size-7 rounded dark:brightness-150" />
          <span className="font-bold text-lg">AI Screenwriter</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">从小说到剧本，一键转换</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="切换深色模式"
            className="h-11 w-11"
          >
            <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
