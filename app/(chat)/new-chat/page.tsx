"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/supabase";
import { ArrowLeft, Search, Users, UserPlus, X, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function NewChatPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();
  const supabase = createClient();
  const router = useRouter();

  // Fetch all users except the current user
  useEffect(() => {
    if (!user) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("profiles").select("*").neq("id", user.id).order("username");

        if (error) {
          console.error("Error fetching users:", error);
          return;
        }

        setUsers(data || []);
      } catch (error) {
        console.error("Error in user fetching:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user, supabase]);

  // Filter users based on search term
  const filteredUsers = users.filter((u) => u.username?.toLowerCase().includes(searchTerm.toLowerCase()) || (u.display_name && u.display_name.toLowerCase().includes(searchTerm.toLowerCase())));

  // Toggle user selection with restriction for one-to-one chats
  const toggleUserSelection = (profile: Profile) => {
    if (selectedUsers.some((u) => u.id === profile.id)) {
      // Always allow deselection
      setSelectedUsers(selectedUsers.filter((u) => u.id !== profile.id));
    } else {
      // For one-to-one chats, replace the selection instead of adding
      if (!isGroup) {
        setSelectedUsers([profile]);
      } else {
        // For group chats, add to the selection
        setSelectedUsers([...selectedUsers, profile]);
      }
    }
  };

  // Create a new chat
  const createChat = async () => {
    if (!user || selectedUsers.length === 0 || (isGroup && !groupName.trim())) return;

    setCreating(true);

    try {
      // Check if one-on-one chat already exists
      if (!isGroup && selectedUsers.length === 1) {
        const { data: existingChats, error: chatError } = await supabase.from("chats").select("id, chat_members!inner(*)").eq("is_group", false).eq("chat_members.profile_id", user.id);

        if (chatError) {
          console.error("Error checking existing chats:", chatError);
          return;
        }

        // Find a chat where the selected user is also a member
        const existingChat = existingChats?.find((chat) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          chat.chat_members.some((member: any) => member.profile_id === selectedUsers[0].id)
        );

        if (existingChat) {
          router.push(`/chat/${existingChat.id}`);
          return;
        }
      }

      // Create a new chat
      const { data: chatData, error: chatError } = await supabase
        .from("chats")
        .insert({
          name: isGroup ? groupName : null,
          is_group: isGroup,
          created_by: user.id,
        })
        .select()
        .single();

      if (chatError || !chatData) {
        console.error("Error creating chat:", chatError);
        return;
      }

      // Add current user as a member and admin
      const { error: memberError } = await supabase.from("chat_members").insert({
        chat_id: chatData.id,
        profile_id: user.id,
        is_admin: true,
      });

      if (memberError) {
        console.error("Error adding current user to chat:", memberError);
        return;
      }

      // Add selected users as members
      const memberInserts = selectedUsers.map((selectedUser) => ({
        chat_id: chatData.id,
        profile_id: selectedUser.id,
        is_admin: isGroup ? false : true, // In one-on-one chats, both users are admins
      }));

      const { error: membersError } = await supabase.from("chat_members").insert(memberInserts);

      if (membersError) {
        console.error("Error adding members to chat:", membersError);
        return;
      }

      // Navigate to the new chat
      router.push(`/chat/${chatData.id}`);
    } catch (error) {
      console.error("Error creating chat:", error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 shadow-sm">
        <div className="flex items-center">
          <Button onClick={() => router.back()} variant="ghost" size="icon" className="mr-4 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-medium">New Chat</h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="group-toggle"
              checked={isGroup}
              onCheckedChange={(checked) => {
                setIsGroup(checked);
                if (!checked && selectedUsers.length > 1) {
                  // If switching to one-to-one mode and multiple users are selected,
                  // keep only the first selected user
                  setSelectedUsers(selectedUsers.slice(0, 1));
                }
              }}
            />
            <Label htmlFor="group-toggle" className="text-sm font-medium">
              Group Chat
            </Label>
          </div>

          <Button onClick={createChat} disabled={selectedUsers.length === 0 || (isGroup && !groupName.trim()) || creating} className="bg-green-600 hover:bg-green-700">
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Chat
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Group name input (if group chat) */}
      {isGroup && (
        <div className="border-b border-gray-200 p-4">
          <Label htmlFor="group-name" className="text-sm font-medium">
            Group Name
          </Label>
          <Input id="group-name" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Enter group name" className="mt-1" />
        </div>
      )}

      {/* Search */}
      <div className="border-b border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input type="text" placeholder="Search users" className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Selected users */}
      {selectedUsers.length > 0 && (
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-gray-700">Selected Users</h2>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {selectedUsers.length}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((profile) => (
              <Badge key={profile.id} className="pl-2 pr-1 py-1 bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                <span>{profile.display_name || profile.username}</span>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleUserSelection(profile);
                  }}
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 p-0 ml-1 rounded-full hover:bg-green-200 hover:text-green-800"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>

          {!isGroup && selectedUsers.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              <span className="font-medium">Note:</span> In one-to-one chat mode, only one user can be selected.
            </p>
          )}
        </div>
      )}

      {/* User list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-green-500" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex h-32 items-center justify-center p-4 text-center text-gray-500">
            <p>No users found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredUsers.map((profile) => {
              const isSelected = selectedUsers.some((u) => u.id === profile.id);

              return (
                <div key={profile.id} onClick={() => toggleUserSelection(profile)} className={`cursor-pointer p-4 hover:bg-gray-50 transition-colors ${isSelected ? "bg-green-50" : ""}`}>
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile.avatar_url || ""} alt={profile.username || ""} />
                      <AvatarFallback className="bg-gray-200 text-gray-700">{(profile.username || "?").charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>

                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">{profile.display_name || profile.username}</p>
                      <p className="text-xs text-gray-500">{profile.status || "@" + profile.username}</p>
                    </div>

                    <div className={`h-6 w-6 rounded-full flex items-center justify-center ${isSelected ? "bg-green-500 text-white" : "border border-gray-300"}`}>
                      {isSelected && <Check className="h-4 w-4" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Info card at bottom */}
      {!isGroup && (
        <Card className="m-4 bg-blue-50 border-blue-200">
          <div className="p-3 text-sm text-blue-700">
            <div className="flex items-start">
              <Users className="h-5 w-5 mr-2 flex-shrink-0" />
              <p>
                <span className="font-medium">One-to-one chat mode:</span> You can select only one user. Switch to group chat mode to select multiple users.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
