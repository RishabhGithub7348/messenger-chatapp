"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";
import Image from "next/image";

type AttachmentType = "image" | "video" | "document" | "audio";

export default function AttachmentUploader({ chatId, onUploadComplete, onCancel }: { chatId: string; onUploadComplete: (url: string, type: AttachmentType) => void; onCancel: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const supabase = createClient();

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    // Create preview for images and videos
    if (selectedFile.type.startsWith("image/")) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);
    } else if (selectedFile.type.startsWith("video/")) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);
    } else {
      setPreview(null);
    }
  };

  // Determine attachment type from file
  const getAttachmentType = (file: File): AttachmentType => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return "document";
  };

  // Upload the file to Supabase Storage
  const uploadFile = async () => {
    if (!file || !user || !chatId) return;

    setUploading(true);
    setError(null);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${chatId}/${user.id}_${Date.now()}.${fileExt}`;
      const attachmentType = getAttachmentType(file);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage.from("chat_attachments").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
        metadata: {
          owner: user.id,
        },
      });

      if (error) {
        throw error;
      }

      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("chat_attachments").getPublicUrl(data.path);

      // Call the completion handler with the URL and type
      onUploadComplete(publicUrl, attachmentType);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error uploading file:", error);
      setError(error.message || "Failed to upload file");
    } finally {
      setUploading(false);
      // Clean up preview URL
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    }
  };

  // Trigger file input click
  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium">Upload Attachment</h3>
        <button onClick={onCancel} className="rounded-full p-1 text-gray-500 hover:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />

      {!file ? (
        <div onClick={openFileSelector} className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="mb-2 h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm text-gray-500">Click to select a file</p>
          <p className="mt-1 text-xs text-gray-400">Supports images, videos, audio, and documents</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          {preview && file.type.startsWith("image/") ? (
            <div className="flex justify-center">
              <Image src={preview} width={100} height={100} alt="Preview" className="max-h-40 rounded-lg object-contain" />
            </div>
          ) : preview && file.type.startsWith("video/") ? (
            <div className="flex justify-center">
              <video src={preview} className="max-h-40 rounded-lg" controls />
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg bg-gray-100 p-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="text-sm text-gray-600">{file.name}</span>
            </div>
          )}

          {/* File info */}
          <div className="text-sm text-gray-500">
            <p>{file.name}</p>
            <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>

          {/* Error message */}
          {error && <div className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</div>}

          {/* Actions */}
          <div className="flex space-x-2">
            <button onClick={openFileSelector} className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" disabled={uploading}>
              Change File
            </button>
            <button onClick={uploadFile} className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
