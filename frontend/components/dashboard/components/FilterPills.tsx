import cx from "../utils/cx";

export default function FilterPills({
  filters,
  active,
  onChange,
}: {
  filters: string[];
  active: string;
  onChange: (filter: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <button
          key={filter}
          onClick={() => onChange(filter)}
          className={cx(
            "h-9 rounded-full border px-4 text-[14px] font-bold transition",
            active === filter
              ? "border-[#202927] bg-[#202927] text-white"
              : "border-[#e2e9e6] bg-white text-[#657872] hover:border-[#cbd8d3]",
          )}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}
