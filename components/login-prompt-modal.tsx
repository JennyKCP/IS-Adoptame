"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Lock, LogIn } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  
  className?: string;
}

const LoginPromptModal = ({
  isOpen,
  onClose,
  className,
}: LoginPromptModalProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  
  
  const query = searchParams.toString();
  const returnTo = query ? `${pathname}?${query}` : pathname;

  return (
    
    
    
    
    
    
    
    
    
    <span
      style={{ display: "contents" }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent className={cn("sm:max-w-[425px]", className)}>
          <DialogHeader>
            <DialogTitle className="flex items-center pr-8">
              <Lock className="mr-2 h-5 w-5 text-primary" />
              Login Required
            </DialogTitle>
            <DialogDescription>
              You need to be logged in to save pets to your favorites.
              Please log in or create an account to continue.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>

            <Button asChild onClick={onClose}>
              <Link
                href={`/sign-in?callbackUrl=${encodeURIComponent(returnTo)}`}
              >
                <LogIn className="mr-2 h-5 w-5" />
                Login / Sign Up
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </span>
  );
};

export default LoginPromptModal;
