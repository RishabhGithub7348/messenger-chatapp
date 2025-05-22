"use client";

import { useState } from "react";
import Image from "next/image";

type AttachmentPreviewProps = {
  url: string;
  type: "image" | "video" | "document" | "audio";
  fileName?: string;
};

export default function AttachmentPreview({ url, type, fileName }: AttachmentPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  // Render different previews based on attachment type
  const renderAttachment = () => {
    switch (type) {
      case "image":
        return (
          <div
            className={`relative cursor-pointer overflow-hidden rounded-lg ${expanded ? "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4" : "max-h-60"}`}
            onClick={toggleExpand}
          >
            <Image
              src={url}
              alt={fileName || "Image attachment"}
              width={expanded ? 1200 : 300}
              height={expanded ? 800 : 200}
              className={`rounded-lg object-contain ${expanded ? "max-h-screen max-w-full" : "max-h-60 w-auto"}`}
              style={{ width: "auto", height: expanded ? "auto" : "100%" }}
            />
            {expanded && (
              <button
                className="absolute right-4 top-4 rounded-full bg-black bg-opacity-50 p-2 text-white hover:bg-opacity-70"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(false);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        );

      case "video":
        return (
          <div className={`overflow-hidden rounded-lg ${expanded ? "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4" : "max-h-60"}`}>
            <div className="relative">
              <video src={url} controls className={`rounded-lg ${expanded ? "max-h-screen max-w-full" : "max-h-60 max-w-full"}`} />
              {expanded && (
                <button className="absolute right-4 top-4 rounded-full bg-black bg-opacity-50 p-2 text-white hover:bg-opacity-70" onClick={() => setExpanded(false)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        );

      case "audio":
        return (
          <div className="rounded-lg bg-gray-100 p-3">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
              <span className="text-sm font-medium text-gray-700">{fileName || "Audio attachment"}</span>
            </div>
            <audio src={url} controls className="mt-2 w-full" />
          </div>
        );

      case "document":
        return (
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center rounded-lg bg-gray-100 p-3 hover:bg-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <div>
              <span className="text-sm font-medium text-gray-700">{fileName || "Document attachment"}</span>
              <p className="text-xs text-gray-500">Click to open</p>
            </div>
          </a>
        );

      default:
        return (
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center rounded-lg bg-gray-100 p-3 hover:bg-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.102-1.101" />
            </svg>
            <span className="text-sm font-medium text-gray-700">{fileName || "Attachment"}</span>
          </a>
        );
    }
  };

  return renderAttachment();
}
