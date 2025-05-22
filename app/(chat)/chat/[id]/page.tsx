"use client";
import AttachmentPreview from "@/components/attachments/attachment-preview";
import AttachmentUploader from "@/components/attachments/attachment-uploader";
import ChatLabelManager from "@/components/chat/chat-label-manager";
import GroupChatManager from "@/components/chat/group-chat-management";
import { useAuth } from "@/context/auth-context";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/supabase";
import EmojiPicker from "emoji-picker-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Info, Mic, Paperclip, Send, Smile, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Chat = Database["public"]["Tables"]["chats"]["Row"];
type Message = Database["public"]["Tables"]["messages"]["Row"] & {
  sender: Profile;
};

export default function ChatMessagePage() {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const { user, profile } = useAuth();
  const supabase = createClient();
  const params = useParams();
  const router = useRouter();
  const chatId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    if (messages.length === 0) return;

    const container = messagesEndRef.current?.parentElement?.parentElement;
    if (container) {
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;

      console.log(isAtBottom, "isatbottom");
      if (!isAtBottom) {
        // Use scrollTop to scroll to the bottom without forcing layout shifts
        container.scrollTop = container.scrollHeight;
      }
    }
  };

  const scrollBottomRef = useRef(scrollToBottom);

  useEffect(() => {
    if (messages.length > 0) {
      scrollBottomRef.current();
    }
  }, [messages]);

  // Fetch chat details
  useEffect(() => {
    if (!user || !chatId) return;

    const fetchChatDetails = async () => {
      setLoading(true);
      try {
        // Get chat details
        const { data: chatData, error: chatError } = await supabase.from("chats").select("*").eq("id", chatId).single();

        if (chatError) {
          console.error("Error fetching chat:", chatError);
          router.push("/");
          return;
        }

        setChat(chatData);

        // Get chat members
        const { data: membersData, error: membersError } = await supabase.from("chat_members").select("profiles(*)").eq("chat_id", chatId);

        if (membersError) {
          console.error("Error fetching members:", membersError);
          return;
        }

        const profiles = membersData.map((member) => member.profiles) as unknown as Profile[];
        setMembers(profiles);

        // Get messages
        const { data: messagesData, error: messagesError } = await supabase.from("messages").select("*, sender:profiles(*)").eq("chat_id", chatId).order("created_at");

        if (messagesError) {
          console.error("Error fetching messages:", messagesError);
          return;
        }

        setMessages(messagesData as Message[]);

        // Mark messages as read
        const unreadMessages = messagesData
          .filter((msg) => msg.sender_id !== user.id)
          .map((msg) => ({
            message_id: msg.id,
            profile_id: user.id,
          }));

        if (unreadMessages.length > 0) {
          await supabase.from("message_reads").upsert(unreadMessages, { onConflict: "message_id,profile_id" });
        }
      } catch (error) {
        console.error("Error in chat details fetching:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChatDetails();
  }, [user, chatId, supabase, router]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user || !chatId) return;

    // Subscribe to new messages
    const messageSubscription = supabase
      .channel(`messages:${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          // Fetch the complete message with sender details
          const { data, error } = await supabase.from("messages").select("*, sender:profiles(*)").eq("id", payload.new.id).single();

          if (error) {
            console.error("Error fetching new message:", error);
            return;
          }

          // Add the new message to the state
          setMessages((prev) => [...prev, data as Message]);

          // Mark message as read if from another user
          if (data.sender_id !== user.id) {
            await supabase.from("message_reads").upsert(
              {
                message_id: data.id,
                profile_id: user.id,
              },
              { onConflict: "message_id,profile_id" }
            );
          }

          // Scroll to bottom
          scrollToBottom();
        }
      )
      .subscribe();

    // Set up typing indicator channel
    const typingChannel = supabase.channel(`typing:${chatId}`);

    // Subscribe to typing events
    typingChannel
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload.user_id === user.id) return;

        setTypingUsers((prev) => ({
          ...prev,
          [payload.payload.user_id]: payload.payload.username,
        }));

        // Clear typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers((prev) => {
            const newState = { ...prev };
            delete newState[payload.payload.user_id];
            return newState;
          });
        }, 2000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageSubscription);
      supabase.removeChannel(typingChannel);
    };
  }, [user, chatId, supabase]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  console.log(messages);
  // State for attachment uploader
  const [showAttachmentUploader, setShowAttachmentUploader] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<"image" | "video" | "document" | "audio" | null>(null);

  // Handle sending a new message
  const sendMessage = async () => {
    if (!user || !chatId || (!newMessage.trim() && !attachmentUrl) || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        chat_id: chatId,
        sender_id: user.id,
        content: newMessage.trim() || null,
        attachment_url: attachmentUrl || null,
        attachment_type: attachmentType || null,
      });

      if (error) {
        console.error("Error sending message:", error);
        return;
      }

      setNewMessage("");
      setAttachmentUrl(null);
      setAttachmentType(null);
    } catch (error) {
      console.error("Error in message sending:", error);
    } finally {
      setSending(false);
    }
  };

  // Handle attachment upload completion
  const handleAttachmentUpload = (url: string, type: "image" | "video" | "document" | "audio") => {
    setAttachmentUrl(url);
    setAttachmentType(type);
    setShowAttachmentUploader(false);
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!user || !profile || !chatId) return;

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Only broadcast if not already typing
    if (!isTyping) {
      setIsTyping(true);

      // Broadcast typing event
      supabase.channel(`typing:${chatId}`).send({
        type: "broadcast",
        event: "typing",
        payload: {
          user_id: user.id,
          username: profile.username,
        },
      });
    }

    // Set timeout to clear typing state
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 3000);
  };

  // Format date for messages
  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
  };

  // Format date for date separators
  const formatDateSeparator = (dateString: string) => {
    const date = new Date(dateString);
    return date
      .toLocaleDateString("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, "-");
  };

  // Get chat name
  const getChatName = () => {
    if (!chat) return "Chat";

    if (chat.is_group) {
      return chat.name;
    } else {
      // For one-on-one chats, show the other user's name
      const otherMember = members.find((member) => member.id !== user?.id);
      return otherMember?.display_name || otherMember?.username || "Chat";
    }
  };

  // Get typing indicator text
  const getTypingText = () => {
    const typingUsernames = Object.values(typingUsers);

    if (typingUsernames.length === 0) return null;
    if (typingUsernames.length === 1) return `${typingUsernames[0]} is typing...`;
    if (typingUsernames.length === 2) return `${typingUsernames[0]} and ${typingUsernames[1]} are typing...`;
    return "Several people are typing...";
  };

  // Group messages by date for date separators
  const messagesByDate = messages.reduce<Record<string, Message[]>>((groups, message) => {
    const date = formatDateSeparator(message.created_at);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <div className="flex h-full flex-col bg-gray-100">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4">
        <TooltipProvider>
          <div className="flex items-center">
            {chat?.is_group ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-800">{getChatName()?.charAt(0).toUpperCase()}</div>
            )}
            <div className="ml-3">
              <h2 className="text-lg font-medium text-gray-900">{getChatName()}</h2>
              <div className="text-sm text-gray-500">
                {
                  getTypingText() || (chat?.is_group ? members.map((m) => m.display_name || m.username).join(", ") : "Online") // This will be replaced with actual presence info
                }
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="rounded-full p-2 text-gray-600 hover:bg-gray-100" onClick={() => setShowChatInfo(!showChatInfo)}>
                  <Info className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Chat info</p>
              </TooltipContent>
            </Tooltip>

            {chat?.is_group && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="rounded-full p-2 text-gray-600 hover:bg-gray-100" onClick={() => setShowGroupManager(!showGroupManager)}>
                    <Users className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Manage group</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-green-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-gray-500">
            <div className="flex items-center justify-center flex-col">
              <div className="mb-4 rounded-full bg-gray-100 p-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-lg font-medium">No messages yet</p>
              <p className="mt-1">Send a message to start the conversation</p>
            </div>
          </div>
        ) : (
          <div className="min-h-full space-y-4">
            {Object.entries(messagesByDate).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Date separator */}
                <div className="my-4 flex items-center justify-center">
                  <div className="rounded-full bg-gray-200 px-3 py-1 text-xs text-gray-600">{date}</div>
                </div>

                {/* Messages for this date */}
                <div className="space-y-3">
                  {dateMessages.map((message, index) => {
                    const isCurrentUser = message.sender_id === user?.id;
                    const showSender = chat?.is_group && !isCurrentUser && (index === 0 || dateMessages[index - 1].sender_id !== message.sender_id);

                    return (
                      <div key={message.id} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] rounded-lg px-4 py-2 ${isCurrentUser ? "bg-green-100 text-green-900" : "bg-white text-gray-900"}`}>
                          {showSender && <div className="mb-1 text-xs font-medium text-gray-500">{message.sender.display_name || message.sender.username}</div>}
                          {/* Display attachment if present and type is image */}
                          {message.attachment_url && message.attachment_type === "image" && (
                            <div className="mb-2">
                              <AttachmentPreview url={message.attachment_url} type={message.attachment_type} />
                            </div>
                          )}
                          {/* Display message content if present */}
                          {message.content && <div className="break-words">{message.content}</div>}
                          <div className="mt-1 text-right text-xs text-gray-500">
                            {formatMessageDate(message.created_at)}
                            {isCurrentUser && (
                              <span className="ml-1 text-green-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="inline h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Typing indicator */}
      {getTypingText() && <div className="bg-white px-4 py-2 text-sm text-gray-500">{getTypingText()}</div>}

      {/* Attachment uploader */}
      {showAttachmentUploader && (
        <div className="border-t border-gray-200 bg-white p-4">
          <AttachmentUploader chatId={chatId} onUploadComplete={handleAttachmentUpload} onCancel={() => setShowAttachmentUploader(false)} />
        </div>
      )}

      {/* Attachment preview */}
      {attachmentUrl && attachmentType && !showAttachmentUploader && (
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Attachment ready to send</h3>
            <button
              onClick={() => {
                setAttachmentUrl(null);
                setAttachmentType(null);
              }}
              className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
          <AttachmentPreview url={attachmentUrl} type={attachmentType} />
        </div>
      )}

      {/* Message input */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="relative flex items-center">
          <div className="flex space-x-2 mr-3">
            <button className="rounded-full p-2 text-gray-500 hover:bg-gray-100" onClick={() => setShowAttachmentUploader(true)}>
              <Paperclip className="h-5 w-5" />
            </button>

            <button className="rounded-full p-2 text-gray-500 hover:bg-gray-100" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
              <Smile className="h-5 w-5" />
            </button>
          </div>

          {/* Emoji Picker - Centered above the input */}
          {showEmojiPicker && (
            <div className="absolute bottom-16 left-1/7 transform -translate-x-1/2 z-10">
              <EmojiPicker
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onEmojiClick={(emojiObject: any) => {
                  setNewMessage((prev) => prev + emojiObject.emoji);
                  setShowEmojiPicker(false);
                }}
                width={300}
              />
            </div>
          )}

          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Message..."
            className="flex-1 rounded-full bg-gray-100 px-4 py-2 focus:outline-none"
          />

          <div className="ml-3">
            {newMessage.trim() || attachmentUrl ? (
              <button className="rounded-full p-2 text-green-500 hover:bg-gray-100" onClick={sendMessage} disabled={sending}>
                <Send className="h-5 w-5" />
              </button>
            ) : (
              <button className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
                <Mic className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chat info panel */}
      {showChatInfo && (
        <div className="absolute right-0 top-16 z-10 w-80 rounded-md border border-gray-200 bg-white p-4 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium">Chat Info</h3>
            <button onClick={() => setShowChatInfo(false)} className="rounded-full p-1 text-gray-500 hover:bg-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          <ChatLabelManager chatId={chatId} />

          <button onClick={() => setShowChatInfo(false)} className="mt-4 w-full rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Close
          </button>
        </div>
      )}

      {/* Group manager panel */}
      {showGroupManager && chat?.is_group && (
        <div className="absolute right-0 top-16 z-10 w-80 rounded-md border border-gray-200 bg-white p-4 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium">Manage Group</h3>
            <button onClick={() => setShowGroupManager(false)} className="rounded-full p-1 text-gray-500 hover:bg-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
          <GroupChatManager chatId={chatId} />
        </div>
      )}
    </div>
  );
}
