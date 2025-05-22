"use client";

import { RiRefreshLine, RiQuestionLine, RiMenu3Line } from "react-icons/ri";
import { IoMdTv } from "react-icons/io";

import { FaBellSlash } from "react-icons/fa";
import { BiSolidMessageRoundedDots } from "react-icons/bi";

export default function TopNavbar() {
  return (
    <div className="flex h-[50px] items-center justify-between bg-white px-4 border-b border-[#d1d7db]">
      {/* Left side with profile and chats */}
      <div className="flex items-center">
        <div className="flex items-center text-[#54656f]">
          <button className="w-10 h-10 flex items-center justify-center ">
            <BiSolidMessageRoundedDots size={22} className="text-[#54656f]" />
          </button>

          <span className="text-sm font-medium">chats</span>
        </div>
      </div>

      {/* Right side with action buttons */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-5">
          <button className="text-gray-600  border border-gray-300 rounded-[4px] px-2 py-1  hover:text-gray-900 flex items-center">
            <RiRefreshLine className="w-5 h-5" />
            <span className="ml-1 text-sm">Refresh</span>
          </button>
          <button className="text-gray-600 border border-gray-300 rounded-[4px] px-2 py-1  hover:text-gray-900 flex items-center">
            <RiQuestionLine className="w-5 h-5" />
            <span className="ml-1 text-sm">Help</span>
          </button>
          <div className="flex items-center border border-gray-300 rounded-[4px] px-2 py-1  space-x-2">
            <span className="text-sm text-yellow-500">★</span>
            <span className="text-sm text-gray-500">5 / 6 phones</span>
          </div>
          <button className="text-gray-600 border border-gray-300 rounded-[4px] px-2 py-1  hover:text-gray-900">
            <IoMdTv className="w-5 h-5" />
          </button>
          <button className="text-gray-600 border border-gray-300 rounded-[4px] px-2 py-1 hover:text-gray-900">
            <FaBellSlash className="w-5 h-5" />
          </button>
          <button className="text-gray-600 border border-gray-300 rounded-[4px] px-2 py-1 hover:text-gray-900">
            <RiMenu3Line className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
