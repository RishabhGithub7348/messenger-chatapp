"use client";

import { RiRefreshLine, RiLink } from "react-icons/ri";

import { File, Pencil, Menu, Type, Users, Settings, Music } from "lucide-react";

export default function RightNavbar() {
  return (
    <div className="flex flex-col h-full w-[60px] bg-white border-l border-[#d1d7db]">
      {/* Navigation icons */}
      <div className="flex flex-col items-center py-3 space-y-1 flex-grow">
        {/* Document/File icon */}
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#e9edef]">
          <File size={20} className="text-[#d1d7db]" />
        </button>

        {/* Refresh/Sync icon */}
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#e9edef]">
          <RiRefreshLine size={20} className="text-[#d1d7db]" />
        </button>

        {/* Edit/Pencil icon */}
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#e9edef]">
          <Pencil size={20} className="text-[#d1d7db]" />
        </button>

        {/* List/Menu icon */}
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#e9edef]">
          <Menu size={20} className="text-[#d1d7db]" />
        </button>

        {/* Text/Format icon */}
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#e9edef]">
          <Type size={20} className="text-[#d1d7db]" />
        </button>

        {/* Link/Chain icon */}
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#e9edef]">
          <RiLink size={20} className="text-[#d1d7db]" />
        </button>

        {/* People/Group icon */}
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#e9edef]">
          <Users size={20} className="text-[#d1d7db]" />
        </button>

        {/* Settings/Gear icon */}
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#e9edef]">
          <Settings size={20} className="text-[#d1d7db]" />
        </button>

        {/* Music/Audio icon */}
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#e9edef]">
          <Music size={20} className="text-[#d1d7db]" />
        </button>
      </div>
    </div>
  );
}
