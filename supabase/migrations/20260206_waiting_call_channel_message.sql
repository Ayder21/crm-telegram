ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS waiting_call_channel_message_id bigint;

ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS waiting_call_channel_chat_id text;
