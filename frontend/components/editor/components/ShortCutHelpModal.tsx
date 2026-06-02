import { Keyboard, X } from "lucide-react";

export default function ShortcutHelpModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  const sections = [
    {
      title: "Selection",
      items: [
        ["Click", "Select object"],
        ["Shift + Click", "Multi-select"],
        ["Cmd + Click", "Toggle selection"],
        ["Drag empty space", "Selection box"],
      ],
    },
    {
      title: "Movement",
      items: [
        ["Click + Hold", "Grab and move"],
        ["Arrow keys", "Small move"],
        ["Shift + Arrow", "Large move"],
      ],
    },
    {
      title: "Actions",
      items: [
        ["Cmd + D", "Duplicate"],
        ["Delete", "Delete selected"],
        ["Cmd + Z", "Undo"],
        ["Cmd + Shift + Z", "Redo"],
        ["Esc", "Clear selection"],
      ],
    },
    {
      title: "View",
      items: [
        ["Pinch", "Zoom"],
        ["Two-finger drag", "Pan"],
        ["Right-drag", "Orbit camera"],
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/25 px-6 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-xl border border-[#dfe5e2] bg-white shadow-[0_28px_100px_rgba(15,23,42,0.22)]">
        <div className="flex h-16 items-center justify-between border-b border-[#edf0ee] px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef4f1] text-[#5d7f73]">
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[18px] font-semibold tracking-[-0.03em] text-[#242a28]">
                Editor shortcuts
              </div>
              <div className="text-[12px] text-[#71807b]">
                MacBook trackpad controls for selection, movement, and view.
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close help"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#697a76] transition hover:bg-[#f4f6f4]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-lg border border-[#edf0ee] bg-[#fbfcfb] p-4"
            >
              <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-[#6f8f84]">
                {section.title}
              </div>
              <div className="space-y-2">
                {section.items.map(([shortcut, action]) => (
                  <div
                    key={shortcut}
                    className="flex items-center justify-between gap-4 text-[13px]"
                  >
                    <kbd className="rounded-md border border-[#dfe5e2] bg-white px-2 py-1 font-mono text-[11px] font-semibold text-[#34413d] shadow-sm">
                      {shortcut}
                    </kbd>
                    <span className="text-right text-[#5f6f6a]">{action}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
