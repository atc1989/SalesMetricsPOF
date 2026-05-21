"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BotIcon,
  HistoryIcon,
  ExpandIcon,
  LoaderCircleIcon,
  MessageCircleIcon,
  Minimize2Icon,
  PlusIcon,
  SendIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils";

type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type AssistantApiResponse = {
  success: boolean;
  answer?: string;
  conversationId?: string;
  message?: string;
};

type AssistantHistoryResponse = {
  success: boolean;
  conversationId?: string;
  conversations?: AssistantConversation[];
  messages?: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
  }>;
};

type AssistantConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

const compactSuggestions = [
  "How many bottles were released today?",
  "How many sales were made today?",
  "What can I ask you to do?",
];

const fullscreenSuggestions = [
  "What can I ask you to do?",
  "How many bottles were released today?",
  "Which reports should I review right now?",
];

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function AssistantMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-full",
        className,
      )}
    >
      <BotIcon />
    </div>
  );
}

function TypingDots() {
  return (
    <div className="bg-muted flex w-fit items-center gap-1 rounded-lg px-3 py-2">
      <span className="bg-muted-foreground/35 size-2 rounded-full" />
      <span className="bg-muted-foreground/35 size-2 rounded-full" />
      <span className="bg-muted-foreground/35 size-2 rounded-full" />
    </div>
  );
}

function formatConversationDate(value: string) {
  if (!value) {
    return "No messages yet";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function MessageBubble({ message }: { message: AssistantMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      <span className="px-1 text-[10px] font-medium uppercase tracking-normal text-muted-foreground">
        {isUser ? "Me" : "Our AI"}
      </span>
      <div
        className={cn(
          "max-w-[82%] rounded-lg px-3 py-2 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "border bg-card text-card-foreground",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

function AssistantConversationSidebar({
  conversations,
  activeConversationId,
  isSending,
  onNewChat,
  onSelectConversation,
}: {
  conversations: AssistantConversation[];
  activeConversationId: string | null;
  isSending: boolean;
  onNewChat: () => void;
  onSelectConversation: (conversationId: string) => void;
}) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b bg-muted/35 md:h-screen md:w-72 md:border-r md:border-b-0">
      <div className="flex items-center gap-3 border-b px-4 py-4">
        <AssistantMark className="size-9 bg-background text-foreground" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">SalesMetrics AI</p>
          <p className="truncate text-xs text-muted-foreground">Conversation history</p>
        </div>
      </div>

      <div className="border-b p-3">
        <Button
          type="button"
          className="w-full justify-start gap-2"
          variant="outline"
          disabled={isSending}
          onClick={onNewChat}
        >
          <PlusIcon className="size-4" />
          New chat
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            Recents
          </p>
          <span className="text-xs text-muted-foreground">{conversations.length}</span>
        </div>

        <ScrollArea className="h-40 md:h-[calc(100vh-11rem)]">
          <div className="flex flex-col gap-1 pr-2">
            {conversations.length > 0 ? (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  aria-pressed={conversation.id === activeConversationId}
                  className={cn(
                    "group rounded-md px-3 py-2 text-left transition-colors hover:bg-background",
                    conversation.id === activeConversationId
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground",
                  )}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <span className="block truncate text-sm font-medium text-foreground">
                    {conversation.title}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {formatConversationDate(conversation.updatedAt)}
                  </span>
                </button>
              ))
            ) : (
              <div className="rounded-md border border-dashed bg-background/60 px-3 py-4 text-sm text-muted-foreground">
                Previous chats will appear here.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}

function AssistantInput({
  value,
  placeholder,
  disabled,
  onChange,
  onSubmit,
  className,
}: {
  value: string;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  className?: string;
}) {
  return (
    <form
      className={cn(
        "border-input bg-background flex min-h-14 items-center gap-2 rounded-md border px-3 py-2 shadow-sm",
        className,
      )}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Textarea
        aria-label="Ask AI"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        className="min-h-9 flex-1 border-0 bg-transparent px-0 py-2 text-sm shadow-none focus-visible:ring-0"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
        }}
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className="size-10 rounded-full"
      >
        {disabled ? <LoaderCircleIcon className="animate-spin" /> : <SendIcon />}
      </Button>
    </form>
  );
}

export function AssistantWidget() {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const canUseAssistant = Boolean(profile?.isActive);
  const hasMessages = messages.length > 0;

  const welcomeMessage = useMemo<AssistantMessage>(
    () => ({
      id: "welcome",
      role: "assistant",
      content:
        "Ask me about SalesMetrics reports, sales, released bottles, inventory movement, bills, PCF, or event forms.",
    }),
    [],
  );

  useEffect(() => {
    if (!canUseAssistant || hasLoadedHistory) return;

    let isMounted = true;
    fetch("/api/assistant")
      .then((response) => response.json())
      .then((payload: AssistantHistoryResponse) => {
        if (!isMounted || !payload.success || !payload.messages) return;
        setConversationId(payload.conversationId ?? null);
        setConversations(payload.conversations ?? []);
        setMessages(
          payload.messages.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
          })),
        );
      })
      .catch(() => {
        // History is helpful but not required for the assistant to work.
      })
      .finally(() => {
        if (!isMounted) return;
        setHasLoadedHistory(true);
      });

    return () => {
      isMounted = false;
    };
  }, [canUseAssistant, hasLoadedHistory]);

  async function loadConversation(nextConversationId?: string) {
    const search = nextConversationId
      ? `?conversationId=${encodeURIComponent(nextConversationId)}`
      : "";
    const response = await fetch(`/api/assistant${search}`);
    const payload = (await response.json()) as AssistantHistoryResponse;

    if (!payload.success) return;
    setConversationId(payload.conversationId ?? nextConversationId ?? null);
    setConversations(payload.conversations ?? []);
    setMessages(
      (payload.messages ?? []).map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
      })),
    );
  }

  async function startNewChat() {
    if (isSending) return;
    const response = await fetch("/api/assistant?action=new");
    const payload = (await response.json()) as AssistantHistoryResponse;

    if (!payload.success) return;
    setConversationId(payload.conversationId ?? null);
    setConversations(payload.conversations ?? []);
    setMessages([]);
    setDraft("");
    setShowHistory(false);
  }

  if (!canUseAssistant) {
    return null;
  }

  async function sendMessage(nextMessage?: string) {
    const content = (nextMessage ?? draft).trim();
    if (!content || isSending) return;

    setDraft("");

    const userMessage: AssistantMessage = {
      id: createMessageId(),
      role: "user",
      content,
    };

    setMessages((current) => [...current, userMessage]);
    setIsSending(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, conversationId }),
      });
      const payload = (await response.json()) as AssistantApiResponse;

      const answer =
        payload.success && payload.answer
          ? payload.answer
          : payload.message ?? "The assistant could not answer that request.";

      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          content: answer,
        },
      ]);
      if (payload.conversationId) {
        setConversationId(payload.conversationId);
      }
      void loadConversation(payload.conversationId ?? conversationId ?? undefined);
    } catch (error) {
      const answer =
        error instanceof Error
          ? error.message
          : "The assistant could not reach the server.";

      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          content: answer,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handleDraftChange(value: string) {
    setDraft(value);
  }

  function openCompact() {
    setIsOpen(true);
    setIsFullscreen(false);
  }

  function closeAll() {
    setIsOpen(false);
    setIsFullscreen(false);
  }

  return (
    <>
      {isOpen && !isFullscreen ? (
        <div className="fixed right-5 bottom-24 z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-card text-card-foreground shadow-2xl">
          <div className="border-b bg-muted/70 px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <AssistantMark className="bg-background text-foreground" />
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="New chat"
                  onClick={startNewChat}
                >
                  <PlusIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Show chat history"
                  onClick={() => setShowHistory((current) => !current)}
                >
                  <HistoryIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Expand assistant"
                  onClick={() => setIsFullscreen(true)}
                >
                  <ExpandIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close assistant"
                  onClick={closeAll}
                >
                  <XIcon />
                </Button>
              </div>
            </div>
            {showHistory ? (
              <div className="mt-4 flex max-h-28 flex-col gap-1 overflow-auto rounded-md border bg-background p-1">
                {conversations.length > 0 ? (
                  conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      className={cn(
                        "rounded-sm px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted",
                        conversation.id === conversationId && "bg-muted",
                      )}
                      onClick={() => {
                        void loadConversation(conversation.id);
                        setShowHistory(false);
                      }}
                    >
                      <span className="block truncate font-medium">
                        {conversation.title}
                      </span>
                      <span className="block truncate text-muted-foreground">
                        {conversation.updatedAt
                          ? new Date(conversation.updatedAt).toLocaleString()
                          : "No date"}
                      </span>
                    </button>
                  ))
                ) : (
                  <span className="px-2 py-1.5 text-xs text-muted-foreground">
                    No previous chats
                  </span>
                )}
              </div>
            ) : null}
            <div className="mt-4 flex flex-col gap-1">
              <h2 className="text-xl font-semibold tracking-normal">SalesMetrics AI</h2>
              <p className="text-sm text-muted-foreground">
                Ask questions about your live sales and operations data.
              </p>
            </div>
          </div>

          <ScrollArea className="h-80">
            <div className="flex flex-col gap-4 p-5">
              {!hasMessages ? <MessageBubble message={welcomeMessage} /> : null}
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isSending ? (
                <div className="flex flex-col gap-1">
                  <span className="px-1 text-[10px] font-medium uppercase tracking-normal text-muted-foreground">
                    Our AI
                  </span>
                  <TypingDots />
                </div>
              ) : null}
              {!hasMessages ? (
                <div className="flex flex-col gap-2">
                  {compactSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="rounded-md border bg-background px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted"
                      onClick={() => sendMessage(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </ScrollArea>

          <div className="border-t p-4">
            <AssistantInput
              value={draft}
              disabled={isSending}
              placeholder="Reply ..."
              onChange={handleDraftChange}
              onSubmit={() => sendMessage()}
            />
          </div>
        </div>
      ) : null}

      {isFullscreen ? (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Minimize assistant"
              onClick={() => {
                setIsOpen(true);
                setIsFullscreen(false);
              }}
            >
              <Minimize2Icon />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Close assistant"
              onClick={closeAll}
            >
              <XIcon />
            </Button>
          </div>

          <div className="flex min-h-screen flex-col md:flex-row">
            <AssistantConversationSidebar
              conversations={conversations}
              activeConversationId={conversationId}
              isSending={isSending}
              onNewChat={startNewChat}
              onSelectConversation={(nextConversationId) => {
                void loadConversation(nextConversationId);
              }}
            />

            <main className="flex min-h-0 min-w-0 flex-1 flex-col px-4 py-8 sm:px-8 md:h-screen md:py-14">
              <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-8">
                <div className="flex shrink-0 flex-col items-center gap-5 text-center">
                  <SparklesIcon className="size-8 text-foreground" />
                  <h1 className="text-2xl font-normal tracking-normal text-foreground">
                    Ask our AI anything
                  </h1>
                </div>

                <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-5">
                  {!hasMessages ? (
                    <div className="flex flex-1 flex-col justify-end gap-4">
                      <p className="text-sm font-semibold text-muted-foreground">
                        Suggestions on what to ask Our AI
                      </p>
                      <div className="grid gap-3 md:grid-cols-3">
                        {fullscreenSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            className="min-h-14 rounded-md border bg-background px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                            onClick={() => sendMessage(suggestion)}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <ScrollArea className="min-h-0 flex-1 px-1">
                      <div className="flex min-h-full flex-col gap-7 py-2">
                        {messages.map((message) => (
                          <MessageBubble key={message.id} message={message} />
                        ))}
                        {isSending ? (
                          <div className="flex flex-col gap-1">
                            <span className="px-1 text-[10px] font-medium uppercase tracking-normal text-muted-foreground">
                              Our AI
                            </span>
                            <TypingDots />
                          </div>
                        ) : null}
                      </div>
                    </ScrollArea>
                  )}

                  <AssistantInput
                    value={draft}
                    disabled={isSending}
                    placeholder="Ask me anything about your projects"
                    onChange={handleDraftChange}
                    onSubmit={() => sendMessage()}
                  />
                </div>
              </div>
            </main>
          </div>
        </div>
      ) : null}

      <Button
        type="button"
        size="icon"
        aria-label={isOpen ? "Close assistant" : "Open assistant"}
        className="fixed right-6 bottom-6 z-40 size-14 rounded-full shadow-2xl"
        onClick={() => {
          if (isOpen || isFullscreen) {
            closeAll();
          } else {
            openCompact();
          }
        }}
      >
        {isOpen || isFullscreen ? <XIcon /> : <MessageCircleIcon />}
      </Button>
    </>
  );
}
