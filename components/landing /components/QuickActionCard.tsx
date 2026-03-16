export default function QuickActionCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_12px_40px_rgba(47,62,70,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(47,62,70,0.08)]">
      <div className="text-xl font-semibold text-[#2F3E46]">{title}</div>
      <div className="mt-2 text-sm leading-7 text-[#52796F]">{description}</div>
    </div>
  );
}
