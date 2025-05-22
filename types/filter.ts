export type FilterCriteria = {
  unread?: boolean;
  is_group?: boolean | 'one_on_one'; // Use 'one_on_one' for clarity in UI
  labels?: string[]; // array of label_id
  label_match_type?: 'any' | 'all';
  chat_name_contains?: string;
  other_participant_name_contains?: string; // For 1-on-1 chats if chat.name is the other user
  has_attachments?: boolean; // Check last_message for attachment
};

// This interface represents a filter object stored on the client
export interface ClientChatFilter {
  id: string; // Client-generated unique ID (e.g., using uuid or timestamp)
  name: string;
  criteria: FilterCriteria;
}