"use client";

import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatLabels from "@/components/chat/chat-labels";
import { useAuth } from "@/context/auth-context";

export default function SettingsPage() {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/auth/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center p-4 md:p-6">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-gray-700" />
            <h1 className="text-3xl font-semibold text-gray-800">Settings</h1>
          </div>
          <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 transition-transform hover:scale-105" onClick={handleLogout} aria-label="Log out">
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </div>

        {/* Chat Labels Section */}
        <ChatLabels />
      </div>
    </div>
  );
}
