"use client";

import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Navbar() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="relative grid h-10 w-10 place-items-center rounded-2xl bg-gray-900 text-white shadow-sm">
            {/* simple “VR” mark */}
            <span className="text-xs font-bold tracking-widest">VR</span>

            {/* tiny corner accent */}
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-indigo-600 ring-4 ring-white" />
          </div>
          <span className="font-semibold">VenueSim</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button className="bg-indigo-600 hover:bg-[#3b78e7]">
          <Plus className=" h-4 w-4" />
        </Button>
        <button className="relative rounded-full p-2 hover:bg-muted">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-600" />
        </button>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-muted text-sm font-medium">
            JD
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
