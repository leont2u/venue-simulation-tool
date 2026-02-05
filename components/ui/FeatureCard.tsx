interface FeatureCardPropos {
  icon: React.ReactNode;
  title: string;
  desc: string;
}
export default function FeatureCard({ icon, title, desc }: FeatureCardPropos) {
  return (
    <div className="grid grid-cols-[18px_1fr] gap-4">
      <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-100">
        {icon}
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">{desc}</p>
      </div>
    </div>
  );
}
