"use client ";
import { MessageCircle, Send, X } from "lucide-react";
import { useState } from "react";

export default function HelpChat() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-7 right-7 z-40">
      {open ? (
        <div className="mb-4 w-85 overflow-hidden rounded-[18px] border border-[#dfe8e4] bg-white shadow-[0_18px_60px_rgba(32,43,40,0.18)]">
          <div className="flex items-center justify-between border-b border-[#edf1ef] bg-[#f8fbf9] px-5 py-4">
            <div>
              <div className="text-[15px] font-bold text-[#24302d]">
                Venue help
              </div>
              <div className="text-[12px] text-[#657872]">
                Dashboard assistant
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#657872] hover:bg-[#eaf1ee]"
            >
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3 px-5 py-5">
            <div className="max-w-65 rounded-[14px] bg-[#eef5f2] px-4 py-3 text-[14px] leading-6 text-[#4f625c]">
              Hi, I can help with project creation, imports, templates, and
              export questions.
            </div>
            <div className="ml-auto max-w-60 rounded-[14px] bg-[#5d7f73] px-4 py-3 text-[14px] leading-6 text-white">
              Chat is coming soon.
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-[#edf1ef] p-4">
            <input
              disabled
              placeholder="Ask for help..."
              className="h-10 min-w-0 flex-1 rounded-xl border border-[#e1e8e5] bg-[#f8fbf9] px-3 text-[14px] placeholder:text-[#8b9a95]"
            />
            <button
              disabled
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d8e4e0] text-[#6a7d76]"
            >
              <Send size={17} />
            </button>
          </div>
        </div>
      ) : null}
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-[#5d7f73] text-white shadow-[0_10px_30px_rgba(32,43,40,0.22)] transition hover:-translate-y-0.5 hover:bg-[#4e7165]"
      >
        <MessageCircle size={28} />
      </button>
    </div>
  );
}
