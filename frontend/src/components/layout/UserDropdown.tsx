"use client";

import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, CreditCard, User } from "lucide-react";

export function UserDropdown() {
  const { data: session } = useSession();
  
  if (!session?.user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<button className="flex items-center gap-2 outline-none" />}>
        <Avatar className="h-8 w-8 border border-white/10 hover:border-violet-500/50 transition-colors">
          <AvatarImage src={session.user.image || ""} alt={session.user.name || "Usuario"} />
          <AvatarFallback className="bg-violet-900 text-white text-xs">
            {session.user.name?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-black/90 border-white/10 text-white backdrop-blur-xl" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{session.user.name}</p>
            <p className="text-xs leading-none text-zinc-400">
              {session.user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuGroup>
          <DropdownMenuItem className="focus:bg-white/10 cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Mi Perfil</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="focus:bg-white/10 cursor-pointer">
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Plan y Créditos</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="focus:bg-white/10 cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Configuración</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem 
          className="text-red-400 focus:bg-red-500/20 focus:text-red-300 cursor-pointer"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
