import { calendarDay } from "@/app/lib/utils/shelter-day";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import type { AnimalSize } from "@/prisma/generated/enums";
import { shimmer, toBase64 } from "@/app/lib/utils/image-loading-placeholder";
import { PET_PHOTO_COMING_SOON_IMAGE } from "@/app/lib/constants/constants";
import FavoriteButton from "../favorite-button";
import { calculateAgeString } from "@/app/lib/utils/date-utils";
import { formatAnimalSize } from "@/app/lib/utils/enum-formatter";

export interface PetCardData {
  id: string;
  name: string;
  birthDate: string;
  size: AnimalSize | null;
  species: { name: string };
  breeds: { name: string }[];
  characteristics: { name: string }[];
  animalImages: { url: string }[];
  favorites?: { userId: string }[];
}

interface PetCardProps {
  pet: PetCardData;
  currentUserPersonId: string | undefined;
  
  isAvailable?: boolean;
}

const PetCard = ({
  pet,
  currentUserPersonId,
  isAvailable = true,
}: PetCardProps) => {
  const isFavoritedByCurrentUser = !!(
    currentUserPersonId && (pet.favorites?.length ?? 0) > 0
  );
  const ageString = calculateAgeString({
    birthDate: calendarDay(pet.birthDate),
    simple: true,
  });

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  const tags = [
    {
      label: pet.breeds[0]?.name ?? pet.species.name,
      className: "bg-organic-accent-100 text-organic-accent-800",
    },
    {
      label: formatAnimalSize(pet.size),
      className: "bg-organic-neutral-100 text-organic-neutral-800",
    },
    {
      label: pet.characteristics[0]?.name,
      className: "bg-organic-sage-100 text-organic-sage-800",
    },
  ].filter((tag): tag is { label: string; className: string } =>
    Boolean(tag.label),
  );

  const inner = (
    <>
      <div className="relative h-[210px] w-full overflow-hidden rounded-[20px]">
        {pet.animalImages?.length > 0 ? (
          <Image
            src={pet.animalImages[0].url}
            alt={`Photo of ${pet.name}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 45vw, 280px"
            placeholder={`data:image/svg+xml;base64,${toBase64(
              shimmer(280, 210),
            )}`}
            className={clsx(
              "object-cover transition-transform duration-300 ease-in-out",
              isAvailable && "group-hover:scale-110",
              !isAvailable && "grayscale",
            )}
          />
        ) : (
          <Image
            src={PET_PHOTO_COMING_SOON_IMAGE}
            alt="Photo coming soon"
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 45vw, 280px"
            
            
            
            placeholder={`data:image/svg+xml;base64,${toBase64(
              shimmer(280, 210),
            )}`}
            className={clsx("object-contain", !isAvailable && "grayscale")}
          />
        )}

        {!isAvailable && (
          <div className="pointer-events-none absolute inset-0 flex items-start justify-start bg-background/40 p-2">
            <span className="rounded-full bg-background/90 px-2.5 py-0.5 text-xs font-medium text-muted-foreground shadow-organic-sm">
              Unavailable
            </span>
          </div>
        )}

        <div className="absolute top-2 right-2">
          <FavoriteButton
            animalId={pet.id}
            currentUserPersonId={currentUserPersonId}
            isFavoritedByCurrentUser={isFavoritedByCurrentUser}
          />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        
        <span className="min-w-0 truncate font-display text-[21px]">
          {pet.name}
        </span>
        <span className="shrink-0 text-[13px] text-muted-foreground">
          {ageString}
        </span>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(({ label, className }, index) => (
            <span
              key={`${index}-${label}`}
              className={clsx(
                "inline-flex items-center rounded-full px-2.5 py-0.75 text-[11px] tracking-[0.02em]",
                className,
              )}
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {isAvailable && (
        
        
        <span className="mt-auto block rounded-full bg-primary px-4 py-2.5 text-center text-[13.5px] font-semibold text-primary-foreground transition-colors group-hover:bg-organic-accent-600">
          Meet {pet.name}
        </span>
      )}
    </>
  );

  const wrapperClass =
    "group flex flex-col gap-[10px] rounded-[32px] bg-card p-[14px] transition-shadow duration-150 ease-in-out";

  
  
  
  if (isAvailable) {
    return (
      <Link
        href={`/pets/${pet.id}`}
        className={clsx(wrapperClass, "hover:shadow-organic-md")}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className={clsx(wrapperClass, "cursor-default")} aria-disabled="true">
      {inner}
    </div>
  );
};

export default PetCard;
