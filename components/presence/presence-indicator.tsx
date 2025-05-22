'use client'

import { useState, useEffect } from 'react'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-context'


type PresenceState = {
  [userId: string]: {
    online: boolean
    lastSeen?: string
  }
}

export function usePresence(chatId?: string) {
  const [presenceState, setPresenceState] = useState<PresenceState>({})
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (!user) return

    // Initialize presence state
    const initialPresence = {
      online: true,
      lastSeen: new Date().toISOString()
    }

    // Create a presence channel for the app
    const presenceChannel = supabase.channel('online_users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    })

    // Track presence changes
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        // Get the current state of all users
        const state = presenceChannel.presenceState()
        
        // Transform the state to our format
        const newPresenceState: PresenceState = {}
        
        Object.keys(state).forEach(userId => {
          const userState = state[userId][0] // Get the first presence instance for this user
          newPresenceState[userId] = {
            online: true,
            lastSeen: userState.lastSeen
          }
        })
        
        setPresenceState(newPresenceState)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Someone came online
        setPresenceState(prev => ({
          ...prev,
          [key]: {
            online: true,
            lastSeen: newPresences[0].lastSeen
          }
        }))
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        // Someone went offline
        setPresenceState(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            online: false
          }
        }))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track the user's presence
          await presenceChannel.track(initialPresence)
        }
      })

    // Create a chat-specific presence channel if chatId is provided
    let chatPresenceChannel: any
    
    if (chatId) {
      chatPresenceChannel = supabase.channel(`chat:${chatId}`, {
        config: {
          presence: {
            key: user.id,
          },
        },
      })

      chatPresenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = chatPresenceChannel.presenceState()
          const newPresenceState: PresenceState = {}
          
          Object.keys(state).forEach(userId => {
            const userState = state[userId][0]
            newPresenceState[userId] = {
              online: true,
              lastSeen: userState.lastSeen
            }
          })
          
          setPresenceState(prev => ({
            ...prev,
            ...newPresenceState
          }))
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          setPresenceState(prev => ({
            ...prev,
            [key]: {
              online: true,
              lastSeen: newPresences[0].lastSeen
            }
          }))
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          setPresenceState(prev => ({
            ...prev,
            [key]: {
              ...prev[key],
              online: false
            }
          }))
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await chatPresenceChannel.track(initialPresence)
          }
        })
    }

    // Set up window events to update presence
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User is looking at the app
        presenceChannel.track({
          online: true,
          lastSeen: new Date().toISOString()
        })
        
        if (chatId && chatPresenceChannel) {
          chatPresenceChannel.track({
            online: true,
            lastSeen: new Date().toISOString()
          })
        }
      }
    }

    const handleBeforeUnload = () => {
      // User is leaving the app
      presenceChannel.track({
        online: false,
        lastSeen: new Date().toISOString()
      })
      
      if (chatId && chatPresenceChannel) {
        chatPresenceChannel.track({
          online: false,
          lastSeen: new Date().toISOString()
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Update presence every 5 minutes to keep it fresh
    const interval = setInterval(() => {
      presenceChannel.track({
        online: true,
        lastSeen: new Date().toISOString()
      })
      
      if (chatId && chatPresenceChannel) {
        chatPresenceChannel.track({
          online: true,
          lastSeen: new Date().toISOString()
        })
      }
    }, 5 * 60 * 1000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      clearInterval(interval)
      
      // Clean up presence channels
      supabase.removeChannel(presenceChannel)
      if (chatPresenceChannel) {
        supabase.removeChannel(chatPresenceChannel)
      }
    }
  }, [user, chatId, supabase])

  return presenceState
}

export default function PresenceIndicator({ userId, showLabel = false }: { userId: string, showLabel?: boolean }) {
  const presenceState = usePresence()
  const isOnline = presenceState[userId]?.online

  return (
    <div className="flex items-center">
      <div className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></div>
      {showLabel && (
        <span className="ml-1.5 text-xs text-gray-500">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  )
}
