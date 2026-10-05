
const SpeciesPillsSkeleton = () => (
  <div
    aria-hidden="true"
    className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
  >
    {[94, 62, 60, 63, 73, 77].map((width, index) => (
      <div
        key={index}
        style={{ width }}
        className="h-10 shrink-0 animate-pulse rounded-full bg-organic-accent-300"
      />
    ))}
  </div>
);

export default SpeciesPillsSkeleton;
