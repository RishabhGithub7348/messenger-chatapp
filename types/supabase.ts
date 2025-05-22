export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chats: {
        Row: {
          id: string
          name: string | null
          is_group: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          is_group?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          is_group?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      chat_members: {
        Row: {
          id: string
          chat_id: string
          profile_id: string
          is_admin: boolean
          joined_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          profile_id: string
          is_admin?: boolean
          joined_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          profile_id?: string
          is_admin?: boolean
          joined_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          chat_id: string
          sender_id: string
          content: string | null
          attachment_url: string | null
          attachment_type: string | null
          is_read: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          sender_id: string
          content?: string | null
          attachment_url?: string | null
          attachment_type?: string | null
          is_read?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          sender_id?: string
          content?: string | null
          attachment_url?: string | null
          attachment_type?: string | null
          is_read?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      message_reads: {
        Row: {
          id: string
          message_id: string
          profile_id: string
          read_at: string
        }
        Insert: {
          id?: string
          message_id: string
          profile_id: string
          read_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          profile_id?: string
          read_at?: string
        }
      }
      chat_labels: {
        Row: {
          id: string
          profile_id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          name: string
          color: string
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          name?: string
          color?: string
          created_at?: string
        }
      }
      chat_label_assignments: {
        Row: {
          id: string
          chat_id: string
          label_id: string
          profile_id: string
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          label_id: string
          profile_id: string
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          label_id?: string
          profile_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_chat_details: {
        Args: {
          chat_id_param: string
          user_id_param: string
        }
        Returns: {
          id: string
          name: string
          is_group: boolean
          created_at: string
          updated_at: string
          last_message: Json
          unread_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
