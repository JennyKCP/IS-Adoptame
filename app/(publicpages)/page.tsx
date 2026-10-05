import { getShelterSettings } from "@/app/lib/data/shelter-settings.data";
import Link from "next/link";
import { Suspense } from "react";
import PetCard from "@/components/public-pages/pets/pet-card";
import LatestPetsSkeleton from "@/components/public-pages/latest-pets-skeleton";
import SpotlightHero from "@/components/public-pages/home/spotlight-hero";
import SpotlightHeroSkeleton from "@/components/public-pages/home/spotlight-hero-skeleton";
import SpeciesPills from "@/components/public-pages/home/species-pills";
import SpeciesPillsSkeleton from "@/components/public-pages/home/species-pills-skeleton";
import BrowseSublineSkeleton from "@/components/public-pages/home/browse-subline-skeleton";
import HelpPanel from "@/components/public-pages/home/help-panel";
import { getCachedSession } from "@/app/lib/auth/session";
import {
  fetchAvailableAnimalCount,
  fetchLatestPublicAnimals,
  fetchSpecies,
  fetchSpotlightAnimals,
} from "../lib/data/public.data";


const BROWSE_STRIP_COUNT = 10;

const Page = () => (
  <>
    <Suspense fallback={<SpotlightHeroSkeleton />}>
      <SpotlightBand />
    </Suspense>

    <section
      aria-labelledby="browse-heading"
      className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:px-14"
    >
      
      <div className="mb-6">
        <div className="mb-5">
          <h2 id="browse-heading" className="mb-1.5 font-display text-[36px]">
            Explora nuestras mascotas
          </h2>
          <Suspense fallback={<BrowseSublineSkeleton />}>
            <BrowseSubline />
          </Suspense>
        </div>

        <Suspense fallback={<SpeciesPillsSkeleton />}>
          <SpeciesPillsContent />
        </Suspense>
      </div>

      <Suspense fallback={<LatestPetsSkeleton />}>
        <LatestPetsContent />
      </Suspense>

      <div className="mt-10 flex justify-center">
        <Link
          href="/pets?page=1"
          className="inline-flex items-center rounded-full border border-border px-[26px] py-3 font-display text-[14px] leading-[1.2] transition-colors hover:bg-foreground/[0.07]"
        >
          Ver todas las mascotas
        </Link>
      </div>
    </section>

    <HelpPanel />
  </>
);


const SpotlightBand = async () => {
  const [spotlightAnimals, availableCount, session] = await Promise.all([
    fetchSpotlightAnimals(),
    fetchAvailableAnimalCount(),
    getCachedSession(),
  ]);

  if (spotlightAnimals.length === 0) return null;

  return (
    <SpotlightHero
      animals={spotlightAnimals}
      unitSystem={(await getShelterSettings()).weightUnitSystem}
      availableCount={availableCount}
      currentUserPersonId={session?.user?.personId}
    />
  );
};

const BrowseSubline = async () => {
  const availableCount = await fetchAvailableAnimalCount();

  return (
    <p className="text-[14.5px] text-organic-neutral-700">
      {availableCount} {availableCount === 1 ? "mascota" : "mascotas"}. Las nuevas
      llegadas aparecen aquí cuando están listas para conocer a su familia.
    </p>
  );
};

const SpeciesPillsContent = async () => {
  const species = await fetchSpecies();

  return <SpeciesPills speciesNames={species.map(({ name }) => name)} />;
};

const LatestPetsContent = async () => {
  const [latestAnimals, session] = await Promise.all([
    fetchLatestPublicAnimals(BROWSE_STRIP_COUNT),
    getCachedSession(),
  ]);

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
      {latestAnimals.map((animal) => (
        <PetCard
          key={animal.id}
          pet={animal}
          currentUserPersonId={session?.user?.personId}
        />
      ))}
    </div>
  );
};

export default Page;
