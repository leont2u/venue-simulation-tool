export default function EditorLoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#ede9df] text-[#28312d]">
      <div className="relative h-[320px] w-[520px] max-w-[90vw] overflow-hidden rounded-[8px] border border-[#d9d2c5] bg-[#f7f3ea] shadow-[0_24px_80px_rgba(62,52,39,0.18)]">
        <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(#ded6ca_1px,transparent_1px),linear-gradient(90deg,#ded6ca_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="absolute left-12 top-12 h-44 w-72 border-[6px] border-[#3b332b] bg-[#f5efe4]/70" />
        <div className="absolute left-[76px] top-[88px] grid grid-cols-7 gap-3">
          {Array.from({ length: 35 }).map((_, index) => (
            <div
              key={index}
              className="h-3.5 w-3.5 rounded-[4px] border border-[#65786f] bg-[#95b39f] shadow-sm"
              style={{
                animation: `venue-loader-pop 1.45s ${index * 0.025}s infinite ease-in-out`,
              }}
            />
          ))}
        </div>
        <div className="absolute right-16 top-20 h-16 w-24 rounded-[6px] border border-[#39424a] bg-[#aab4bd]" />
        <div className="absolute bottom-14 left-16 h-8 w-36 rounded-[4px] bg-[#916c4b]" />
        <div className="absolute bottom-16 right-20 h-5 w-5 rounded-full bg-[#2f6d88] shadow-[0_0_0_8px_rgba(47,109,136,0.14)]" />
        <div className="absolute inset-x-0 bottom-0 border-t border-[#ded6ca] bg-white/72 px-5 py-4 backdrop-blur">
          <div className="h-1.5 overflow-hidden rounded-full bg-[#ddd5c8]">
            <div className="h-full w-1/2 rounded-full bg-[#5d7f73] shadow-[0_0_18px_rgba(93,127,115,0.4)] [animation:venue-loader-scan_1.4s_infinite_ease-in-out]" />
          </div>
          <div className="mt-3 text-[12px] font-bold uppercase text-[#61736c]">
            Building venue scene
          </div>
        </div>
      </div>
    </div>
  );
}
