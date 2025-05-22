"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/auth-context";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, Filter as FilterIcon, GripVertical, MessageSquarePlus, Paperclip, Pencil, Plus, Search, Settings, Trash2, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FaFilter } from "react-icons/fa";
import { IoCreate } from "react-icons/io5";
import { v4 as uuidv4 } from "uuid";
import { ClientChatFilter, FilterCriteria } from "../../types/filter";
import { Database } from "../../types/supabase";
import FilterModal from "./chat-filter-modal";

type Label = Database["public"]["Tables"]["chat_labels"]["Row"];

type ChatWithDetails = {
  id: string;
  name: string | null;
  is_group: boolean;
  created_at: string;
  updated_at: string;
  last_message: {
    id: string;
    content: string | null;
    sender_id: string;
    sender_name: string;
    created_at: string;
    has_attachment: boolean;
  } | null;
  unread_count: number;
  labels: Label[];
};

const LOCAL_STORAGE_FILTERS_KEY = "chatAppClientFilters";

export default function ChatSidebar() {
  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  // State for client-side filters
  const [definedFilters, setDefinedFilters] = useState<ClientChatFilter[]>([]);
  const [activeFilter, setActiveFilter] = useState<ClientChatFilter | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [editingFilter, setEditingFilter] = useState<ClientChatFilter | null>(null);
  const [userLabels, setUserLabels] = useState<Label[]>([]);

  useEffect(() => {
    const storedFilters = localStorage.getItem(LOCAL_STORAGE_FILTERS_KEY);
    if (storedFilters) {
      try {
        const parsedFilters = JSON.parse(storedFilters);
        setDefinedFilters(parsedFilters);
      } catch (e) {
        console.error("Failed to parse filters from localStorage", e);
        localStorage.removeItem(LOCAL_STORAGE_FILTERS_KEY);
      }
    }
  }, []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    // Avoid writing an empty array if nothing was there initially or if it's truly empty after operations
    if (definedFilters.length > 0 || localStorage.getItem(LOCAL_STORAGE_FILTERS_KEY)) {
      localStorage.setItem(LOCAL_STORAGE_FILTERS_KEY, JSON.stringify(definedFilters));
    }
  }, [definedFilters]);

  // Fetch user's labels (for filter criteria selection)
  useEffect(() => {
    if (!user) return;
    const fetchUserLabels = async () => {
      const { data, error } = await supabase.from("chat_labels").select("*").eq("profile_id", user.id).order("name");
      if (error) {
        console.error("Error fetching user labels for filter modal:", error);
      } else {
        setUserLabels(data || []);
      }
    };
    fetchUserLabels();
  }, [user, supabase]);

  // Fetch chats for the current user
  useEffect(() => {
    if (!user) return;
    const fetchChats = async () => {
      setLoading(true);

      try {
        // Get all chats where the user is a member
        const { data: chatMembers, error: memberError } = await supabase.from("chat_members").select("chat_id").eq("profile_id", user.id);

        if (memberError) {
          console.error("Error fetching chat memberships:", memberError);
          return;
        }

        if (!chatMembers || chatMembers.length === 0) {
          setChats([]);
          setLoading(false);
          return;
        }

        const chatIds = chatMembers.map((member) => member.chat_id);

        // Fetch all user's labels
        const { data: labels, error: labelsError } = await supabase.from("chat_labels").select("*").eq("profile_id", user.id);

        if (labelsError) {
          console.error("Error fetching labels:", labelsError);
        }

        // Fetch all label assignments for user's chats
        const { data: labelAssignments, error: assignmentsError } = await supabase.from("chat_label_assignments").select("*").eq("profile_id", user.id).in("chat_id", chatIds);

        if (assignmentsError) {
          console.error("Error fetching label assignments:", assignmentsError);
        }

        // For each chat, get details including last message
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chatDetailsPromises = chatIds.map(async (chatId: any) => {
          const { data, error } = await supabase.rpc("get_chat_details", {
            chat_id_param: chatId,
            user_id_param: user.id,
          });

          if (error) {
            console.error(`Error fetching details for chat ${chatId}:`, error);
            return null;
          }

          // Add labels to chat
          const chatLabels =
            labelAssignments
              ?.filter((la) => la.chat_id === chatId)
              .map((la) => {
                const label = labels?.find((l) => l.id === la.label_id);
                return label;
              })
              .filter(Boolean) || [];

          return {
            ...data[0],
            labels: chatLabels,
          };
        });

        const chatDetailsResults = await Promise.all(chatDetailsPromises);
        const validChats = chatDetailsResults.filter((chat) => chat !== null) as ChatWithDetails[];

        // Sort chats by last message time (most recent first)
        validChats.sort((a, b) => {
          const aTime = a.last_message?.created_at || a.updated_at;
          const bTime = b.last_message?.created_at || b.updated_at;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        setChats(validChats);
      } catch (error) {
        console.error("Error in chat fetching:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();

    // Set up realtime subscription for chat updates
    const chatSubscription = supabase
      .channel("chat_updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          // Instead of calling fetchChats() which refreshes everything
          // Update only the specific chat with the new message
          const messageData = payload.new;

          // Fetch sender information for the message
          const { data: senderData, error: senderError } = await supabase.from("profiles").select("username").eq("id", messageData.sender_id).single();

          const senderName = senderError ? "" : senderData?.username || "";

          setChats((prevChats) => {
            // Find the chat that needs to be updated
            const chatIndex = prevChats.findIndex((chat) => chat.id === messageData.chat_id);

            if (chatIndex === -1) return prevChats; // Chat not found in the list

            // Create a copy of the chats array
            const updatedChats = [...prevChats];

            // Get the chat that needs updating
            const chatToUpdate = { ...updatedChats[chatIndex] };

            // Update the last_message property
            chatToUpdate.last_message = {
              id: messageData.id,
              content: messageData.content,
              sender_id: messageData.sender_id,
              sender_name: senderName,
              created_at: messageData.created_at,
              has_attachment: messageData.attachment_url !== null,
            };

            // If the message is from another user, increment unread count
            if (messageData.sender_id !== user?.id) {
              chatToUpdate.unread_count = (chatToUpdate.unread_count || 0) + 1;
            }

            // Update the chat in the array
            updatedChats[chatIndex] = chatToUpdate;

            // Sort chats by last message time (most recent first)
            updatedChats.sort((a, b) => {
              const aTime = a.last_message?.created_at || a.updated_at;
              const bTime = b.last_message?.created_at || b.updated_at;
              return new Date(bTime).getTime() - new Date(aTime).getTime();
            });

            return updatedChats;
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_members",
          filter: `profile_id=eq.${user.id}`,
        },
        () => {
          // Refresh chats when user is added to a new chat
          fetchChats();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "chat_members",
          filter: `profile_id=eq.${user.id}`,
        },
        () => {
          // Refresh chats when user is removed from a chat
          fetchChats();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_label_assignments",
          filter: `profile_id=eq.${user.id}`,
        },
        () => {
          // Refresh chats when label assignments change
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatSubscription);
    };
  }, [user, supabase]);

  // Filter chats based on search term
  // Filtered chats logic
  const filteredChats = useMemo(() => {
    let processedChats = [...chats];
    // 1. Apply search term
    if (searchTerm.trim()) {
      processedChats = processedChats.filter((chat) => chat.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // 2. Apply active filter criteria
    if (activeFilter) {
      const criteria = activeFilter.criteria;
      processedChats = processedChats.filter((chat) => {
        if (criteria.unread !== undefined && criteria.unread !== (chat.unread_count || 0) > 0) return false;

        if (criteria.is_group === true && !chat.is_group) return false;
        if (criteria.is_group === false && chat.is_group) return false; // True for 1-on-1, false for group
        if (criteria.is_group === "one_on_one" && chat.is_group) return false;

        if (criteria.chat_name_contains && !chat.name?.toLowerCase().includes(criteria.chat_name_contains.toLowerCase())) return false;

        if (criteria.other_participant_name_contains && !chat.is_group) {
          if (!chat.name?.toLowerCase().includes(criteria.other_participant_name_contains.toLowerCase())) return false;
        }

        if (criteria.has_attachments !== undefined && criteria.has_attachments !== !!chat.last_message?.has_attachment) return false;

        if (criteria.labels && criteria.labels.length > 0) {
          const chatLabelIds = chat.labels.map((l) => l.id);
          const filterLabelIds = criteria.labels;
          if (criteria.label_match_type === "all") {
            if (!filterLabelIds.every((flId) => chatLabelIds.includes(flId))) return false;
          } else {
            // 'any'
            if (!filterLabelIds.some((flId) => chatLabelIds.includes(flId))) return false;
          }
        }
        return true;
      });
    }
    return processedChats;
  }, [chats, searchTerm, activeFilter]);

  // Filter management functions
  const openNewFilterModal = () => {
    setEditingFilter(null);
    setShowFilterModal(true);
  };

  const openEditFilterModal = (filter: ClientChatFilter) => {
    setEditingFilter(filter);
    setShowFilterModal(true);
  };

  const handleSaveFilter = (name: string, criteria: FilterCriteria) => {
    setDefinedFilters((prevFilters) => {
      if (editingFilter) {
        return prevFilters.map((f) => (f.id === editingFilter.id ? { ...f, name, criteria } : f));
      }
      const newFilter: ClientChatFilter = { id: uuidv4(), name, criteria };
      return [...prevFilters, newFilter];
    });
    setShowFilterModal(false);
    setEditingFilter(null);
  };

  const handleDeleteFilter = (filterId: string) => {
    setDefinedFilters((prevFilters) => prevFilters.filter((f) => f.id !== filterId));
    if (activeFilter?.id === filterId) {
      setActiveFilter(null);
    }
  };

  const applyFilter = (filter: ClientChatFilter | null) => {
    setActiveFilter(filter);
    // Close dropdown if it's open
    const dropdown = document.getElementById("filter-dropdown-menu");
    if (dropdown) dropdown.classList.add("hidden");
  };

  // Handle creating a new chat
  const handleNewChat = () => {
    router.push("/new-chat");
  };

  return (
    <div className="flex flex-col h-full border-r bg-muted/40">
      {/* Header - Fixed */}
      <div className="flex overflow-y-hidden h-16 flex-shrink-0 items-center justify-between border-b bg-background px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center gap-1 text-sm">
              <FaFilter size={20} className="h-3 w-3" />
              {activeFilter ? activeFilter.name : "Custom Filters"}
              {activeFilter && (
                <X
                  className="ml-1 h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    applyFilter(null);
                  }}
                />
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuItem onClick={openNewFilterModal} className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              Create New Filter
            </DropdownMenuItem>
            {definedFilters.length > 0 && <DropdownMenuSeparator />}
            {definedFilters.map((f) => (
              <DropdownMenuGroup key={f.id}>
                <div className="relative group/item flex items-center justify-between">
                  <DropdownMenuItem onClick={() => applyFilter(f)} className={`flex-1 cursor-pointer pr-16 ${activeFilter?.id === f.id ? "bg-muted" : ""}`}>
                    <span className="truncate">{f.name}</span>
                  </DropdownMenuItem>
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditFilterModal(f);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit Filter</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Edit</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFilter(f.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete Filter</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Delete</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </DropdownMenuGroup>
            ))}
            {activeFilter && definedFilters.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => applyFilter(null)} className="cursor-pointer">
                  Clear Active Filter
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center space-x-1">
          {[
            {
              id: "new-chat",
              label: "New Chat",
              icon: IoCreate,
              action: handleNewChat,
            },
            {
              id: "labels",
              label: "Manage Settings",
              icon: Settings,
              href: "/settings",
            },
          ].map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                {item.action ? (
                  <Button variant="ghost" size="icon" onClick={item.action}>
                    <item.icon className="h-5 w-5" />
                    <span className="sr-only">{item.label}</span>
                  </Button>
                ) : (
                  <Link href={item.href!} passHref>
                    <Button variant="ghost" size="icon" asChild>
                      <div>
                        <item.icon className="h-5 w-5" />
                        <span className="sr-only">{item.label}</span>
                      </div>
                    </Button>
                  </Link>
                )}
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Search - Fixed */}
      <div className="flex-shrink-0 overflow-y-hidden p-4 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="text" placeholder="Search chats..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Chat list - Scrollable */}
      <ScrollArea className="flex-1 overflow-y-auto hide-scrollbar">
        <div className="min-h-full">
          {loading ? (
            <div className="flex h-full items-center justify-center py-10">
              <GripVertical className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <FilterIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground">No Chats Found</p>
              <p className="text-sm text-muted-foreground mb-4">Try adjusting your search or filter.</p>
              {!activeFilter && !searchTerm && (
                <Button onClick={handleNewChat}>
                  <MessageSquarePlus className="mr-2 h-4 w-4" /> Start New Chat
                </Button>
              )}
            </div>
          ) : (
            <ul className="divide-y">
              {filteredChats.map((chat) => {
                const isActive = pathname === `/chat/${chat.id}`;
                const chatName = chat.name || (chat.is_group ? "Unnamed Group" : "Unnamed Chat");
                const avatarFallback = chat.is_group
                  ? chatName.substring(0, 1).toUpperCase()
                  : chatName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase() || "??";

                return (
                  <li key={chat.id} className={`${isActive ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-muted/50"}`}>
                    <Link href={`/chat/${chat.id}`} className={`block px-4 py-3 transition-colors duration-150`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-10 w-10 flex-shrink-0 border">
                            <AvatarFallback
                              className={chat.is_group ? "bg-green-200 text-slate-600 dark:bg-green-300 dark:text-slate-300" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}
                            >
                              {chat.is_group ? <Users className="h-5 w-5" /> : avatarFallback}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-sm font-medium ${isActive ? "text-primary" : "text-foreground"}`}>{chatName}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {chat.last_message ? (
                                <>
                                  {chat.is_group && chat.last_message.sender_id !== user?.id && <span className="font-semibold">{chat.last_message.sender_name}: </span>}
                                  {chat.last_message.has_attachment ? (
                                    <span className="inline-flex items-center">
                                      <Paperclip className="mr-1 h-3 w-3 flex-shrink-0" />
                                      Attachment
                                    </span>
                                  ) : (
                                    chat.last_message.content
                                  )}
                                </>
                              ) : (
                                <span className="italic">No messages yet</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end flex-shrink-0 space-y-1">
                          <p className={`text-xs whitespace-nowrap ${isActive ? "text-primary/80" : "text-muted-foreground"}`}>
                            {new Date(chat.last_message?.created_at || chat.updated_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          {chat.unread_count > 0 && (
                            <Badge  variant={isActive ? "default" : "secondary"} className="h-5 bg-green-300 px-1.5 text-xs font-semibold">
                              {chat.unread_count > 99 ? "99+" : chat.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {chat.labels && chat.labels.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1 pl-[calc(2.5rem+0.75rem)]">
                          {chat.labels.slice(0, 3).map((label) => (
                            <Badge
                              key={label.id}
                              variant="outline"
                              className="py-0.5 bg-green-300 px-1.5 text-xs font-normal"
                              style={{
                                borderColor: `${label.color}80`,
                                color: label.color,
                                backgroundColor: `${label.color}1A`,
                              }}
                            >
                              {label.name}
                            </Badge>
                          ))}
                          {chat.labels.length > 3 && (
                            <Badge variant="outline" className="py-0.5 bg-green-300 px-1.5 text-xs font-normal">
                              +{chat.labels.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </ScrollArea>

      {/* Chat Filter - Modal */}
      {showFilterModal && (
        <FilterModal
          isOpen={showFilterModal}
          onClose={() => {
            setShowFilterModal(false);
            setEditingFilter(null);
          }}
          onSave={handleSaveFilter}
          existingFilter={editingFilter}
          userLabels={userLabels}
        />
      )}
    </div>
  );
}
