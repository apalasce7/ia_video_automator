"use client";

import { useBackendStatus } from "@/lib/hooks/useBackendStatus";
import { UserDropdown } from "./UserDropdown";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function TopNav() {
  const status = useBackendStatus();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-white/10 bg-black/40 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-zinc-400 hover:text-white" />
        <h1 className="text-lg font-semibold text-white tracking-tight hidden sm:block">
          UGC Automator
        </h1>
      </div>

      <div className="flex items-center gap-6">
        {/* Indicador de estado */}
        <div className="flex items-center gap-2 text-xs">
          {status ? (
            <>
              <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-2 py-1 border border-white/10">
                <span className={`w-2 h-2 rounded-full ${status.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-zinc-300">API</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-2 py-1 border border-white/10 hidden md:flex">
                <span className="text-zinc-300">Jobs: {status.active_jobs}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-2 py-1 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
              <span className="text-zinc-400">Verificando...</span>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-white/10" />
        
        <UserDropdown />
      </div>
    </header>
  );
}
