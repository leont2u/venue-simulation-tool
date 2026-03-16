export default function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-black/5 bg-white p-8 shadow-[0_12px_40px_rgba(47,62,70,0.06)]">
      <div className="text-2xl font-semibold text-[#2F3E46]">{title}</div>
      <div className="mt-3 text-base leading-7 text-[#52796F]">
        {description}
      </div>
    </div>
  );
}
