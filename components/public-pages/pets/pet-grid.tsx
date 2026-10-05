import Link from "next/link";
import {
  fetchAvailableAnimalCount,
  fetchPublishedPets,
} from "@/app/lib/data/public.data";
import { getCachedSession } from "@/app/lib/auth/session";
import PetCard from "./pet-card";
import { SimplePagination } from "@/components/simple-pagination";
import { describePetFilters, joinFilterLabels } from "./filter-summary";

interface Props {
  query: string;
  currentPage: number;
  speciesName: string;
  colorNames: string;
  sex: string;
  size: string;
  sort: string;
}

const PetGrid = async ({
  query,
  currentPage,
  speciesName,
  colorNames,
  sex,
  size,
  sort,
}: Props) => {
  const session = await getCachedSession();
  const currentUserPersonId = session?.user?.personId;

  const { pets, totalPages } = await fetchPublishedPets({
    query,
    currentPage,
    speciesName,
    color: colorNames,
    sex,
    size,
    sort,
  });

  if (pets.length === 0) {
    return (
      <EmptyState
        filterLabels={describePetFilters({
          query,
          category: speciesName,
          color: colorNames,
          sex,
          size,
        })}
      />
    );
  }

  return (
    <>
      <div className="my-6 mb-12 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
        {pets.map((pet) => (
          <PetCard
            key={pet.id}
            pet={pet}
            currentUserPersonId={currentUserPersonId}
          />
        ))}
      </div>
      <div className="flex justify-center">
        <SimplePagination
          totalPages={totalPages}
          linkClassName="rounded-full border border-border bg-transparent text-[13.5px] shadow-none hover:bg-accent"
          activeLinkClassName="border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
        />
      </div>
    </>
  );
};


const EmptyState = async ({ filterLabels }: { filterLabels: string[] }) => {
  
  
  if (filterLabels.length === 0) {
    return (
      <div className="py-20 text-center">
        <h2 className="font-display text-[clamp(24px,4vw,32px)]">
          No animals are listed just yet
        </h2>
        <p className="mx-auto mt-3 max-w-[46ch] text-[15px] leading-[1.65] text-pretty text-organic-neutral-800">
          Everyone currently in our care is still being settled in. New arrivals
          appear here as soon as they&apos;re ready to meet people.
        </p>
      </div>
    );
  }

  const availableCount = await fetchAvailableAnimalCount();

  return (
    <div className="py-20 text-center">
      <h2 className="font-display text-[clamp(24px,4vw,32px)]">
        Nobody here matches that
      </h2>
      <p className="mx-auto mt-3 max-w-[46ch] text-[15px] leading-[1.65] text-pretty text-organic-neutral-800">
        No animals match {joinFilterLabels(filterLabels)}.{" "}
        <Link
          href="/pets"
          
          
          className="whitespace-nowrap text-primary underline underline-offset-4 hover:no-underline"
        >
          Clear the filters
        </Link>{" "}
        to meet all {availableCount} looking for homes right now.
      </p>
    </div>
  );
};

export default PetGrid;
