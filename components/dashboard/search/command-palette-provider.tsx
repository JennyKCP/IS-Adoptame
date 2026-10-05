"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  CommandPalette,
  type PaletteNavItem,
} from "@/components/dashboard/search/command-palette";

interface CommandPaletteContextValue {
  open: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null,
);


export const useCommandPalette = () => useContext(CommandPaletteContext);

interface CommandPaletteProviderProps {
  navItems: PaletteNavItem[];
  children: ReactNode;
}


export const CommandPaletteProvider = ({
  navItems,
  children,
}: CommandPaletteProviderProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      
      if (event.key.toLowerCase() !== "k") return;
      if (!event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      setOpen((previous) => !previous);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  
  
  const value = { open: () => setOpen(true) };

  return (
    
    
    <CommandPaletteContext value={value}>
      {children}
      <CommandPalette navItems={navItems} open={open} onOpenChange={setOpen} />
    </CommandPaletteContext>
  );
};
