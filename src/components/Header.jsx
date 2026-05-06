import React from "react";
import { Moon, Sparkles, Sun } from "lucide-react";
import { APP_VERSION, BUILD_TIME } from "../constants/appConstants.js";

function Header({ workspaceName, isDark, onToggleTheme }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 via-sky-400 to-blue-600 shadow-lg shadow-sky-900/40">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{workspaceName}</h1>
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-500 border border-white/5">
                v{APP_VERSION}
              </span>
            </div>
            <p className="text-sm text-slate-300/80">
              {import.meta.env.DEV ? `Dev Build: ${new Date(BUILD_TIME).toLocaleTimeString()}` : "จัดการคอนเทนต์และการตั้งค่า AI พร้อมระบบ Sync อัตโนมัติ"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          className="rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>
    </header>
  );
}

export default Header;
