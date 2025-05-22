"use client";

import { BiSolidMessageRoundedDots, BiSolidHome, BiSolidStar, BiSolidArchive, BiSolidFile, BiSolidCog, BiSolidUser, BiSolidFolder } from "react-icons/bi";
import { FaArrowLeft } from "react-icons/fa";
import { GoGraph } from "react-icons/go";
import { FaBullhorn } from "react-icons/fa6";

import { VscThreeBars } from "react-icons/vsc";
import { useAuth } from "@/context/auth-context";
import Image from "next/image";

export default function LeftNavbar() {
  const { profile } = useAuth();

  return (
    <div className="flex flex-col h-full w-[60px] bg-white border-r border-[#d1d7db]">
      {/* Profile icon at top */}
      <div className="flex justify-center items-center h-[60px] mt-5 border-[#d1d7db]">
        <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center text-white">
          {/* Profile Avatar & Name */}
          {/* {profile?.avatar_url ? (
            <Image src='/logo.svg' alt={profile?.username || 'User'}  className="h-10 w-10 rounded-full" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-800">
              {profile?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          )} */}
          <Image src="/logo.png" alt={profile?.username || "User"} width={100} height={100} style={{ objectFit: "contain" }} />
        </div>
      </div>

      {/* Navigation icons */}
      <div className="flex flex-col items-center py-3 space-y-1 flex-grow">
        {/* Home icon */}
        <button className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100">
          <BiSolidHome size={22} className="text-[#54656f]" />
        </button>

        {/* Chat icon - active */}
        <button className="w-10 h-10 flex items-center justify-center rounded-md bg-gray-100">
          <BiSolidMessageRoundedDots color="#10B981" size={22} className="text-[#54656f]" />
        </button>

        {/* Status/Updates icon */}
        <button className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100">
          <BiSolidFile size={22} className="text-[#54656f]" />
        </button>

        {/* Analytics/Stats icon */}
        <button className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100">
          <GoGraph size={22} fontWeight={300} className="text-[#54656f]" />
        </button>

        {/* List/Menu icon */}
        <button className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100">
          <VscThreeBars size={22} className="text-[#54656f]" />
        </button>

        {/* Notification/Bell icon */}
        <button className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100">
          <FaBullhorn size={22} className="text-[#54656f]" />
        </button>

        {/* Star/Favorite icon */}
        <button className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100">
          <BiSolidStar size={22} className="text-[#54656f]" />
        </button>

        {/* Archive/Box icon */}
        <button className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100">
          <BiSolidArchive size={22} className="text-[#54656f]" />
        </button>

        {/* Document/File icon */}
        <button className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100">
          <BiSolidFile size={22} className="text-[#54656f]" />
        </button>
      </div>

      {/* Bottom icons */}
      <div className="flex flex-col items-center py-3 space-y-1">
        {/* Back/Return icon */}
        <button className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100">
          <FaArrowLeft size={22} className="text-[#54656f]" />
        </button>

        {/* Settings icon */}
        <button className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100">
          <BiSolidCog size={22} className="text-[#54656f]" />
        </button>

        {/* Group/People icon */}
        <button className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100">
          <BiSolidUser size={22} className="text-[#54656f]" />
        </button>

        {/* Folder/Document icon */}
        <button className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100">
          <BiSolidFolder size={22} className="text-[#54656f]" />
        </button>
      </div>
    </div>
  );
}
