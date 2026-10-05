import type { TransactionClient } from "@/app/lib/prisma";




export const findLiveUnitForPlacement = async (
  tx: TransactionClient,
  unitId: string,
) => {
  await tx.$queryRaw`SELECT id FROM units WHERE id = ${unitId} FOR SHARE`;
  
  
  
  
  return tx.unit.findFirst({
    where: { id: unitId, deletedAt: null, location: { deletedAt: null } },
    select: {
      id: true,
      name: true,
      capacity: true,
      location: { select: { name: true } },
    },
  });
};


export const deleteUnitIfEmpty = async (
  tx: TransactionClient,
  unitId: string,
): Promise<boolean> => {
  await tx.$queryRaw`SELECT id FROM units WHERE id = ${unitId} FOR NO KEY UPDATE`;
  const housed = await tx.animal.count({ where: { currentUnitId: unitId } });
  if (housed > 0) return false;
  await tx.unit.update({
    where: { id: unitId },
    data: { deletedAt: new Date() },
  });
  return true;
};


export const lockLiveLocation = async (
  tx: TransactionClient,
  locationId: string,
): Promise<boolean> => {
  await tx.$queryRaw`SELECT id FROM locations WHERE id = ${locationId} FOR SHARE`;
  const location = await tx.location.findUnique({
    where: { id: locationId },
    select: { deletedAt: true },
  });
  return location !== null && location.deletedAt === null;
};


export const deleteLocationIfEmpty = async (
  tx: TransactionClient,
  locationId: string,
): Promise<boolean> => {
  await tx.$queryRaw`SELECT id FROM locations WHERE id = ${locationId} FOR NO KEY UPDATE`;
  const units = await tx.unit.count({
    where: { locationId, deletedAt: null },
  });
  if (units > 0) return false;
  await tx.location.update({
    where: { id: locationId },
    data: { deletedAt: new Date() },
  });
  return true;
};


export const restoreUnitIfLocationLive = async (
  tx: TransactionClient,
  unitId: string,
): Promise<boolean> => {
  const unit = await tx.unit.findUniqueOrThrow({
    where: { id: unitId },
    select: { locationId: true },
  });
  if (!(await lockLiveLocation(tx, unit.locationId))) return false;
  await tx.unit.update({
    where: { id: unitId },
    data: { deletedAt: null },
  });
  return true;
};
