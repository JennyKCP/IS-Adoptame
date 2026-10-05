"use client";

import { useEffect, useRef } from "react";
import { IconArrowUp, IconPlayerStopFilled } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";


export function ChatComposer({
  value,
  onChange,
  onSubmit,
  onStop,
  isStreaming,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isStreaming: boolean;
  
  disabled?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  
  
  
  
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !isStreaming && !disabled;

  return (
    <form
      className="bg-background flex items-end gap-2 rounded-xl border p-2 shadow-xs"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSubmit();
      }}
    >
      <Textarea
        ref={textareaRef}
        value={value}
        rows={1}
        disabled={isStreaming || disabled}
        placeholder="Pregunta sobre un animal, una tarea o las prioridades de hoy…"
        aria-label="Mensaje para el asistente del refugio"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (canSend) onSubmit();
          }
        }}
        className="max-h-[min(10rem,25dvh)] min-h-9 resize-none border-0 bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
      />

      {isStreaming ? (
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={onStop}
          aria-label="Detener generación"
        >
          <IconPlayerStopFilled />
        </Button>
      ) : (
        <Button type="submit" size="icon" disabled={!canSend} aria-label="Enviar">
          <IconArrowUp />
        </Button>
      )}
    </form>
  );
}
