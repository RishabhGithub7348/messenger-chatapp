"use client";

import { useState, useEffect } from "react";
import { Database } from "../../types/supabase";
import { useAuth } from "@/context/auth-context";
import { createClient } from "@/lib/supabase/client";
import { UserPlus, UserMinus, ShieldCheck, Shield, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ChatMember = {
  id: string; // This is chat_members.id
  profile: Profile;
  is_admin: boolean;
};

export default function GroupChatManager({ chatId }: { chatId: string }) {
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [selectedUserIdsToAdd, setSelectedUserIdsToAdd] = useState<string[]>([]);
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [memberToManage, setMemberToManage] = useState<{ id: string; name: string } | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { user } = useAuth();
  const supabase = createClient();

  const setLoadingState = (key: string, isLoading: boolean) => {
    setActionLoading((prev) => ({ ...prev, [key]: isLoading }));
  };

  useEffect(() => {
    if (!user || !chatId) return;

    const fetchGroupData = async () => {
      setLoading(true);
      try {
        const { data: memberData, error: memberError } = await supabase.from("chat_members").select("id, is_admin, profile_id, profiles!inner(*)").eq("chat_id", chatId);
        if (memberError) throw memberError;

        const formattedMembers = memberData
          .filter((m) => m.profiles)
          .map((member) => ({
            id: member.id,
            profile: member.profiles as unknown as Profile,
            is_admin: member.is_admin,
          }));
        setMembers(formattedMembers);

        const currentUserMember = memberData.find((m) => m.profile_id === user.id);
        setCurrentUserIsAdmin(currentUserMember?.is_admin || false);

        const memberProfileIds = memberData.map((m) => m.profile_id);
        const { data: allUsersData, error: allUsersError } = await supabase
          .from("profiles")
          .select("*")
          .not("id", "in", `(${memberProfileIds.join(",")})`);
        if (allUsersError) throw allUsersError;
        setAvailableUsers(allUsersData || []);
      } catch (error) {
        console.error("Error fetching group data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchGroupData();
    const channel = supabase
      .channel(`group_chat_manager_${chatId}_${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_members", filter: `chat_id=eq.${chatId}` }, fetchGroupData)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, chatId, supabase]);

  const toggleUserSelectionForAdd = (userId: string) => {
    setSelectedUserIdsToAdd((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const handleAddMembers = async () => {
    if (!user || !chatId || selectedUserIdsToAdd.length === 0) return;
    setLoadingState("addMembers", true);
    try {
      const memberInserts = selectedUserIdsToAdd.map((profileId) => ({
        chat_id: chatId,
        profile_id: profileId,
        is_admin: false,
      }));
      const { error } = await supabase.from("chat_members").insert(memberInserts);
      if (error) throw error;
      
      // Optimistically update the UI by moving selected users from availableUsers to members
      const newMembers = [...members];
      const newAvailableUsers = [...availableUsers];
      
      selectedUserIdsToAdd.forEach(profileId => {
        const userIndex = newAvailableUsers.findIndex(u => u.id === profileId);
        if (userIndex !== -1) {
          const user = newAvailableUsers[userIndex];
          // Create a new member with a temporary ID (will be updated on next fetch)
          const newMember: ChatMember = {
            id: `temp-${Date.now()}-${profileId}`,
            profile: user,
            is_admin: false
          };
          newMembers.push(newMember);
          newAvailableUsers.splice(userIndex, 1);
        }
      });
      
      setMembers(newMembers);
      setAvailableUsers(newAvailableUsers);
      setSelectedUserIdsToAdd([]);
    } catch (error) {
      console.error("Error adding members:", error);
    } finally {
      setLoadingState("addMembers", false);
    }
  };

  const handleRemoveMember = async () => {
    if (!user || !chatId || !memberToManage) return;
    setLoadingState(`remove_${memberToManage.id}`, true);
    try {
      const { error } = await supabase.from("chat_members").delete().eq("id", memberToManage.id);
      if (error) throw error;
      
      // Optimistically update the UI immediately
      const removedMember = members.find(m => m.id === memberToManage.id);
      if (removedMember) {
        // Remove from members list
        setMembers(prevMembers => prevMembers.filter(m => m.id !== memberToManage.id));
        
        // Add back to available users list
        setAvailableUsers(prevUsers => [...prevUsers, removedMember.profile]);
      }
      
      setMemberToManage(null);
    } catch (error) {
      console.error("Error removing member:", error);
    } finally {
      setLoadingState(`remove_${memberToManage.id}`, false);
    }
  };

  const handleToggleAdminStatus = async (memberId: string, currentStatus: boolean) => {
    if (!user || !chatId) return;
    setLoadingState(`admin_${memberId}`, true);
    try {
      const { error } = await supabase.from("chat_members").update({ is_admin: !currentStatus }).eq("id", memberId);
      if (error) throw error;
      
      // Optimistically update the UI immediately
      setMembers(prevMembers => 
        prevMembers.map(member => 
          member.id === memberId 
            ? { ...member, is_admin: !currentStatus } 
            : member
        )
      );
    } catch (error) {
      console.error("Error updating admin status:", error);
    } finally {
      setLoadingState(`admin_${memberId}`, false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Manage Group
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:w-[400px] sm:max-w-[540px] p-0 flex flex-col max-h-[100vh]">
          <SheetHeader className="p-6">
            <SheetTitle>Manage Group Members</SheetTitle>
            <SheetDescription>View, add, or remove members, and manage admin roles.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="space-y-6">
              {/* Group Members Section */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Group Members ({members.length})</h3>
                <ScrollArea className="h-64 border border-border rounded-md">
                  {members.length === 0 ? (
                    <p className="p-4 text-sm text-center text-muted-foreground">No members in this group.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {members.map((member) => (
                        <li key={member.id} className="flex items-center justify-between p-3 hover:bg-muted transition-colors">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={member.profile.avatar_url || undefined} alt={member.profile.username} />
                              <AvatarFallback className="bg-primary/10 text-primary">{member.profile.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <p className="text-sm font-medium text-foreground">
                                {member.profile.display_name || member.profile.username}
                                {member.profile.id === user?.id && <span className="text-muted-foreground text-xs ml-1">(You)</span>}
                              </p>
                              {member.is_admin && (
                                <Badge
                                  variant="outline"
                                  className="text-xs px-2 py-0.5 mt-1 border-green-500 text-green-600 bg-green-50 dark:bg-green-900/50 dark:border-green-400 dark:text-green-300"
                                >
                                  Admin
                                </Badge>
                              )}
                            </div>
                          </div>
                          {currentUserIsAdmin && member.profile.id !== user?.id && (
                            <div className="flex items-center space-x-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-primary/10"
                                    onClick={() => handleToggleAdminStatus(member.id, member.is_admin)}
                                    disabled={actionLoading[`admin_${member.id}`]}
                                    aria-label={member.is_admin ? "Revoke Admin" : "Make Admin"}
                                  >
                                    {actionLoading[`admin_${member.id}`] ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : member.is_admin ? (
                                      <ShieldCheck className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <Shield className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">{member.is_admin ? "Revoke Admin" : "Make Admin"}</TooltipContent>
                              </Tooltip>
                              <AlertDialog>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                        onClick={() => setMemberToManage({ id: member.id, name: member.profile.display_name || member.profile.username })}
                                        aria-label="Remove Member"
                                      >
                                        <UserMinus className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Remove Member</TooltipContent>
                                </Tooltip>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove {memberToManage?.name}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove <strong>{memberToManage?.name}</strong> from this group?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setMemberToManage(null)} disabled={actionLoading[`remove_${memberToManage?.id}`]}>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={handleRemoveMember}
                                      disabled={actionLoading[`remove_${memberToManage?.id}`]}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {actionLoading[`remove_${memberToManage?.id}`] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <ScrollBar orientation="vertical" />
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>

              {/* Add Members Section */}
              {currentUserIsAdmin && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Add Members</h3>
                  {availableUsers.length === 0 ? (
                    <p className="p-4 text-sm text-center text-muted-foreground bg-muted/50 rounded-md">All users are already in this group.</p>
                  ) : (
                    <>
                      <ScrollArea className="h-48 border border-border rounded-md mb-3">
                        <ul className="divide-y divide-border">
                          {availableUsers.map((profile) => (
                            <li
                              key={profile.id}
                              className="flex items-center justify-between p-3 hover:bg-muted transition-colors cursor-pointer"
                              onClick={() => toggleUserSelectionForAdd(profile.id)}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  id={`add-user-${profile.id}`}
                                  checked={selectedUserIdsToAdd.includes(profile.id)}
                                  onCheckedChange={() => toggleUserSelectionForAdd(profile.id)}
                                  aria-label={`Select ${profile.display_name || profile.username}`}
                                />
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.username} />
                                  <AvatarFallback className="bg-primary/10 text-primary">{profile.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                                </Avatar>
                                <Label htmlFor={`add-user-${profile.id}`} className="text-sm font-normal text-foreground cursor-pointer">
                                  {profile.display_name || profile.username}
                                </Label>
                              </div>
                            </li>
                          ))}
                        </ul>
                        <ScrollBar orientation="vertical" />
                        <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                      <Button
                        onClick={handleAddMembers}
                        disabled={selectedUserIdsToAdd.length === 0 || actionLoading["addMembers"]}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        size="sm"
                      >
                        {actionLoading["addMembers"] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                        Add Selected Members ({selectedUserIdsToAdd.length})
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
