"use client";

import { useEffect, useState } from "react";
import { ClientChatFilter, FilterCriteria } from "../../types/filter";
import { Database } from "../../types/supabase";
import { Plus, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

type DbLabel = Database["public"]["Tables"]["chat_labels"]["Row"];

export type FilterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, criteria: FilterCriteria) => void;
  existingFilter: ClientChatFilter | null;
  userLabels: DbLabel[];
};

export default function FilterModal({ isOpen, onClose, onSave, existingFilter, userLabels }: FilterModalProps) {
  const [name, setName] = useState("");
  const [currentCriteria, setCurrentCriteria] = useState<Partial<FilterCriteria>>({});
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [labelMatchType, setLabelMatchType] = useState<"any" | "all">("any");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (existingFilter) {
        setName(existingFilter.name);
        setCurrentCriteria(existingFilter.criteria);
        setSelectedLabels(existingFilter.criteria.labels || []);
        setLabelMatchType(existingFilter.criteria.label_match_type || "any");
      } else {
        setName("");
        setCurrentCriteria({});
        setSelectedLabels([]);
        setLabelMatchType("any");
      }
      setError(null);
    }
  }, [isOpen, existingFilter]);

  const handleCriteriaChange = (key: keyof FilterCriteria, value: unknown) => {
    setCurrentCriteria((prev) => ({ ...prev, [key]: value === "" || value === "any_type" ? undefined : value }));
  };

  const handleLabelSelection = (labelId: string) => {
    setSelectedLabels((prev) => (prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]));
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Filter name cannot be empty.");
      return;
    }

    const finalCriteria: FilterCriteria = { ...currentCriteria };
    if (selectedLabels.length > 0) {
      finalCriteria.labels = selectedLabels;
      finalCriteria.label_match_type = labelMatchType;
    } else {
      delete finalCriteria.labels;
      delete finalCriteria.label_match_type;
    }

    (Object.keys(finalCriteria) as Array<keyof FilterCriteria>).forEach((key) => {
      if (finalCriteria[key] === "" || finalCriteria[key] === undefined) {
        delete finalCriteria[key];
      }
    });

    if (Object.keys(finalCriteria).length === 0 && !name.trim().toLowerCase().includes("all chats")) {
      // Allow "All Chats" filter with no criteria
      setError("Please define at least one filter criterion or name it 'All Chats'.");
      return;
    }
    setError(null);
    onSave(name.trim(), finalCriteria);
    onClose(); // Close modal on save
  };

  // The Dialog open state is controlled by the `isOpen` prop
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existingFilter ? "Edit Filter" : "Create New Filter"}</DialogTitle>
          <DialogDescription>Configure the criteria for your custom chat filter.</DialogDescription>
        </DialogHeader>

        {error && <p className="my-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">{error}</p>}

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="filter-modal-name">
                Filter Name <span className="text-destructive">*</span>
              </Label>
              <Input id="filter-modal-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Important Unread" className="mt-1" />
            </div>

            <fieldset className="space-y-4 rounded-md border p-4 pt-2">
              <legend className="-ml-1 px-1 text-sm font-medium text-muted-foreground">Criteria</legend>

              <div className="flex items-center space-x-2">
                <Checkbox id="modal-unread" checked={currentCriteria.unread || false} onCheckedChange={(checked) => handleCriteriaChange("unread", checked)} />
                <Label htmlFor="modal-unread" className="font-normal select-none">
                  Unread Messages Only
                </Label>
              </div>

              <div>
                <Label htmlFor="modal-chat-type">Chat Type</Label>
                <Select
                  value={currentCriteria.is_group === undefined ? "any_type" : currentCriteria.is_group === true ? "group" : "one_on_one"}
                  onValueChange={(value) => handleCriteriaChange("is_group", value === "any_type" ? undefined : value === "group")}
                >
                  <SelectTrigger id="modal-chat-type" className="mt-1">
                    <SelectValue placeholder="Select chat type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any_type">Any Type</SelectItem>
                    <SelectItem value="group">Group Chats Only</SelectItem>
                    <SelectItem value="one_on_one">One-on-One Chats Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="modal-chat_name_contains">Chat Name Contains</Label>
                <Input
                  id="modal-chat_name_contains"
                  value={currentCriteria.chat_name_contains || ""}
                  onChange={(e) => handleCriteriaChange("chat_name_contains", e.target.value)}
                  className="mt-1"
                  placeholder="e.g., Project Alpha"
                />
              </div>

              {(currentCriteria.is_group === false || currentCriteria.is_group === undefined) && (
                <div>
                  <Label htmlFor="modal-other_participant_name_contains">Other Participant Contains (for 1-on-1)</Label>
                  <Input
                    id="modal-other_participant_name_contains"
                    value={currentCriteria.other_participant_name_contains || ""}
                    onChange={(e) => handleCriteriaChange("other_participant_name_contains", e.target.value)}
                    className="mt-1"
                    placeholder="e.g., John Doe"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox id="modal-has_attachments" checked={currentCriteria.has_attachments || false} onCheckedChange={(checked) => handleCriteriaChange("has_attachments", checked)} />
                <Label htmlFor="modal-has_attachments" className="font-normal select-none">
                  Has Attachments (in last message)
                </Label>
              </div>

              {userLabels.length > 0 && (
                <div className="pt-2">
                  <Label>Labels</Label>
                  <div className="mt-1 max-h-36 space-y-1.5 overflow-y-auto rounded-md border bg-muted/50 p-3">
                    {userLabels.map((label) => (
                      <div key={label.id} className="flex items-center space-x-2">
                        <Checkbox id={`modal-label-${label.id}`} checked={selectedLabels.includes(label.id)} onCheckedChange={() => handleLabelSelection(label.id)} />
                        <Label htmlFor={`modal-label-${label.id}`} className="flex items-center font-normal select-none">
                          <span className="mr-2 h-3 w-3 rounded-full" style={{ backgroundColor: label.color }}></span>
                          {label.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {selectedLabels.length > 1 && (
                    <div className="mt-2.5">
                      <Select value={labelMatchType} onValueChange={(value: "any" | "all") => setLabelMatchType(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select label match type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Match ANY selected label</SelectItem>
                          <SelectItem value="all">Match ALL selected labels</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </fieldset>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit}>
            {existingFilter ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {existingFilter ? "Save Changes" : "Create Filter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
