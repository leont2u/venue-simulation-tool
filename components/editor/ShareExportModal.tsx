"use client";

export function ShareExportModal({
  open,
  onClose,
  projectName,
}: {
  open: boolean;
  onClose: () => void;
  projectName: string;
}) {
  if (!open) return null;

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_30px_100px_rgba(47,62,70,0.18)]">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-3xl font-semibold text-[#2F3E46]">
              Share or export
            </div>
            <div className="mt-2 text-[#52796F]">{projectName}</div>
          </div>

          <button
            onClick={onClose}
            className="text-3xl text-[#52796F] hover:text-[#2F3E46]"
          >
            ×
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-black/10 bg-[#F7F8F5] p-4">
            <div className="text-lg font-semibold text-[#2F3E46]">
              Share link
            </div>
            <input
              readOnly
              value={shareUrl}
              className="mt-3 w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-sm text-[#354F52]"
            />
            <button
              onClick={() => navigator.clipboard.writeText(shareUrl)}
              className="mt-3 rounded-xl bg-[#84A98C] px-4 py-2 text-sm font-medium text-white hover:bg-[#52796F]"
            >
              Copy link
            </button>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#F7F8F5] p-4">
            <div className="text-lg font-semibold text-[#2F3E46]">Export</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm text-[#354F52]">
                Export PNG
              </button>
              <button className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm text-[#354F52]">
                Export JSON
              </button>
              <button className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm text-[#354F52]">
                Export PDF
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-black/10 bg-[#F7F8F5] p-4">
          <div className="text-lg font-semibold text-[#2F3E46]">
            Share to platform
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="rounded-xl bg-[#25D366] px-4 py-2 text-sm font-medium text-white">
              WhatsApp
            </button>
            <button className="rounded-xl bg-[#84A98C] px-4 py-2 text-sm font-medium text-white">
              Email
            </button>
            <button className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm text-[#354F52]">
              Copy embed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
