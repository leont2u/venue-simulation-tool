import Link from "next/link";
import React from "react";

const Footer = () => {
  return (
    <div className="mx-auto max-w-6xl px-6 pt-10 pb-16">
      {/* FOOTER */}
      <footer className="mt-16  pt-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              VR Venue Simulation Tool
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Design, simulate, and share event setups in 3D.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-600">
            <Link href="#features" className="hover:text-gray-900">
              Features
            </Link>
            <Link href="/auth" className="hover:text-gray-900">
              Login / Sign up
            </Link>
            <Link href="/about" className="hover:text-gray-900">
              About
            </Link>
          </div>
        </div>

        <p className="mt-8 text-xs text-gray-400">
          © {new Date().getFullYear()} VR Venue Simulation Tool. All rights
          reserved.
        </p>
      </footer>
    </div>
  );
};

export default Footer;
