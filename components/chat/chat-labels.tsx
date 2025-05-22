'use client'

import { useState, useEffect } from 'react'
import { Database } from '../../types/supabase'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-context'
import { Loader2, Trash2 } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type Label = Database['public']['Tables']['chat_labels']['Row']

export default function ChatLabels() {
  const [labels, setLabels] = useState<Label[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState('#10B981') // Default to green
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = createClient()

  // Available colors for labels
  const colorOptions = [
    { name: 'Green', value: '#10B981' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Yellow', value: '#F59E0B' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Gray', value: '#6B7280' },
  ]

  // Fetch user's labels
  useEffect(() => {
    if (!user) return

    const fetchLabels = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('chat_labels')
          .select('*')
          .eq('profile_id', user.id)
          .order('name')

        if (error) {
          console.error('Error fetching labels:', error)
          return
        }

        setLabels(data || [])
      } catch (error) {
        console.error('Error in label fetching:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLabels()

    const labelSubscription = supabase
      .channel('label_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_labels',
        filter: `profile_id=eq.${user.id}`,
      }, () => {
        fetchLabels()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(labelSubscription)
    }
  }, [user, supabase])

  // Create a new label with optimistic update
  const createLabel = async () => {
    if (!user || !newLabel.trim() || saving) return

    setSaving(true)
    setError(null)

    // Optimistic update: add the label to the state immediately
    const tempId = uuidv4()
    const optimisticLabel: Label = {
      id: tempId,
      profile_id: user.id,
      name: newLabel.trim(),
      color: newColor,
      created_at: new Date().toISOString(),
    }
    setLabels(prev => [...prev, optimisticLabel].sort((a, b) => a.name.localeCompare(b.name)))
    setNewLabel('')

    try {
      const { data, error } = await supabase
        .from('chat_labels')
        .insert({
          profile_id: user.id,
          name: newLabel.trim(),
          color: newColor,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          setError('A label with this name already exists')
        } else {
          setError(error.message)
        }
        // Revert optimistic update
        setLabels(prev => prev.filter(label => label.id !== tempId))
        return
      }

      // Replace temporary label with actual data from Supabase
      if (data) {
        setLabels(prev =>
          prev
            .filter(label => label.id !== tempId)
            .concat(data)
            .sort((a, b) => a.name.localeCompare(b.name))
        )
      }
    } catch (error) {
      console.error('Error creating label:', error)
      setError('Failed to create label')
      // Revert optimistic update
      setLabels(prev => prev.filter(label => label.id !== tempId))
    } finally {
      setSaving(false)
    }
  }

  // Delete a label with optimistic update
  const deleteLabel = async (labelId: string) => {
    if (!user) return

    // Optimistic update: remove the label from the state immediately
    const deletedLabel = labels.find(label => label.id === labelId)
    setLabels(prev => prev.filter(label => label.id !== labelId))

    try {
      const { error } = await supabase
        .from('chat_labels')
        .delete()
        .eq('id', labelId)
        .eq('profile_id', user.id)

      if (error) {
        console.error('Error deleting label:', error)
        setError('Failed to delete label')
        // Revert optimistic update
        if (deletedLabel) {
          setLabels(prev => [...prev, deletedLabel].sort((a, b) => a.name.localeCompare(b.name)))
        }
      }
    } catch (error) {
      console.error('Error in label deletion:', error)
      setError('Failed to delete label')
      // Revert optimistic update
      if (deletedLabel) {
        setLabels(prev => [...prev, deletedLabel].sort((a, b) => a.name.localeCompare(b.name)))
      }
    }
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6 p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div>
          <h3 className="text-2xl font-semibold text-foreground">Chat Labels</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage labels to organize your chats
          </p>
        </div>

        {/* Create New Label */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Create New Label</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-end gap-3">
              <div className="flex-1">
                <Label htmlFor="label-name" className="text-sm font-medium">
                  Label Name
                </Label>
                <Input
                  id="label-name"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Work, Family, etc."
                  className="mt-1"
                  aria-label="Label name"
                />
              </div>
              <div className="w-full sm:w-40">
                <Label htmlFor="label-color" className="text-sm font-medium">
                  Color
                </Label>
                <Select value={newColor} onValueChange={setNewColor}>
                  <SelectTrigger id="label-color" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map(color => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: color.value }}
                          />
                          {color.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={createLabel}
                disabled={!newLabel.trim() || saving}
                className="w-full sm:w-auto"
                aria-label="Create label"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  'Create'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Label List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Your Labels</CardTitle>
            <CardDescription>
              {labels.length} {labels.length === 1 ? 'label' : 'labels'} created
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-20 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : labels.length === 0 ? (
              <div className="rounded-md bg-muted p-4 text-center text-sm text-muted-foreground">
                {`You haven't created any labels yet`}
              </div>
            ) : (
              <ul className="space-y-2">
                {labels.map(label => (
                  <li
                    key={label.id}
                    className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-5 w-5 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="text-sm font-medium text-foreground">{label.name}</span>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteLabel(label.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
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
  )
}