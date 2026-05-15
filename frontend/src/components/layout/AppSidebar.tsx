"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Film,
  LayoutTemplate,
  History,
  Settings,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-white/10">
      <SidebarHeader className="border-b border-white/10 p-4">
        <Link href="/" className="flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 shadow-lg shadow-violet-500/20">
            <Film className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">Studio V3</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Core Menu */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">
            Navegación
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/influencers" />} isActive={pathname.startsWith("/influencers")} className="text-zinc-400 hover:text-white hover:bg-white/5 data-[active=true]:bg-violet-500/20 data-[active=true]:text-violet-300">
                  <Users />
                  <span>Influencers</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/studio" />} isActive={pathname.startsWith("/studio")} className="text-zinc-400 hover:text-white hover:bg-white/5 data-[active=true]:bg-violet-500/20 data-[active=true]:text-violet-300">
                  <LayoutTemplate />
                  <span>Estudio de Creación</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/" />} isActive={pathname === "/"} className="text-zinc-400 hover:text-white hover:bg-white/5 data-[active=true]:bg-violet-500/20 data-[active=true]:text-violet-300">
                  <Film />
                  <span>Mesa de Montaje</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/historial" />} isActive={pathname.startsWith("/historial")} className="text-zinc-400 hover:text-white hover:bg-white/5 data-[active=true]:bg-violet-500/20 data-[active=true]:text-violet-300">
                  <History />
                  <span>Historial</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


        {/* Sistema */}
        <SidebarGroup className="mt-auto pb-4">
          <SidebarGroupLabel className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">
            Sistema
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/settings" />} isActive={pathname.startsWith("/settings")} className="text-zinc-400 hover:text-white hover:bg-white/5 data-[active=true]:bg-violet-500/20 data-[active=true]:text-violet-300">
                  <Settings />
                  <span>Configuración</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
