"use client";

import { useSyncExternalStore } from "react";
import { IconSearch } from "@tabler/icons-react";

import { useCommandPalette } from "@/components/dashboard/search/command-palette-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";



const subscribe = () => () => {};

const getSnapshot = () => /mac/i.test(navigator.userAgent);



const getServerSnapshot = () => true;


const useShortcutLabel = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
    ? "⌘K"
    : "Ctrl K";


export const SearchTrigger = ({ className }: { className?: string }) => {
  const palette = useCommandPalette();
  const shortcut = useShortcutLabel();

  if (!palette) return null;

  return (
    <Button
      variant="outline"
      onClick={palette.open}
      
      
      aria-label="Buscar"
      className={cn(
        "text-muted-foreground size-8 justify-center p-0 font-normal",
        "sm:w-56 sm:justify-start sm:gap-2 sm:px-3",
        "hover:text-foreground",
        className,
      )}
    >
      <IconSearch aria-hidden="true" className="size-4" />
      <span aria-hidden="true" className="hidden sm:inline">
        Buscar…
      </span>
      <kbd
        aria-hidden="true"
        className="text-muted-foreground bg-muted ml-auto hidden rounded border px-1.5 py-0.5 text-[10px] font-medium sm:inline-block"
      >
        {shortcut}
      </kbd>
    </Button>
  );
};
