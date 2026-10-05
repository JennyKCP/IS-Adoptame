import Link from "next/link";
import { fetchFavoritePets } from "@/app/lib/data/public.data";
import { getCachedSession } from "@/app/lib/auth/session";
import PetCard from "../pet-card";

const FavoritesGrid = async () => {
  const session = await getCachedSession();
  const currentUserPersonId = session?.user?.personId;

  const { pets } = await fetchFavoritePets();

  if (pets.length === 0) {
    return <EmptyState />;
  }

  const hasUnavailable = pets.some((pet) => !pet.isAvailable);

  return (
    <>
      <div className="mb-12 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
        {pets.map((pet) => (
          <PetCard
            key={pet.id}
            pet={pet}
            currentUserPersonId={currentUserPersonId}
            isAvailable={pet.isAvailable}
          />
        ))}
      </div>

      
      {hasUnavailable && (
        
        
        
        <div className="mb-8 border-t border-border pt-5">
          <p className="max-w-[60ch] text-[15px] leading-[1.65] text-pretty text-organic-neutral-800">
            Las mascotas atenuadas fueron adoptadas o ya no están disponibles.
            Se conservan aquí para que sepas qué ocurrió con ellas; toca el
            corazón de una para eliminarla.
          </p>
        </div>
      )}
    </>
  );
};


const EmptyState = () => (
  <div className="py-20 text-center">
    <h2 className="font-display text-[clamp(24px,4vw,32px)]">
      Todavía no has guardado nada
    </h2>
    <p className="mx-auto mt-3 max-w-[46ch] text-[15px] leading-[1.65] text-pretty text-organic-neutral-800">
      Toca el corazón de cualquier mascota para guardarla aquí y volver a verla
      después sin tener que buscarla nuevamente.
    </p>

    <Link
      href="/pets"
      className="mt-7 inline-flex rounded-full bg-primary px-[26px] py-[13px] text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-organic-accent-600"
    >
      Explorar todas las mascotas
    </Link>
  </div>
);

export default FavoritesGrid;
