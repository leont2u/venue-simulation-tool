export default function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#84A98C] bg-white text-sm font-semibold text-[#52796F] shadow-sm">
        {number}
      </div>
      <div className="mt-6 text-2xl font-semibold text-[#2F3E46]">{title}</div>
      <div className="mx-auto mt-3 max-w-xs text-base leading-7 text-[#52796F]">
        {description}
      </div>
    </div>
  );
}
