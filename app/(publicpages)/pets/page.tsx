import { Suspense } from "react";
import Search from "../../../components/search";
import {
  fetchAvailableAnimalCount,
  fetchSpecies,
  fetchColors,
} from "@/app/lib/data/public.data";
import PetGrid from "@/components/public-pages/pets/pet-grid";
import CategoryList from "@/components/public-pages/pets/category-list";
import { ServerSideFacetedFilter } from "@/components/table-common/server-side-faceted-filter";
import { ServerSideSort } from "@/components/table-common/server-side-sort";
import { ResetFilters } from "@/components/public-pages/pets/reset-filters";
import {
  describePetFilters,
  joinFilterLabels,
} from "@/components/public-pages/pets/filter-summary";
import { SearchParamsType } from "@/app/lib/types";
import { SexOptions, SizeOptions } from "@/components/public-pages/pets/pets-filter-options";

interface Props {
  searchParams: SearchParamsType;
}

const SORT_OPTIONS = [
  { label: "Más recientes", value: "createdAt.desc" },
  { label: "Más antiguos", value: "createdAt.asc" },
  { label: "Más jóvenes", value: "birthDate.desc" },
  { label: "Mascotas más antiguas", value: "birthDate.asc" },
  { label: "Nombre A–Z", value: "name.asc" },
];







const TRIGGER_PILL =
  "h-9 rounded-full border-solid border-border bg-transparent px-[18px] has-[>svg]:px-[18px] text-[13.5px] shadow-none";

const Page = async ({ searchParams }: Props) => {
  const {
    page = "1",
    category = "",
    query = "",
    color = "",
    sex = "",
    size = "",
    sort = "",
  } = await searchParams;
  const speciesName = category;
  const colorNames = color;
  const currentPage = Number(page);

  
  const [speciesList, colorList] = await Promise.all([
    fetchSpecies(),
    fetchColors(),
  ]);

  const colorOptions = colorList.map((c) => ({
    label: c.name,
    value: c.name,
  }));

  const filterLabels = describePetFilters({
    query,
    category,
    color,
    sex,
    size,
  });

  return (
    <>
      
      <section className="bg-organic-accent-100">
        <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20 lg:px-14">
          <h1 className="mb-4 font-display text-[clamp(34px,5vw,56px)] leading-[1.05] tracking-[-0.02em]">
            Todas las mascotas
          </h1>

          
          <Suspense fallback={<p className="text-[15px]">&nbsp;</p>}>
            <CountLine filterLabels={filterLabels} />
          </Suspense>
        </div>
      </section>

      
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10 lg:px-14">
        
        <CategoryList species={speciesList} />

        <div className="mt-4 flex flex-row flex-wrap items-center gap-2">
          
          <div className="w-full min-w-0 lg:w-auto lg:max-w-sm lg:flex-1">
            <Search
              placeholder="Buscar por nombre o raza"
              className="h-9 rounded-full border-border bg-card pl-11 shadow-none"
              iconClassName="left-4 h-4 w-4 text-organic-neutral-500"
            />
          </div>

          <div className="flex flex-row flex-wrap items-center gap-2">
            
            <ServerSideFacetedFilter
              title="Color"
              paramKey="color"
              options={colorOptions}
              contentClassName="theme-organic"
              triggerClassName={TRIGGER_PILL}
              badgeClassName="bg-organic-accent-200 text-organic-accent-800"
            />
            <ServerSideFacetedFilter
              title="Sexo"
              paramKey="sex"
              options={SexOptions}
              contentClassName="theme-organic"
              triggerClassName={TRIGGER_PILL}
              badgeClassName="bg-organic-accent-200 text-organic-accent-800"
            />
            <ServerSideFacetedFilter
              title="Tamaño"
              paramKey="size"
              options={SizeOptions}
              contentClassName="theme-organic"
              triggerClassName={TRIGGER_PILL}
              badgeClassName="bg-organic-accent-200 text-organic-accent-800"
            />
            <ServerSideSort
              paramKey="sort"
              placeholder="Ordenar por"
              options={SORT_OPTIONS}
              contentClassName="theme-organic"
              triggerClassName={`${TRIGGER_PILL} data-[size=sm]:h-9`}
            />
            <ResetFilters
              filterParamKeys={[
                "query",
                "category",
                "color",
                "sex",
                "size",
                "sort",
              ]}
            />
          </div>
        </div>

        
        <PetGrid
          query={query}
          currentPage={currentPage}
          speciesName={speciesName}
          colorNames={colorNames}
          sex={sex}
          size={size}
          sort={sort}
        />
      </div>
    </>
  );
};


const CountLine = async ({ filterLabels }: { filterLabels: string[] }) => {
  const availableCount = await fetchAvailableAnimalCount();
  const noun = availableCount === 1 ? "mascota" : "mascotas";

  return (
    <p className="text-[15px] text-organic-neutral-800">
      {filterLabels.length > 0 ? (
        <>
          Filtrado por {joinFilterLabels(filterLabels)}
          <span aria-hidden="true"> · </span>
          {availableCount} {noun} en búsqueda de un hogar
        </>
      ) : (
        <>
          {availableCount} {noun} buscan un hogar
        </>
      )}
    </p>
  );
};

export default Page;
