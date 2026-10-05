import Link from "next/link";

interface SpeciesPillsProps {
  speciesNames: string[];
}


const SpeciesPills = ({ speciesNames }: SpeciesPillsProps) => (
  <div className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <Link
      href="/pets"
      className="shrink-0 snap-start rounded-full border border-border px-[18px] py-[9px] text-[13.5px] transition-colors hover:bg-primary hover:text-primary-foreground"
    >
      Everyone
    </Link>
    {speciesNames.map((name) => (
      <Link
        key={name}
        href={`/pets?page=1&category=${encodeURIComponent(name)}`}
        className="shrink-0 snap-start rounded-full border border-border px-[18px] py-[9px] text-[13.5px] transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        {name}
      </Link>
    ))}
  </div>
);

export default SpeciesPills;
