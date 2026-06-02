export default function NavButton({
  active,
  icon,
  label,
  onClick,
  dot,
}: {
  active?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  dot?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`mb-1 flex w-full items-center gap-2 rounded-[7px] px-2 py-1.5 text-left text-[12px] font-medium transition ${
        active
          ? "bg-[#eef4f1] text-[#526f65]"
          : "text-[#687773] hover:bg-[#f7f9f7]"
      }`}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        {icon}
      </span>
      <span className="min-w-0 truncate">{label}</span>
      {dot ? (
        <span className="ml-auto h-2 w-2 rounded-full bg-[#ff2e1f]" />
      ) : null}
    </button>
  );
}
