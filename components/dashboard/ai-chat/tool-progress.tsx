"use client";

import { useEffect, useState } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import type { ActiveStep } from "@/app/lib/ai/chat-progress";


const LONG_STEP_SECONDS = 10;


function useStepSeconds(): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return seconds;
}


export function ToolProgress({ step }: { step: ActiveStep }) {
  const seconds = useStepSeconds();
  const isSlow = seconds >= LONG_STEP_SECONDS;

  return (
    <div
      className="text-muted-foreground flex items-center gap-2 py-1 text-sm"
      role="status"
      aria-live="polite"
    >
      <IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
      <span>
        {step.label}…
        {isSlow && (
          <span className="text-muted-foreground/70 ml-1.5">
            still working ({seconds}s)
          </span>
        )}
      </span>
    </div>
  );
}
