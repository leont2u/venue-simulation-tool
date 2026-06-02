export default function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="text-[11px] font-bold uppercase text-[#303733]">
      {children}
    </div>
  );
}
