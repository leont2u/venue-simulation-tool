export default function StatPill({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="text-center">
      <div className="font-mono text-[22px] font-semibold text-[#17211e] tabular-nums leading-none">
        {value.toLocaleString()}
      </div>
      <div className="text-[11px] text-[#9ca8a3] mt-0.5">{label}</div>
    </div>
  );
}
