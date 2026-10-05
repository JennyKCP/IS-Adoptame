import { getShelterSettings } from "@/app/lib/data/shelter-settings.data";
import { formatShelterDay, calendarDay } from "@/app/lib/utils/shelter-day";
import { fetchPublicPagePetById } from "@/app/lib/data/public.data";
import { IDParamType } from "@/app/lib/types";
import {
  calculateAgeString,
} from "@/app/lib/utils/date-utils";
import { formatWeight } from "@/app/lib/utils/weight-format";
import {
  formatSingleEnumOption,
  formatAnimalSize,
} from "@/app/lib/utils/enum-formatter";
import PetGallery from "@/components/public-pages/pets/pet-gallery";
import { getCachedSession } from "@/app/lib/auth/session";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  params: IDParamType;
}


const Page = async ({ params }: Props) => {
  const { id: animalId } = await params;
  const session = await getCachedSession();
  const currentUserPersonId = session?.user?.personId;

  const animal = await fetchPublicPagePetById(animalId);
  const unitSystem = (await getShelterSettings()).weightUnitSystem;
  if (!animal) {
    notFound();
  }

  
  const ageString = calculateAgeString({
    birthDate: calendarDay(animal.birthDate),
    simple: true,
  });

  
  const formattedBirthDate = formatShelterDay(calendarDay(animal.birthDate));

  
  
  
  
  const currentUserHasBlockingApplication = Boolean(
    currentUserPersonId && animal.adoptionApplications?.length,
  );

  const isFavoritedByCurrentUser = Boolean(
    animal.favorites && animal.favorites.length > 0,
  );

  
  const breedString =
    animal.breeds?.map((b) => b.name).join(", ") || "Raza mixta";

  
  const primaryColorName = animal.primaryColor?.name || "";
  const additionalColorString =
    animal.colors
      ?.filter((c) => c.name !== animal.primaryColor?.name)
      .map((c) => c.name)
      .join(", ") || "";

  
  
  
  const meta = [
    breedString,
    ageString,
    formatWeight(animal.currentWeightGrams, unitSystem),
  ].filter(Boolean);

  
  
  
  
  const pills = [
    animal.isSpayedNeutered && "Esterilizado",
    animal.hasMicrochip && "Tiene microchip",
    ...(animal.characteristics?.map((char) => char.name) ?? []),
  ].filter((pill): pill is string => Boolean(pill));

  const adoptCta =
    animal.listingStatus === "PENDING_ADOPTION" ? (
      <div className="inline-flex cursor-not-allowed items-center rounded-full bg-organic-accent-300 px-[26px] py-[13px] font-display text-[15px] leading-[1.2] text-organic-accent-900">
        Adopción pendiente
      </div>
    ) : currentUserHasBlockingApplication ? (
      <Link
        href="/dashboard/my-adoption-applications"
        className="inline-flex items-center rounded-full bg-secondary px-[26px] py-[13px] font-display text-[15px] leading-[1.2] text-secondary-foreground transition-colors hover:shadow-organic-md"
      >
        View Your Application
      </Link>
    ) : (
      <Link
        href={`${animalId}/adopt`}
        className="inline-flex items-center rounded-full bg-primary px-[26px] py-[13px] font-display text-[15px] leading-[1.2] text-primary-foreground transition-colors hover:bg-organic-accent-600"
      >
        Adoptar a {animal.name}
      </Link>
    );

  return (
    <>
      
      <section className="bg-organic-accent-100">
        <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16 lg:px-14">
          
          <h1 className="mb-2.5 font-display text-[clamp(40px,6vw,76px)] leading-[0.94] tracking-[-0.03em] break-words">
            {animal.name}
          </h1>

          <p className="mb-[18px] flex flex-wrap items-center gap-2.5 font-display text-[22px] leading-[1.55] text-organic-accent-700">
            {meta.map((item, index) => (
              <span key={index} className="inline-flex items-center gap-2.5">
                {index > 0 && (
                  <span aria-hidden="true" className="text-[12px] align-middle">
                    •
                  </span>
                )}
                <span>{item}</span>
              </span>
            ))}
          </p>

          {adoptCta}
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-x-12 gap-y-10 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-2 lg:gap-y-0 lg:px-14">
        <PetGallery
          images={animal.animalImages}
          currentUserPersonId={currentUserPersonId}
          animalId={animal.id}
          isFavoritedByCurrentUser={isFavoritedByCurrentUser}
        />

        <div className="flex flex-col gap-9">
          
          <dl className="m-0">
            <PetCardDetail label="Especie" value={animal.species.name} />
            <PetCardDetail
              label="Sexo"
              value={formatSingleEnumOption(animal.sex)}
            />
            <PetCardDetail label="Raza" value={breedString} />
            <PetCardDetail label="Tamaño" value={formatAnimalSize(animal.size)} />
            <PetCardDetail label="Color principal" value={primaryColorName} />
            <PetCardDetail label="Otros colores" value={additionalColorString} />
            <PetCardDetail
              label="Peso"
              value={
                animal.currentWeightGrams != null
                  ? formatWeight(animal.currentWeightGrams, unitSystem)
                  : null
              }
            />
            <PetCardDetail label="Altura" value={animal.heightCm} unit="cm" />
            <PetCardDetail label="Fecha de nacimiento" value={formattedBirthDate} />
          </dl>

          {animal.description && (
            <div>
              <h2 className="mb-3 font-display text-[21px]">
                Sobre {animal.name}
              </h2>
              
              <p className="max-w-[46ch] text-[17.5px] leading-[1.65] whitespace-pre-wrap text-pretty text-organic-neutral-800">
                {animal.description}
              </p>
            </div>
          )}

          {pills.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-[21px]">
                Personality &amp; Needs
              </h2>
              
              <div className="flex flex-wrap gap-2">
                {pills.map((pill) => (
                  <span
                    key={pill}
                    className="inline-flex items-center rounded-full bg-organic-sage-100 px-3.5 py-[5px] text-[12.5px] tracking-[0.02em] text-organic-sage-800"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const PetCardDetail = ({ label, value, unit }: PetDetailProps) => {
  
  
  if (value === null || typeof value === "undefined" || value === "") {
    return null;
  }
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <dt className="text-[15px] text-muted-foreground">{label}</dt>
      <dd className="m-0 text-right text-[15px] text-foreground">
        {value}
        {unit ? ` ${unit}` : ""}
      </dd>
    </div>
  );
};

interface PetDetailProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
}

export default Page;
