'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { ArrowLeft, Search, Users, Check, X, Loader2 } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"

type Profile = Database['public']['Tables']['profiles']['Row']

export default function NewChatPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([])
  const [isGroup, setIsGroup] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()
  const router = useRouter()

  // Fetch all users except the current user
  useEffect(() => {
    if (!user) return

    const fetchUsers = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', user.id)
          .order('username')

        if (error) {
          console.error('Error fetching users:', error)
          return
        }

        setUsers(data || [])
      } catch (error) {
        console.error('Error in user fetching:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [user, supabase])

  // Filter users based on search term
  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.display_name && u.display_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Toggle user selection
  const toggleUserSelection = (profile: Profile) => {
    if (isGroup) {
      // Group mode: Allow multiple selections
      if (selectedUsers.some(u => u.id === profile.id)) {
        setSelectedUsers(selectedUsers.filter(u => u.id !== profile.id))
      } else {
        setSelectedUsers([...selectedUsers, profile])
      }
    } else {
      // Non-group mode: Allow only one selection
      if (selectedUsers.some(u => u.id === profile.id)) {
        setSelectedUsers([])
      } else {
        setSelectedUsers([profile]) // Replace with the new selection
      }
    }
  }

  // Create a new chat
  const createChat = async () => {
    if (!user || selectedUsers.length === 0 || (isGroup && !groupName.trim())) return

    setCreating(true)

    try {
      // Check if one-on-one chat already exists
      if (!isGroup && selectedUsers.length === 1) {
        const { data: existingChats, error: chatError } = await supabase
          .from('chats')
          .select('id')
          .eq('is_group', false)
          .filter('id', 'in', `
            (SELECT chat_id FROM chat_members WHERE profile_id = '${user.id}')
            INTERSECT
            (SELECT chat_id FROM chat_members WHERE profile_id = '${selectedUsers[0].id}')
          `)
          .filter('id', 'in', `
            (SELECT chat_id FROM chat_members GROUP BY chat_id HAVING COUNT(*) = 2)
          `)

        if (chatError) {
          console.error('Error checking existing chats:', chatError)
          return
        }

        if (existingChats?.length > 0) {
          router.push(`/chat/${existingChats[0].id}`)
          return
        }
      }

      // Create a new chat
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .insert({
          name: isGroup ? groupName : null,
          is_group: isGroup,
          created_by: user.id
        })
        .select()
        .single()

      if (chatError || !chatData) {
        console.error('Error creating chat:', chatError)
        return
      }

      // Add current user as a member and admin
      const { error: memberError } = await supabase
        .from('chat_members')
        .insert({
          chat_id: chatData.id,
          profile_id: user.id,
          is_admin: true
        })

      if (memberError) {
        console.error('Error adding current user to chat:', memberError)
        return
      }

      // Add selected users as members
      const memberInserts = selectedUsers.map(selectedUser => ({
        chat_id: chatData.id,
        profile_id: selectedUser.id,
        is_admin: isGroup ? false : true // In one-on-one chats, both users are admins
      }))

      const { error: membersError } = await supabase
        .from('chat_members')
        .insert(memberInserts)

      if (membersError) {
        console.error('Error adding members to chat:', membersError)
        return
      }

      // Navigate to the new chat
      router.push(`/chat/${chatData.id}`)
    } catch (error) {
      console.error('Error creating chat:', error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">New Chat</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="group-toggle"
              checked={isGroup}
              onCheckedChange={() => setIsGroup(!isGroup)}
              aria-label="Create group chat"
            />
            <Label htmlFor="group-toggle" className="text-sm text-muted-foreground">
              Create group chat
            </Label>
          </div>
          <Button
            onClick={createChat}
            disabled={selectedUsers.length === 0 || (isGroup && !groupName.trim()) || creating}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            size="sm"
          >
            {creating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Users className="mr-2 h-4 w-4" />
            )}
            Create Chat
          </Button>
        </div>
      </div>

      {/* Group name input (if group chat) */}
      {isGroup && (
        <div className="border-b border-border p-4">
          <Label htmlFor="group-name" className="text-sm font-medium text-foreground">
            Group Name
          </Label>
          <Input
            id="group-name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name"
            className="mt-1"
          />
        </div>
      )}

      {/* Search */}
      <div className="border-b border-border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users"
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Selected users */}
      {selectedUsers.length > 0 && (
        <div className="border-b border-border p-4">
          <h2 className="mb-2 text-sm font-medium text-foreground">
            Selected ({selectedUsers.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map(profile => (
              <Badge
                key={profile.id}
                variant="secondary"
                className="flex items-center gap-1 px-3 py-1"
              >
                <span>{profile.display_name || profile.username}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4"
                  onClick={() => toggleUserSelection(profile)}
                  aria-label={`Remove ${profile.display_name || profile.username}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* User list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex h-32 items-center justify-center p-4 text-center text-muted-foreground">
            <p>No users found</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filteredUsers.map(profile => {
              const isSelected = selectedUsers.some(u => u.id === profile.id)

              return (
                <li
                  key={profile.id}
                  onClick={() => toggleUserSelection(profile)}
                  className={`cursor-pointer px-4 py-3 hover:bg-muted transition-colors ${isSelected ? 'bg-primary/10' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile.avatar_url || undefined} alt={profile.username} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {profile.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {profile.display_name || profile.username}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {profile.status || '@' + profile.username}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <ScrollBar orientation="vertical" />
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}