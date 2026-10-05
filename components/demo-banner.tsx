"use client";

import { useState, type ReactNode } from "react";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DEMO_EMAIL = "admin@example.com";
const DEMO_PASSWORD = "7dJbys5@?tMA";


const Chip = ({ children }: { children: ReactNode }) => (
  <code className="inline-flex select-all items-center rounded-[5px] bg-foreground/10 px-1.75 py-0.75 align-middle font-mono text-[10.5px] font-semibold leading-normal tracking-normal text-foreground">
    {children}
  </code>
);

const DemoBanner = () => {
  const [dismissed, setDismissed] = useState(false);

  
  if (dismissed) return null;

  return (
    
    <div
      role="region"
      aria-label="Aviso del sitio de demostración"
      className="theme-organic w-full border-b border-border bg-card px-5 py-3 text-card-foreground sm:px-8 lg:px-14"
      style={{
        boxShadow:
          "inset 0 -10px 14px -14px color-mix(in srgb, var(--foreground) 38%, transparent)",
      }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex shrink-0 items-center justify-center rounded-[5px] bg-foreground px-1.75 py-0.75 text-background">
              <Info className="size-3" aria-hidden="true" />
            </span>
            <p className="text-[13px] font-semibold leading-[1.2]">Aviso</p>
          </div>

          <p className="mt-1.5 max-w-[70ch] text-[12.5px] leading-[1.6] text-foreground/60">
            Los datos son únicamente para demostración.
          </p>

          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] leading-[1.6] text-foreground/60">
            Inicia sesión como administrador con <Chip>{DEMO_EMAIL}</Chip> y{" "}
            <Chip>{DEMO_PASSWORD}</Chip>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={() => setDismissed(true)}
            aria-label="Cerrar aviso de demostración"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DemoBanner;
