export default function SectionHeader({
  title,
  subtitle,
  onViewAll,
}: {
  title: string;
  subtitle?: string;
  onViewAll?: () => void;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-[22px] font-bold tracking-[-0.03em] text-[#24302d]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 text-[16px] text-[#657872]">{subtitle}</p>
        ) : null}
      </div>
      {onViewAll ? (
        <button
          onClick={onViewAll}
          className="text-[16px] font-bold text-[#5d7f73] transition hover:text-[#3f6257]"
        >
          View all →
        </button>
      ) : null}
    </div>
  );
}
