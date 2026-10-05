import { cache } from "react";
import prisma from "@/app/lib/prisma";
import { resolveShelterSettings } from "@/app/lib/utils/shelter-settings";
import { shelterToday, type CalendarDay } from "@/app/lib/utils/shelter-day";
import { ensurePhoneIndexCountry } from "./phone-index.data";



export const getShelterSettings = cache(async () =>
  resolveShelterSettings(
    await prisma.shelterSettings.findUnique({ where: { id: "shelter" } }),
  ),
);


export const getShelterToday = cache(
  async (): Promise<CalendarDay> =>
    shelterToday((await getShelterSettings()).timezone),
);



export const getPhoneSearchSettings = cache(async () => {
  
  
  while (true) {
    const row = await prisma.shelterSettings.findUnique({
      where: { id: "shelter" },
    });
    const settings = resolveShelterSettings(row);
    if (!row || row.phoneIndexCountry === settings.defaultPhoneCountry) {
      return settings;
    }
    await ensurePhoneIndexCountry();
  }
});
