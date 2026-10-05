"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { Image as PhotoIcon } from "lucide-react";
import type { SpotlightAnimal } from "@/app/lib/data/public.data";
import { PET_PHOTO_COMING_SOON_IMAGE } from "@/app/lib/constants/constants";
import type { WeightUnitSystem } from "@/app/lib/utils/shelter-settings";
import { formatWeight } from "@/app/lib/utils/weight-format";
import FavoriteButton from "../favorite-button";

interface SpotlightHeroProps {
  animals: SpotlightAnimal[];
  unitSystem: WeightUnitSystem;
  
  availableCount: number;
  currentUserPersonId: string | undefined;
}


const SpotlightHero = ({
  animals,
  unitSystem,
  availableCount,
  currentUserPersonId,
}: SpotlightHeroProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  
  
  
  
  
  const animal = animals[selectedIndex] ?? animals[0];

  
  
  const remainingCount = Math.max(availableCount - animals.length, 0);

  
  
  const badges = [
    animal.isSpayedNeutered && "Neutered",
    animal.hasMicrochip && "Chipped",
  ].filter((badge): badge is string => Boolean(badge));

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  const nameFontSize = `max(32px, min(104px, 100cqw / ${(
    animal.name.length * 0.653
  ).toFixed(2)}))`;

  
  
  
  
  
  
  
  
  
  
  
  const meta = [
    animal.breedString,
    animal.ageString,
    formatWeight(animal.weightGrams, unitSystem),
  ].filter((part): part is string => Boolean(part));

  return (
    <section
      aria-labelledby="spotlight-heading"
      className="relative overflow-hidden bg-organic-accent-100"
    >
      
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-[-90px] hidden size-[340px] rounded-full bg-organic-accent-200 md:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-120px] left-[38%] hidden size-[220px] rounded-full bg-organic-sage-200 md:block"
      />

      <div className="relative mx-auto w-full max-w-6xl px-5 pt-6 pb-8 sm:px-8 lg:px-14">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_470px] lg:gap-12">
          
          <div className="order-first lg:order-last lg:justify-self-end">
            <div className="relative mx-auto w-[min(72vw,320px)] sm:w-[min(60vw,380px)] lg:w-[440px]">
              
              <div
                aria-hidden="true"
                className="absolute inset-[-18px_30px_30px_-18px] rounded-full bg-organic-sage-300"
              />

              <div className="relative aspect-square overflow-hidden rounded-full bg-organic-neutral-300 shadow-organic-lg">
                {animal.imageUrl ? (
                  <Image
                    
                    
                    
                    
                    key={animal.id}
                    src={animal.imageUrl}
                    alt={`Photo of ${animal.name}`}
                    fill
                    sizes="(max-width: 640px) 72vw, (max-width: 1024px) 60vw, 440px"
                    
                    
                    
                    
                    
                    loading="eager"
                    fetchPriority="high"
                    
                    
                    
                    className="object-cover object-[50%_30%]"
                  />
                ) : (
                  <Image
                    src={PET_PHOTO_COMING_SOON_IMAGE}
                    alt="Photo coming soon"
                    fill
                    sizes="(max-width: 640px) 72vw, (max-width: 1024px) 60vw, 440px"
                    
                    
                    loading="eager"
                    fetchPriority="high"
                    className="object-cover"
                  />
                )}
              </div>

              {badges.length > 0 && (
                <div className="absolute top-[14px] right-[6px] flex items-center gap-2 rounded-full bg-background px-[18px] py-[9px] text-[13px] shadow-organic-md">
                  {badges.map((badge, index) => (
                    <span
                      key={badge}
                      className="inline-flex items-center gap-2"
                    >
                      {index > 0 && (
                        <span
                          aria-hidden="true"
                          className="text-[10px] align-middle"
                        >
                          •
                        </span>
                      )}
                      <span>{badge}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          
          <div className="@container">
            {animal.waitingDays !== null && (
              
              
              
              
              <p className="mb-5 inline-flex rounded-full bg-organic-sage-100 px-3.5 py-[5px] text-[12.5px] tracking-[0.02em] text-organic-sage-800">
                Esperando hace {animal.waitingDays}{" "}
                {animal.waitingDays === 1 ? "día" : "días"}; es quien más tiempo
                lleva aquí
              </p>
            )}

            <h1
              id="spotlight-heading"
              
              
              
              
              
              
              className="mb-2.5 font-display leading-[0.94] tracking-[-0.03em] break-words"
              style={{ fontSize: nameFontSize }}
            >
              {animal.name}
            </h1>

            <p className="mb-[18px] flex flex-wrap items-center gap-2.5 font-display text-[22px] leading-[1.55] text-organic-accent-700">
              {meta.map((part, index) => (
                <span key={index} className="inline-flex items-center gap-2.5">
                  {index > 0 && (
                    <span
                      aria-hidden="true"
                      className="text-[12px] align-middle"
                    >
                      •
                    </span>
                  )}
                  <span>{part}</span>
                </span>
              ))}
            </p>

            
            <div className="mb-7 min-h-[87px] max-w-[46ch]">
              {animal.description && (
                <p className="line-clamp-3 text-[17.5px] leading-[29px] text-pretty text-organic-neutral-800">
                  {animal.description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3.5">
              <Link
                href={`/pets/${animal.id}`}
                className="inline-flex items-center rounded-full bg-primary px-[26px] py-[13px] font-display text-[15px] leading-[1.2] text-primary-foreground transition-colors hover:bg-organic-accent-600"
              >
                Conoce a {animal.name}
              </Link>
              <FavoriteButton
                
                
                key={animal.id}
                animalId={animal.id}
                currentUserPersonId={currentUserPersonId}
                isFavoritedByCurrentUser={animal.isFavoritedByCurrentUser}
                label="Guardar en favoritos"
              />
            </div>
          </div>
        </div>

        
        <div className="mt-10 flex items-center gap-[26px]">
          <span
            id="flick-through-label"
            className="max-w-[9ch] shrink-0 text-[13px] leading-[1.3] text-organic-accent-800"
          >
            O desliza para explorar
          </span>

          
          <div
            role="group"
            aria-labelledby="flick-through-label"
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            className="-m-1.5 flex min-w-0 gap-[22px] snap-x snap-mandatory scroll-p-1.5 overflow-x-auto p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {animals.map((thumbnail, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={thumbnail.id}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  aria-pressed={isSelected}
                  className="shrink-0 snap-start text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-organic-accent-100 rounded-[20px]"
                >
                  <span
                    className={clsx(
                      "relative block size-[78px] overflow-hidden rounded-full bg-organic-neutral-300",
                      isSelected && "shadow-[0_0_0_3px_var(--primary)]",
                    )}
                  >
                    {thumbnail.imageUrl ? (
                      <Image
                        src={thumbnail.imageUrl}
                        alt=""
                        fill
                        sizes="78px"
                        loading={isSelected ? "eager" : "lazy"} 
                        className="object-cover object-[50%_30%]"
                      />
                    ) : (
                      <PhotoIcon
                        className="absolute inset-0 m-auto size-8 text-organic-neutral-600"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span className="mt-[7px] block max-w-[78px] truncate text-[12.5px]">
                    {thumbnail.name}
                  </span>
                </button>
              );
            })}

            {remainingCount > 0 && (
              <Link
                href="/pets"
                className="shrink-0 snap-start text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-organic-accent-100 rounded-[20px]"
              >
                <span className="grid size-[78px] place-items-center rounded-full border border-dashed border-organic-accent-400 font-display text-[15px] text-organic-accent-700">
                  +{remainingCount}
                </span>
                  <span className="mt-[7px] block text-[12.5px]">Todos</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SpotlightHero;
