"use client";

import { useState } from "react";

export interface DirtyFormHandle {
  isDirty: () => boolean;
}


export function haveFormValuesChanged(
  current: Record<string, unknown>,
  initial: Record<string, unknown>,
): boolean {
  return JSON.stringify(current) !== JSON.stringify(initial);
}

interface UseConfirmedOpenChangeResult {
  guardedOnOpenChange: (open: boolean) => void;
  isConfirmOpen: boolean;
  confirmDiscard: () => void;
  cancelDiscard: () => void;
}


export function useConfirmedOpenChange(
  getIsDirty: () => boolean,
  onOpenChange: (open: boolean) => void,
): UseConfirmedOpenChangeResult {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const guardedOnOpenChange = (open: boolean) => {
    if (open) {
      onOpenChange(true);
      return;
    }
    if (getIsDirty()) {
      setIsConfirmOpen(true);
      return;
    }
    onOpenChange(false);
  };

  const confirmDiscard = () => {
    setIsConfirmOpen(false);
    onOpenChange(false);
  };

  const cancelDiscard = () => {
    setIsConfirmOpen(false);
  };

  return { guardedOnOpenChange, isConfirmOpen, confirmDiscard, cancelDiscard };
}
