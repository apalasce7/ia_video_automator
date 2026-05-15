import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopNav } from "@/components/layout/TopNav";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SessionProvider } from "next-auth/react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-[#0a0a0f] flex flex-col min-h-screen overflow-hidden">
          <TopNav />
          <main className="flex-1 overflow-auto p-6 relative">
            {/* Background elements to match the premium theme */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-900/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="relative z-10">
              {children}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </SessionProvider>
  );
}
