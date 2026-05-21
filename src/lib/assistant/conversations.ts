import type { SupabaseClient } from "@supabase/supabase-js";

export type StoredAssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type StoredAssistantConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

type ConversationRow = {
  id: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
};

type MessageRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

function createConversationTitle(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "New chat";
  }

  return normalized.length > 64 ? `${normalized.slice(0, 61)}...` : normalized;
}

export async function getOrCreateAssistantConversation(
  supabase: SupabaseClient,
  userId: string,
  conversationId?: string | null,
) {
  if (conversationId) {
    const { data: selected, error: selectedError } = await supabase
      .from("assistant_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle<ConversationRow>();

    if (selectedError) {
      throw new Error(selectedError.message);
    }

    if (selected) {
      return selected.id;
    }
  }

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

export async function createAssistantConversation(
  supabase: SupabaseClient,
  userId: string,
  title = "New chat",
) {
  const { data, error } = await supabase
    .from("assistant_conversations")
    .insert({ user_id: userId, title })
    .select("id,title,created_at,updated_at")
    .single<ConversationRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create assistant conversation.");
  }

  return {
    id: data.id,
    title: data.title ?? title,
    createdAt: data.created_at ?? "",
    updatedAt: data.updated_at ?? "",
  } satisfies StoredAssistantConversation;
}

export async function listAssistantConversations(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("assistant_conversations")
    .select("id,title,created_at,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(25);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ConversationRow[]).map<StoredAssistantConversation>(
    (row) => ({
      id: row.id,
      title: row.title ?? "SalesMetrics AI",
      createdAt: row.created_at ?? "",
      updatedAt: row.updated_at ?? "",
    }),
  );
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

  if (input.role === "user") {
    await supabase
      .from("assistant_conversations")
      .update({ title: createConversationTitle(input.content) })
      .eq("id", input.conversationId)
      .eq("user_id", input.userId)
      .in("title", ["SalesMetrics AI", "New chat"]);
  }

  return {
    id: data.id,
    role: data.role,
    content: data.content,
    createdAt: data.created_at,
  } satisfies StoredAssistantMessage;
}
