export default function NumberField({
  label,
  value,
  step = "0.1",
  readOnly = false,
  onChange,
}: {
  label: string;
  value: number;
  step?: string;
  readOnly?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid grid-cols-[1fr_96px] items-center gap-3">
      <div className="text-[12px] font-medium text-[#73817c]">{label}</div>
      <input
        type="number"
        step={step}
        readOnly={readOnly}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-9 w-full rounded-[10px] border border-[#e8ece9] bg-white px-3 text-[13px] font-medium text-[#333936] outline-none read-only:bg-[#fbfcfb] read-only:text-[#67736f]"
      />
    </label>
  );
}
