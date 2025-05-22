'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link' // For the "Manage Labels" link
import { Database } from '../../types/supabase' // Adjust if your path is different
import { useAuth } from '../../context/auth-context' // Adjust if your path is different
import { createClient } from '@/lib/supabase/client' // Adjust if your path is different



import { Tag, Check, CircleDashed, Loader2, Settings, Plus } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"


type DbLabel = Database['public']['Tables']['chat_labels']['Row']

export default function ChatLabelManager({ chatId }: { chatId: string }) {
  const [labels, setLabels] = useState<DbLabel[]>([])
  const [assignedLabels, setAssignedLabels] = useState<string[]>([])
  const [initialLoading, setInitialLoading] = useState(true);
  const [togglingLabelId, setTogglingLabelId] = useState<string | null>(null);

  const { user } = useAuth()
  const supabase = createClient()

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
          supabase.from('chat_labels').select('*').eq('profile_id', user.id).order('name'),
          supabase.from('chat_label_assignments').select('label_id').eq('chat_id', chatId).eq('profile_id', user.id)
        ]);

        if (labelsRes.error) throw labelsRes.error;
        setLabels(labelsRes.data || []);

        if (assignmentsRes.error) throw assignmentsRes.error;
        setAssignedLabels(assignmentsRes.data.map(a => a.label_id) || []);

      } catch (error) {
        console.error('Error fetching labels/assignments:', error)
      } finally {
        setInitialLoading(false);
      }
    }

    fetchLabelsAndAssignments()

    const channelId = `label_manager_${chatId}_${user.id}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_labels', filter: `profile_id=eq.${user.id}`}, fetchLabelsAndAssignments)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_label_assignments', filter: `profile_id=eq.${user.id}`}, (payload) => {
          const changedChatId = (payload.new as any)?.chat_id || (payload.old as any)?.chat_id;
          if (changedChatId === chatId) fetchLabelsAndAssignments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); }
  }, [user, chatId, supabase]); 

  const toggleLabelAssignment = async (labelId: string) => {
    if (!user || !chatId || togglingLabelId) return;

    setTogglingLabelId(labelId);
    const isCurrentlyAssigned = assignedLabels.includes(labelId);
    
    setAssignedLabels(prev => isCurrentlyAssigned ? prev.filter(id => id !== labelId) : [...prev, labelId]);

    try {
      if (isCurrentlyAssigned) {
        const { error } = await supabase
          .from('chat_label_assignments')
          .delete()
          .match({ chat_id: chatId, label_id: labelId, profile_id: user.id }); // More specific match
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('chat_label_assignments')
          .insert({ chat_id: chatId, label_id: labelId, profile_id: user.id });
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error toggling label assignment:', error);
      setAssignedLabels(prev => isCurrentlyAssigned ? [...prev, labelId] : prev.filter(id => id !== labelId));
    } finally {
      setTogglingLabelId(null);
    }
  }

  if (initialLoading) {
    return (
      <div className="flex flex-col space-y-2 p-3 min-h-[150px] justify-center items-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Loading labels...</p>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-3 p-2">
        <div className="flex items-center justify-between px-1 mb-1">
          <h4 className="text-sm font-medium text-foreground">Labels</h4>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/labels" passHref>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span className="sr-only">Manage Labels</span>
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top"><p>Manage All Labels</p></TooltipContent>
          </Tooltip>
        </div>
        <Separator />
        
        {labels.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <Tag className="mx-auto h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm font-medium">No Labels Created</p>
            <p className="text-xs mb-3">Create labels to organize your chats.</p>
            <Link href="/labels" passHref>
                <Button variant="outline" size="sm">
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Label
                </Button>
            </Link>
          </div>
        ) : (
          <ScrollArea className="max-h-60 -mr-2 pr-2"> {/* Max height and scroll, negative margin for scrollbar */}
            <ul className="space-y-1 py-1">
              {labels.map(label => {
                const isAssigned = assignedLabels.includes(label.id);
                const isLoadingThis = togglingLabelId === label.id;
                return (
                  <li key={label.id}>
                    <Button
                      variant="ghost"
                      size="sm" // Slightly smaller for compactness
                      onClick={() => toggleLabelAssignment(label.id)}
                      className={`w-full justify-start h-auto py-1.5 px-2 group ${isAssigned ? 'bg-accent text-accent-foreground' : ''}`}
                      disabled={isLoadingThis}
                    >
                      {isLoadingThis ? (
                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin flex-shrink-0" />
                      ) : (
                        <div 
                            className="h-3 w-3 rounded-sm mr-2 flex-shrink-0 border" // Using rounded-sm and border
                            style={{ backgroundColor: isAssigned ? label.color : `${label.color}33` , borderColor: label.color }} // Dim if not assigned
                        ></div>
                      )}
                      <span className={`flex-1 text-xs text-left truncate ${isAssigned ? 'font-medium' : 'font-normal'}`}>
                        {label.name}
                      </span>
                      {isAssigned && !isLoadingThis && (
                        <Check className="h-4 w-4 text-primary ml-2 flex-shrink-0" />
                      )}
                      {!isAssigned && !isLoadingThis && (
                        <CircleDashed className="h-4 w-4 text-muted-foreground/60 ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      )}
                    </Button>
                  </li>
                )
              })}
            </ul>
          </ScrollArea>
        )}
      </div>
    </TooltipProvider>
  )
}