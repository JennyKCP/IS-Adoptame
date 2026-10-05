"use client";

import { Search as MagnifyingGlassIcon } from "lucide-react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchProps {
  placeholder: string;
  
  className?: string;
  
  iconClassName?: string;
}

const Search = ({ placeholder, className, iconClassName }: SearchProps) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleSearch = useDebouncedCallback((term) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");

    if (term) {
      params.set("query", term);
    } else {
      params.delete("query");
    }
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  const currentQuery = searchParams.get("query")?.toString() ?? "";

  return (
    <div className="relative">
      <label htmlFor="search" className="sr-only">
        Search
      </label>
      <Input
        
        
        
        
        key={currentQuery}
        id="search"
        name="search"
        type="search"
        className={cn("pl-10", className)}
        placeholder={placeholder}
        onChange={(e) => {
          handleSearch(e.target.value);
        }}
        defaultValue={currentQuery}
      />
      <MagnifyingGlassIcon
        className={cn(
          "absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground",
          iconClassName
        )}
      />
    </div>
  );
};

export default Search;