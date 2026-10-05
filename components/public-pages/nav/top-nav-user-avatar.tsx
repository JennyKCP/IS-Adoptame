"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/app/lib/auth/auth-client";
import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserAvatarProps {
  userImage?: string | null;
}

const UserMenu = ({ userImage }: UserAvatarProps) => {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 rounded-full"
        >
          <span className="sr-only">Abrir menú de usuario</span>
          <Avatar className="h-8 w-8">
            <AvatarImage src={userImage || ""} alt="Imagen de perfil" />
            <AvatarFallback className="bg-secondary">
              <User className="size-4 text-secondary-foreground" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        className="theme-organic w-48 bg-popover text-popover-foreground"
        align="end"
        forceMount
      >
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/dashboard/account">Cuenta</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            authClient.signOut({
              fetchOptions: { onSuccess: () => router.refresh() },
            })
          }
          className="cursor-pointer"
        >
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
