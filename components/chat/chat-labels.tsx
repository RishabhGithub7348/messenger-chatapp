"use client";

import { useState, useEffect } from "react";
import { Database } from "../../types/supabase";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";
import { Loader2, Tag, Trash2, Plus } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Label = Database["public"]["Tables"]["chat_labels"]["Row"];

export default function ChatLabels() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#10B981");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const supabase = createClient();
  const maxLabelLength = 20;

  const colorOptions = [
    { name: "Green", value: "#10B981" },
    { name: "Blue", value: "#3B82F6" },
    { name: "Red", value: "#EF4444" },
    { name: "Yellow", value: "#F59E0B" },
    { name: "Purple", value: "#8B5CF6" },
    { name: "Pink", value: "#EC4899" },
    { name: "Gray", value: "#6B7280" },
  ];

  useEffect(() => {
    if (!user) return;

    const fetchLabels = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("chat_labels").select("*").eq("profile_id", user.id).order("name");

        if (error) {
          console.error("Error fetching labels:", error);
          setError("Failed to load labels");
          return;
        }

        setLabels(data || []);
      } catch (error) {
        console.error("Error in label fetching:", error);
        setError("Failed to load labels");
      } finally {
        setLoading(false);
      }
    };

    fetchLabels();

    const labelSubscription = supabase
      .channel("label_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_labels",
          filter: `profile_id=eq.${user.id}`,
        },
        () => {
          fetchLabels();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(labelSubscription);
    };
  }, [user, supabase]);

  const createLabel = async () => {
    if (!user || !newLabel.trim() || saving || newLabel.length > maxLabelLength) return;

    setSaving(true);
    setError(null);

    const tempId = uuidv4();
    const optimisticLabel: Label = {
      id: tempId,
      profile_id: user.id,
      name: newLabel.trim(),
      color: newColor,
      created_at: new Date().toISOString(),
    };
    setLabels((prev) => [...prev, optimisticLabel].sort((a, b) => a.name.localeCompare(b.name)));
    setNewLabel("");

    try {
      const { data, error } = await supabase
        .from("chat_labels")
        .insert({
          profile_id: user.id,
          name: newLabel.trim(),
          color: newColor,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          setError("A label with this name already exists");
        } else {
          setError(error.message);
        }
        setLabels((prev) => prev.filter((label) => label.id !== tempId));
        return;
      }

      if (data) {
        setLabels((prev) =>
          prev
            .filter((label) => label.id !== tempId)
            .concat(data)
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      }
    } catch (error) {
      console.error("Error creating label:", error);
      setError("Failed to create label");
      setLabels((prev) => prev.filter((label) => label.id !== tempId));
    } finally {
      setSaving(false);
    }
  };

  const deleteLabel = async (labelId: string) => {
    if (!user) return;

    const deletedLabel = labels.find((label) => label.id === labelId);
    setLabels((prev) => prev.filter((label) => label.id !== labelId));

    try {
      const { error } = await supabase.from("chat_labels").delete().eq("id", labelId).eq("profile_id", user.id);

      if (error) {
        console.error("Error deleting label:", error);
        setError("Failed to delete label");
        if (deletedLabel) {
          setLabels((prev) => [...prev, deletedLabel].sort((a, b) => a.name.localeCompare(b.name)));
        }
      }
    } catch (error) {
      console.error("Error in label deletion:", error);
      setError("Failed to delete label");
      if (deletedLabel) {
        setLabels((prev) => [...prev, deletedLabel].sort((a, b) => a.name.localeCompare(b.name)));
      }
    }
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Tag className="h-5 w-5 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-800">Chat Labels</h2>
        </div>
        <p className="text-sm text-gray-500">Organize your chats with custom labels</p>

        {/* Create New Label */}
        <Card className="shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Create New Label</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="label-name" className="text-sm font-medium">
                  Label Name
                </Label>
                <Input
                  id="label-name"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value.slice(0, maxLabelLength))}
                  placeholder="e.g., Work, Family"
                  className="mt-1 transition-all focus:ring-2 focus:ring-blue-500"
                  aria-label="Label name"
                  maxLength={maxLabelLength}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {newLabel.length}/{maxLabelLength} characters
                </p>
              </div>
              <div>
                <Label htmlFor="label-color" className="text-sm font-medium">
                  Color
                </Label>
                <Select value={newColor} onValueChange={setNewColor}>
                  <SelectTrigger id="label-color" className="mt-1 transition-all focus:ring-2 focus:ring-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded-full" style={{ backgroundColor: color.value }} />
                          {color.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={createLabel}
              disabled={!newLabel.trim() || saving || newLabel.length > maxLabelLength}
              className="w-full md:w-auto bg-[#10B981] hover:[#10B981] transition-transform hover:scale-105"
              aria-label="Create label"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create
            </Button>
          </CardContent>
        </Card>

        {/* Label List */}
        <Card className="shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Your Labels</CardTitle>
            <CardDescription>
              {labels.length} {labels.length === 1 ? "label" : "labels"} created
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-20 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : labels.length === 0 ? (
              <div className="rounded-md bg-gray-50 p-6 text-center text-sm text-gray-500">
                <p>No labels created yet.</p>
                <p className="mt-2">Start by adding a new label above!</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {labels.map((label) => (
                  <li key={label.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-full" style={{ backgroundColor: label.color }} />
                      <span className="text-sm font-medium text-gray-800">{label.name}</span>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteLabel(label.id)}
                          className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                          aria-label={`Delete ${label.name} label`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Delete Label</TooltipContent>
                    </Tooltip>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
