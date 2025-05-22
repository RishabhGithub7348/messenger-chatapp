"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Database } from "../../types/supabase";
import { useAuth } from "../../context/auth-context";
import { createClient } from "@/lib/supabase/client";

import { Tag, Check, Loader2, Settings, PlusCircle, Tags, CheckCircle2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

type DbLabel = Database["public"]["Tables"]["chat_labels"]["Row"];

export default function ChatLabelManager({ chatId }: { chatId: string }) {
  const [labels, setLabels] = useState<DbLabel[]>([]);
  const [assignedLabels, setAssignedLabels] = useState<string[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [togglingLabelId, setTogglingLabelId] = useState<string | null>(null);

  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (!user || !chatId) {
      setInitialLoading(false);
      return;
    }

    const fetchLabelsAndAssignments = async () => {
      // Keep initialLoading true only for the very first fetch attempt
      // Subsequent fetches (e.g., from subscriptions) shouldn't reset it to true if already false.
      if (initialLoading) setInitialLoading(true);

      try {
        const [labelsRes, assignmentsRes] = await Promise.all([
          supabase.from("chat_labels").select("*").eq("profile_id", user.id).order("name"),
          supabase.from("chat_label_assignments").select("label_id").eq("chat_id", chatId).eq("profile_id", user.id),
        ]);

        if (labelsRes.error) throw labelsRes.error;
        setLabels(labelsRes.data || []);

        if (assignmentsRes.error) throw assignmentsRes.error;
        setAssignedLabels(assignmentsRes.data.map((a) => a.label_id) || []);
      } catch (error) {
        console.error("Error fetching labels/assignments:", error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchLabelsAndAssignments();

    const channelId = `label_manager_${chatId}_${user.id}`;
    const channel = supabase
      .channel(channelId)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_labels", filter: `profile_id=eq.${user.id}` }, fetchLabelsAndAssignments)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_label_assignments", filter: `profile_id=eq.${user.id}` }, (payload) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const changedChatId = (payload.new as any)?.chat_id || (payload.old as any)?.chat_id;
        if (changedChatId === chatId) fetchLabelsAndAssignments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, chatId, supabase]);

  const toggleLabelAssignment = async (labelId: string) => {
    if (!user || !chatId || togglingLabelId) return;

    setTogglingLabelId(labelId);
    const isCurrentlyAssigned = assignedLabels.includes(labelId);

    setAssignedLabels((prev) => (isCurrentlyAssigned ? prev.filter((id) => id !== labelId) : [...prev, labelId]));

    try {
      if (isCurrentlyAssigned) {
        const { error } = await supabase.from("chat_label_assignments").delete().match({ chat_id: chatId, label_id: labelId, profile_id: user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("chat_label_assignments").insert({ chat_id: chatId, label_id: labelId, profile_id: user.id });
        if (error) throw error;
      }
    } catch (error) {
      console.error("Error toggling label assignment:", error);
      setAssignedLabels((prev) => (isCurrentlyAssigned ? [...prev, labelId] : prev.filter((id) => id !== labelId)));
    } finally {
      setTogglingLabelId(null);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col space-y-2 p-3 min-h-[150px] justify-center items-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Loading labels...</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-3 p-3 bg-white rounded-lg shadow-sm border">
        <div className="flex items-center justify-between px-1 mb-1">
          <div className="flex items-center">
            <Tags className="h-4 w-4 mr-2 text-primary" />
            <h4 className="text-sm font-medium text-foreground">Labels</h4>
            {assignedLabels.length > 0 && (
              <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20 text-xs">
                {assignedLabels.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/settings" passHref>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-primary/10 hover:text-primary">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">Manage Labels</span>
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Manage All Labels</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <Separator className="bg-gray-100" />

        {labels.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <div className="bg-primary/10 rounded-full p-3 w-fit mx-auto mb-3">
              <Tag className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium">No Labels Created</p>
            <p className="text-xs mb-4 text-gray-500">Create labels to organize your chats.</p>
            <Link href="/settings" passHref>
              <Button variant="outline" size="sm" className="border-primary/20 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary/30">
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Create Label
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {assignedLabels.length > 0 && (
              <div className="mb-2">
                <h5 className="text-xs font-medium text-gray-500 mb-2 px-1">Applied Labels</h5>
                <div className="flex flex-wrap gap-1.5">
                  {labels
                    .filter((label) => assignedLabels.includes(label.id))
                    .map((label) => (
                      <Badge
                        key={label.id}
                        className="px-2 py-1 flex items-center gap-1.5 bg-white border"
                        style={{
                          borderColor: `${label.color}50`,
                          backgroundColor: `${label.color}10`,
                          color: label.color,
                        }}
                      >
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: label.color }}></div>
                        <span className="text-xs">{label.name}</span>
                        <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-0.5 rounded-full hover:bg-gray-200" onClick={() => toggleLabelAssignment(label.id)}>
                          <X className="h-2.5 w-2.5 text-gray-500" />
                        </Button>
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            <ScrollArea className="max-h-60 -mr-2 pr-2">
              {" "}
              {/* Max height and scroll, negative margin for scrollbar */}
              <h5 className="text-xs font-medium text-gray-500 mb-2 px-1">{assignedLabels.length > 0 ? "All Labels" : "Available Labels"}</h5>
              <ul className="space-y-1 py-1">
                {labels.map((label) => {
                  const isAssigned = assignedLabels.includes(label.id);
                  const isLoadingThis = togglingLabelId === label.id;
                  return (
                    <li key={label.id}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLabelAssignment(label.id)}
                        className={`w-full justify-start h-auto py-2 px-2.5 group transition-all duration-200 ${isAssigned ? "bg-primary/10 text-primary hover:bg-primary/15" : "hover:bg-gray-100"}`}
                        disabled={isLoadingThis}
                        style={{
                          borderLeft: isAssigned ? `3px solid ${label.color}` : "3px solid transparent",
                        }}
                      >
                        {isLoadingThis ? (
                          <Loader2 className="h-4 w-4 mr-2.5 animate-spin flex-shrink-0 text-primary" />
                        ) : (
                          <div className="relative mr-2.5 flex-shrink-0">
                            <div
                              className={`h-4 w-4 rounded-full transition-all duration-200 flex items-center justify-center ${isAssigned ? "bg-primary text-white" : "border-2 border-gray-300"}`}
                              style={{
                                backgroundColor: isAssigned ? label.color : "transparent",
                                borderColor: isAssigned ? label.color : "#d1d5db",
                              }}
                            >
                              {isAssigned && <Check className="h-2.5 w-2.5 text-white" />}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center flex-1">
                          <span className={`text-sm ${isAssigned ? "font-medium" : "font-normal"}`}>{label.name}</span>
                          <div className="ml-2 h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }}></div>
                        </div>

                        {!isLoadingThis && (
                          <div className={`ml-2 flex-shrink-0 transition-opacity ${isAssigned ? "opacity-100" : "opacity-0 group-hover:opacity-70"}`}>
                            {isAssigned ? <CheckCircle2 className="h-4 w-4" style={{ color: label.color }} /> : <PlusCircle className="h-4 w-4 text-gray-400" />}
                          </div>
                        )}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
