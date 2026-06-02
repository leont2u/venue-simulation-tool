export default function OpacityRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="grid grid-cols-[58px_1fr_52px] items-center gap-3 text-[12px] font-medium text-[#73817c]">
      <span>{label}</span>
      <div className="relative h-2 rounded-full bg-[#dfe7e3]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[#6f8f84]"
          style={{ width: `${value}%` }}
        />
        <div
          className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-[#cdd8d2] bg-white shadow-sm"
          style={{ left: `calc(${value}% - 10px)` }}
        />
      </div>
      <span className="text-right text-[#3e4642]">{value} %</span>
    </div>
  );
}
