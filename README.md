# Real-time Chat Messenger WebApp

A real-time chat application built with Next.js, TypeScript, Tailwind CSS, and Supabase, featuring a modern messaging-inspired UI.

## Documentary Video

To learn more about Real-time Chat Messenger WebApp App and see a walkthrough of its features, watch documentary video:

### Watch the Chat Messenger App Documentary Video

[![alt text](https://github.com/user-attachments/assets/e01e09d3-7e32-49ad-93d0-6f8212dfa810)](https://youtu.be/q2V0-j9j-mU)

## Deployed on Vercel :  [Chat Messenger](https://realtime-chatapp-nu.vercel.app/)


## Features

### Authentication
- Email/password authentication using Supabase Auth
- User profile management with avatars and status
- Protected routes with authentication guards

### Chat Interface
- Messenger ChatApp-style UI with sidebar navigation and chat list
- One-on-one and group chat support
- Real-time message updates
- Message read status tracking
- Typing indicators
- Online/offline presence detection
- Unread message counters

### Messaging
- Text messages with emoji support
- File attachments (images, videos, documents)
- Real-time message delivery
- Message timestamps and read receipts

### Chat Management
- Create one-on-one chats with other users
- Create group chats with multiple participants
- Add/remove members from group chats
- Assign admin privileges in group chats
- Search for chats by name or content
- Label system for organizing chats
- Custom filters for chat list

## Tech Stack

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Context API** for state management

### Backend
- **Supabase** for backend services:
  - PostgreSQL database
  - Authentication
  - Storage for attachments
  - Realtime subscriptions
  - Row-level security policies

## Database Schema

### Supabase Schema Visualizer

![supabase-schema-eojyvdbezoxsbykekjga (1)](https://github.com/user-attachments/assets/8541f90e-e58c-4c4b-a799-27397ac80d10)


The application uses the following Supabase tables:

### `profiles`
Stores user profile information
- `id` (UUID, PK): User ID from auth.users
- `username` (text): Unique username
- `display_name` (text): Display name
- `avatar_url` (text): URL to profile image
- `status` (text): Status of profile
- `created_at` (timestamp): Account creation time
- `updated_at` (timestamp): Last update time

### `chats`
Stores chat conversations
- `id` (UUID, PK): Chat ID
- `name` (text): Chat name (null for one-on-one chats)
- `is_group` (boolean): Whether it's a group chat
- `created_at` (timestamp): Chat creation time
- `updated_at` (timestamp): Last update time

### `chat_members`
Stores chat membership information
- `id` (UUID, PK): Membership ID
- `chat_id` (UUID, FK): Reference to chats
- `profile_id` (UUID, FK): Reference to profiles
- `is_admin` (boolean): Whether user is admin
- `joined_at` (timestamp): When user joined

### `messages`
Stores chat messages
- `id` (UUID, PK): Message ID
- `chat_id` (UUID, FK): Reference to chats
- `sender_id` (UUID, FK): Reference to profiles
- `content` (text): Message content
- `attachment_url` (text): URL to attachment
- `attachment_type` (text): Type of attachment
- `is_read` (bool): Type of attachment
- `created_at` (timestamp): Message creation time
- - `updated_at` (timestamp): Last update time


### `message_reads`
Tracks message read status
- `id` (UUID, PK): Read record ID
- `message_id` (UUID, FK): Reference to messages
- `profile_id` (UUID, FK): Reference to profiles
- `read_at` (timestamp): When message was read

### `chat_labels`
Stores user-defined chat labels
- `id` (UUID, PK): Label ID
- `profile_id` (UUID, FK): Reference to profiles
- `name` (text): Label name
- `color` (text): Label color
- `created_at` (timestamp): Label creation time

### `chat_label_assignments`
Assigns labels to chats
- `id` (UUID, PK): Assignment ID
- `chat_id` (UUID, FK): Reference to chats
- `label_id` (UUID, FK): Reference to chat_labels
- `profile_id` (UUID, FK): Reference to profiles
- `created_at` (timestamp): Assignment creation time

## File Structure

```
messenger-chatapp/
├── docs/                      # Documentation
│   ├── database_schema.md     # Database schema details
├── public/                    # Static assets
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (chat)/            # Chat routes (protected)
│   │   │   ├── chat/[id]/     # Individual chat view
│   │   │   ├── new-chat/      # Create new chat
│   │   │   ├── settings/      # User settings
│   │   │   ├── layout.tsx     # Chat layout
│   │   │   └── page.tsx       # Chat home page
│   │   ├── api/               # API routes
│   │   │   └── auth/          # Auth API routes
│   │   ├── auth/              # Auth routes
│   │   │   ├── login/         # Login page
│   │   │   └── signup/        # Signup page
│   │   ├── globals.css        # Global styles
│   │   └── layout.tsx         # Root layout
│   ├── lib/                   # Library code
│   │   ├── components/        # React components
│   │   │   ├── attachments/   # Attachment components
│   │   │   ├── auth/          # Auth components
│   │   │   ├── chat/          # Chat components
│   │   │   ├── layout/        # Layout components
│   │   │   └── presence/      # Presence components
│   │   ├── context/           # React context providers
│   │   ├── supabase/          # Supabase client
│   │   └── types/             # TypeScript types
└── package.json               # Dependencies and scripts
```

## Setup Instructions

### Prerequisites
- Node.js (v16 or later)
- npm or yarn
- Supabase account

### Supabase Setup
1. Create a new Supabase project
2. Execute the SQL commands from `docs/database_schema.md` to set up tables and functions
3. Create a storage bucket named `chat_attachments`
4. Get your Supabase URL and anon key from Project Settings > API

### Local Development
1. Clone the repository
   ```bash
   git clone <repo link>
   cd messenger-chatapp
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file with your Supabase credentials
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Future Enhancements

### AI Integration
- **Smart Replies**: Implement AI-powered suggested responses
- **Message Summarization**: Summarize long conversations
- **Content Moderation**: Automatically detect and filter inappropriate content
- **Language Translation**: Real-time translation of messages
- **Voice Transcription**: Convert voice messages to text

### Performance Optimizations
- Implement virtual scrolling for large chat histories
- Add message pagination for better performance
- Optimize image loading with progressive loading
- Implement service workers for offline functionality
- Add WebRTC for direct peer-to-peer messaging

### Additional Features
- Voice and video calling
- End-to-end encryption
- Message reactions and replies
- Self-destructing messages
- Push notifications
- Dark mode support
- Message search within conversations
- Multi-device synchronization

## Limitations and Challenges

### Current Limitations
- No end-to-end encryption for messages
- Limited to text and basic file attachments
- No voice or video calling functionality
- No push notifications for mobile devices
- Limited offline functionality
- No message search within conversations

### Technical Challenges
- **Realtime Synchronization**: Ensuring consistent message ordering across clients
- **Scalability**: Managing large numbers of concurrent connections
- **Attachment Handling**: Efficiently storing and serving media files
- **Presence Management**: Accurately tracking online/offline status
- **Mobile Responsiveness**: Ensuring good UX across device sizes



## Acknowledgements

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)

## Contact

For questions or support, reach out to [Rishabh Maurya](mailto:rishabhmaurya7654@gmail.com).

