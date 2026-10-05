import type { AnimalSize } from "@/prisma/generated/enums";






export const toAnimalData = (data: {
  size?: AnimalSize | "";
  currentUnitId?: string;
  sourcePartnerId?: string;
  surrenderingPersonId?: string;
  foundAddress?: string;
  foundCity?: string;
  foundState?: string;
  notes?: string;
  microchipNumber?: string;
  isSpayedNeutered: boolean;
  description?: string;
}) => ({
  size: data.size || null,
  currentUnitId: data.currentUnitId || null,
  sourcePartnerId: data.sourcePartnerId || null,
  surrenderingPersonId: data.surrenderingPersonId || null,
  foundAddress: data.foundAddress || null,
  foundCity: data.foundCity || null,
  foundState: data.foundState || null,
  notes: data.notes || null,
  microchipNumber: data.microchipNumber || null,
  
  
  isSpayedNeutered: data.isSpayedNeutered,
  description: data.description || null,
});
