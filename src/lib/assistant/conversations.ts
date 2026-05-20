import type { SupabaseClient } from "@supabase/supabase-js";

export type StoredAssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type ConversationRow = {
  id: string;
};

type MessageRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export async function getOrCreateAssistantConversation(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data: existing, error: existingError } = await supabase
    .from("assistant_conversations")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<ConversationRow>();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return existing.id;
  }

  const { data: created, error: createError } = await supabase
    .from("assistant_conversations")
    .insert({ user_id: userId })
    .select("id")
    .single<ConversationRow>();

  if (createError || !created) {
    throw new Error(createError?.message ?? "Failed to create assistant conversation.");
  }

  return created.id;
}

export async function listAssistantMessages(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("assistant_messages")
    .select("id,role,content,created_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as MessageRow[]).map<StoredAssistantMessage>((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }));
}

export async function addAssistantMessage(
  supabase: SupabaseClient,
  input: {
    conversationId: string;
    userId: string;
    role: "user" | "assistant";
    content: string;
    toolCalls?: unknown;
  },
) {
  const { data, error } = await supabase
    .from("assistant_messages")
    .insert({
      conversation_id: input.conversationId,
      user_id: input.userId,
      role: input.role,
      content: input.content,
      tool_calls: input.toolCalls ?? null,
    })
    .select("id,role,content,created_at")
    .single<MessageRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to store assistant message.");
  }

  await supabase
    .from("assistant_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.conversationId)
    .eq("user_id", input.userId);

  return {
    id: data.id,
    role: data.role,
    content: data.content,
    createdAt: data.created_at,
  } satisfies StoredAssistantMessage;
}
