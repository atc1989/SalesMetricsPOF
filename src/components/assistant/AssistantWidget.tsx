"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BotIcon,
  ExpandIcon,
  LoaderCircleIcon,
  MessageCircleIcon,
  Minimize2Icon,
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
  message?: string;
};

type AssistantHistoryResponse = {
  success: boolean;
  messages?: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
  }>;
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
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);

  const canUseAssistant = profile?.role === "super_admin";
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
        body: JSON.stringify({ message: content }),
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

          <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-12 sm:px-8">
            <div className="flex flex-1 flex-col justify-center gap-12">
              <div className="flex flex-col items-center gap-5 text-center">
                <SparklesIcon className="size-8 text-foreground" />
                <h1 className="text-2xl font-normal tracking-normal text-foreground">
                  Ask our AI anything
                </h1>
              </div>

              <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
                {!hasMessages ? (
                  <div className="flex flex-col gap-4">
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
                  <ScrollArea className="h-[48vh] rounded-md border bg-muted/30 p-4">
                    <div className="flex flex-col gap-4">
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
