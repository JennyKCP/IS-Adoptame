"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Info, type LucideIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface FieldInfoProps {
  
  children: ReactNode;
  
  label: string;
  className?: string;
  
  tone?: "muted" | "warning";
  
  icon?: LucideIcon;
}

const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

function subscribeToHover(onStoreChange: () => void) {
  const mql = window.matchMedia(HOVER_QUERY);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

const getHoverSnapshot = () => window.matchMedia(HOVER_QUERY).matches;
const getHoverServerSnapshot = () => false;


export function FieldInfo({
  children,
  label,
  className,
  tone = "muted",
  icon: Icon = Info,
}: FieldInfoProps) {
  const [open, setOpen] = useState(false);
  
  
  const canHover = useSyncExternalStore(
    subscribeToHover,
    getHoverSnapshot,
    getHoverServerSnapshot,
  );

  const hoverProps = canHover
    ? {
        onMouseEnter: () => setOpen(true),
        onMouseLeave: () => setOpen(false),
      }
    : {};

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          
          
          type="button"
          aria-label={label}
          
          
          
          
          
          
          
          onClick={(event) => {
            if (canHover && event.detail !== 0) event.preventDefault();
          }}
          
          
          
          
          
          onFocus={(event) => {
            if (event.target.matches(":focus-visible")) setOpen(true);
          }}
          onBlur={() => setOpen(false)}
          {...hoverProps}
          className={cn(
            "focus-visible:ring-ring inline-flex size-4 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
            tone === "warning"
              ? "text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
              : "text-muted-foreground hover:text-foreground",
            className,
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={6}
        
        onOpenAutoFocus={(event) => event.preventDefault()}
        
        
        
        
        
        onCloseAutoFocus={(event) => event.preventDefault()}
        className="text-muted-foreground w-64 p-3 text-sm leading-snug font-normal"
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}