import Image from "next/image";

export default function Footer() {
  return (
    <footer className=" pt-24 pb-10 ">
      <div className="mx-auto flex  max-w-7xl  flex-col items-center justify-between gap-4 px-6 text-sm text-[#52796F] md:flex-row">
        <div>
          <Image src="/logo.svg" alt="VenueAR" width={120} height={25} />
        </div>
        <div>© 2026 All rights reserved.</div>
      </div>
    </footer>
  );
}
