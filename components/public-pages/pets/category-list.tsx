"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SpeciesModel } from "@/prisma/generated/models/Species";
import { cn } from "@/lib/utils";

interface Props {
  species: SpeciesModel[];
}


const CategoryList = ({ species }: Props) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  
  
  
  const currentValue = searchParams.get("category") || "Todas";
  const optionList = ["Todas", ...species.map((s) => s.name)];

  function handleCategoryChange(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");

    if (value === "Todas") {
      params.delete("category");
    } else {
      params.set("category", value);
    }
    
    replace(`${pathname}?${params.toString()}`);
  }

  return (
    
    
    
    <div
      role="group"
      aria-label="Especies"
      className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {optionList.map((value) => {
        const isActive = value === currentValue;

        return (
          <button
            key={value}
            type="button"
            aria-pressed={isActive}
            onClick={() => handleCategoryChange(value)}
            className={cn(
              "shrink-0 cursor-pointer snap-start rounded-full border px-[18px] py-[9px] text-[13.5px] transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-primary hover:text-primary-foreground"
            )}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryList;
