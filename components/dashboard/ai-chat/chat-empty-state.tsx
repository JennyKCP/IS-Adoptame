"use client";

import { IconFileAi } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import type { ChatExample } from "@/app/lib/ai/chat-examples";


export function ChatEmptyState({
  examples,
  onPick,
  disabled,
}: {
  examples: ChatExample[];
  onPick: (prompt: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-4 py-10 text-center">
      <div className="bg-muted text-muted-foreground rounded-full p-3">
        <IconFileAi className="size-6" aria-hidden="true" />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold">Consulta sobre el refugio</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          Puedo buscar animales por nombre, resumir un registro e indicarte qué
          requiere atención hoy. Solo respondo con datos actuales del refugio.
        </p>
      </div>

      {examples.length > 0 && (
        <div className="flex max-w-xl flex-wrap justify-center gap-2">
          {examples.map((example) => (
            <Button
              key={example.prompt}
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onPick(example.prompt)}
              className="h-auto rounded-full py-1.5 text-xs font-normal whitespace-normal"
            >
              {example.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
