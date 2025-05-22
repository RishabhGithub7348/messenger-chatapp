.md# Supabase Database Schema for WhatsApp Clone

This document outlines the database schema for our WhatsApp-like chat application using Supabase. The schema is designed to support real-time messaging, presence tracking, typing indicators, and attachment handling.

## Tables

### 1. profiles

Stores user profile information. This table extends the built-in Supabase Auth users.

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone" 
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE USING (auth.uid() = id);
```

### 2. chats

Stores information about chat conversations (both one-on-one and group chats).

```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT, -- NULL for one-on-one chats, name for group chats
  is_group BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view chats they are members of" 
  ON chats FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_members 
      WHERE chat_members.chat_id = chats.id 
      AND chat_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chats" 
  ON chats FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Chat creators can update their chats" 
  ON chats FOR UPDATE USING (auth.uid() = created_by);
```

### 3. chat_members

Tracks which users are members of which chats.

```sql
CREATE TABLE chat_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(chat_id, profile_id)
);

-- Enable Row Level Security
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Chat members can view other members in their chats" 
  ON chat_members FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_members AS cm 
      WHERE cm.chat_id = chat_members.chat_id 
      AND cm.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can join chats they are invited to" 
  ON chat_members FOR INSERT WITH CHECK (
    auth.uid() = profile_id OR
    EXISTS (
      SELECT 1 FROM chat_members 
      WHERE chat_members.chat_id = chat_id 
      AND chat_members.profile_id = auth.uid() 
      AND chat_members.is_admin = TRUE
    )
  );

CREATE POLICY "Admins can remove members" 
  ON chat_members FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM chat_members 
      WHERE chat_members.chat_id = chat_id 
      AND chat_members.profile_id = auth.uid() 
      AND chat_members.is_admin = TRUE
    ) OR auth.uid() = profile_id
  );
```

### 4. messages

Stores all chat messages.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  attachment_url TEXT,
  attachment_type TEXT, -- 'image', 'video', etc.
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Chat members can view messages in their chats" 
  ON messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_members 
      WHERE chat_members.chat_id = messages.chat_id 
      AND chat_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to chats they are members of" 
  ON messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM chat_members 
      WHERE chat_members.chat_id = chat_id 
      AND chat_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages" 
  ON messages FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages" 
  ON messages FOR DELETE USING (auth.uid() = sender_id);
```

### 5. message_reads

Tracks which users have read which messages.

```sql
CREATE TABLE message_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, profile_id)
);

-- Enable Row Level Security
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can see who read messages in their chats" 
  ON message_reads FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages 
      JOIN chat_members ON messages.chat_id = chat_members.chat_id 
      WHERE messages.id = message_reads.message_id 
      AND chat_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can mark messages as read in their chats" 
  ON message_reads FOR INSERT WITH CHECK (
    auth.uid() = profile_id AND
    EXISTS (
      SELECT 1 FROM messages 
      JOIN chat_members ON messages.chat_id = chat_members.chat_id 
      WHERE messages.id = message_id 
      AND chat_members.profile_id = auth.uid()
    )
  );
```

### 6. chat_labels

Stores labels/tags that users can assign to chats.

```sql
CREATE TABLE chat_labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, name)
);

-- Enable Row Level Security
ALTER TABLE chat_labels ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own labels" 
  ON chat_labels FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can create their own labels" 
  ON chat_labels FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own labels" 
  ON chat_labels FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own labels" 
  ON chat_labels FOR DELETE USING (auth.uid() = profile_id);
```

### 7. chat_label_assignments

Associates labels with chats for a specific user.

```sql
CREATE TABLE chat_label_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  label_id UUID REFERENCES chat_labels(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(chat_id, label_id, profile_id)
);

-- Enable Row Level Security
ALTER TABLE chat_label_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own chat label assignments" 
  ON chat_label_assignments FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can assign labels to their chats" 
  ON chat_label_assignments FOR INSERT WITH CHECK (
    auth.uid() = profile_id AND
    EXISTS (
      SELECT 1 FROM chat_members 
      WHERE chat_members.chat_id = chat_id 
      AND chat_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove label assignments from their chats" 
  ON chat_label_assignments FOR DELETE USING (auth.uid() = profile_id);
```

## Realtime Subscriptions

The following tables will be enabled for Supabase Realtime subscriptions:

```sql
-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable realtime for chat_members
ALTER PUBLICATION supabase_realtime ADD TABLE chat_members;

-- Enable realtime for profiles (for presence)
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Enable realtime for chat_label_assignments
ALTER PUBLICATION supabase_realtime ADD TABLE chat_label_assignments;
```

## Realtime Broadcast and Presence

For typing indicators and online status, we'll use Supabase Realtime Broadcast and Presence features:

1. **Typing Indicators**: We'll use Broadcast to send ephemeral typing events to channel subscribers.
2. **Presence Tracking**: We'll use Presence to track which users are online in which chats.

These features don't require database tables as they're handled by Supabase Realtime's in-memory system.

## Storage Buckets

For handling attachments, we'll create the following storage buckets:

```sql
-- Create a bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('chat_attachments', 'Chat Attachments', false);

-- Set up RLS policies for the bucket
CREATE POLICY "Chat members can view attachments" 
  ON storage.objects FOR SELECT USING (
    bucket_id = 'chat_attachments' AND
    EXISTS (
      SELECT 1 FROM messages 
      JOIN chat_members ON messages.chat_id = chat_members.chat_id 
      WHERE messages.attachment_url = storage.objects.name 
      AND chat_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload attachments" 
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'chat_attachments' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update their own attachments" 
  ON storage.objects FOR UPDATE USING (
    bucket_id = 'chat_attachments' AND
    owner = auth.uid()
  );

CREATE POLICY "Users can delete their own attachments" 
  ON storage.objects FOR DELETE USING (
    bucket_id = 'chat_attachments' AND
    owner = auth.uid()
  );
```

## Database Functions and Triggers

### Last Message Update Trigger

Updates the `updated_at` timestamp of a chat when a new message is added:

```sql
CREATE OR REPLACE FUNCTION update_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats
  SET updated_at = NOW()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_timestamp
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_updated_at();
```

### Get Chat Function

Function to get chat details including the last message:

```sql
CREATE OR REPLACE FUNCTION get_chat_details(chat_id_param UUID, user_id_param UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  is_group BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_message JSONB,
  unread_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    CASE 
      WHEN c.is_group THEN c.name
      ELSE (
        SELECT p.username
        FROM profiles p
        JOIN chat_members cm ON p.id = cm.profile_id
        WHERE cm.chat_id = c.id AND p.id != user_id_param
        LIMIT 1
      )
    END AS name,
    c.is_group,
    c.created_at,
    c.updated_at,
    (
      SELECT jsonb_build_object(
        'id', m.id,
        'content', m.content,
        'sender_id', m.sender_id,
        'sender_name', p.username,
        'created_at', m.created_at,
        'has_attachment', m.attachment_url IS NOT NULL
      )
      FROM messages m
      JOIN profiles p ON m.sender_id = p.id
      WHERE m.chat_id = c.id
      ORDER BY m.created_at DESC
      LIMIT 1
    ) AS last_message,
    (
      SELECT COUNT(*)
      FROM messages m
      LEFT JOIN message_reads mr ON m.id = mr.message_id AND mr.profile_id = user_id_param
      WHERE m.chat_id = c.id AND mr.id IS NULL AND m.sender_id != user_id_param
    ) AS unread_count
  FROM chats c
  WHERE c.id = chat_id_param;
END;
$$ LANGUAGE plpgsql;
```

## Schema Diagram

The relationships between tables can be visualized as follows:

- `profiles` ← one-to-many → `chat_members` ← many-to-one → `chats`
- `profiles` ← one-to-many → `messages` ← many-to-one → `chats`
- `profiles` ← one-to-many → `message_reads` ← many-to-one → `messages`
- `profiles` ← one-to-many → `chat_labels`
- `profiles` + `chats` + `chat_labels` ← composite → `chat_label_assignments`

This schema provides a solid foundation for building a real-time chat application with Supabase, supporting all the required features including messaging, presence tracking, typing indicators, and attachment handling.
