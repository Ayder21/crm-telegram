
-- Create enum type for conversation status
CREATE TYPE conversation_status AS ENUM ('new', 'interested', 'waiting_call', 'scheduled', 'closed_won', 'closed_lost');

-- Add status column to conversations table with default value 'new'
ALTER TABLE conversations 
ADD COLUMN status conversation_status NOT NULL DEFAULT 'new';

-- Create index for faster filtering by status
CREATE INDEX idx_conversations_status ON conversations(status);
