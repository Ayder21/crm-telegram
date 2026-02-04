-- Add status column to conversations (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='conversations' AND column_name='status') THEN
        ALTER TABLE public.conversations 
        ADD COLUMN status text DEFAULT 'new' CHECK (status IN ('new', 'interested', 'waiting_call', 'scheduled', 'closed_won', 'closed_lost'));
    END IF;
END $$;

-- Add knowledge_base_url to integrations (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='integrations' AND column_name='knowledge_base_url') THEN
        ALTER TABLE public.integrations
        ADD COLUMN knowledge_base_url text;
    END IF;
END $$;

-- Add bot_token_encrypted to integrations (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='integrations' AND column_name='bot_token_encrypted') THEN
        ALTER TABLE public.integrations
        ADD COLUMN bot_token_encrypted text;
    END IF;
END $$;

-- Create indexes (if not exists)
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_integration_id ON public.conversations(integration_id);

-- Update existing conversations to have 'new' status
UPDATE public.conversations SET status = 'new' WHERE status IS NULL;
