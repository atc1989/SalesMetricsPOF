import { NextRequest, NextResponse } from "next/server";
import {
  FunctionCallingConfigMode,
  GoogleGenAI,
  type Content,
  type FunctionCall,
} from "@google/genai";
import OpenAI from "openai";
import type {
  ResponseFunctionToolCall,
  ResponseInput,
  ResponseOutputItem,
} from "openai/resources/responses/responses";

import {
  addAssistantMessage,
  getOrCreateAssistantConversation,
  listAssistantMessages,
} from "@/lib/assistant/conversations";
import {
  checkAssistantMessageAccess,
  getAllowedAssistantDomains,
  getAllowedAssistantTools,
} from "@/lib/assistant/permissions";
import { buildAssistantSystemPrompt } from "@/lib/assistant/systemPrompt";
import {
  getGeminiAssistantTools,
  getOpenAIAssistantTools,
  runAssistantTool,
  runAssistantToolByName,
} from "@/lib/assistant/tools";
import { requireRouteAccess } from "@/lib/auth/routeGuard";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AssistantRequestBody = {
  message?: unknown;
};

function getMessage(body: AssistantRequestBody) {
  return typeof body.message === "string" ? body.message.trim() : "";
}

function getManilaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isFunctionCall(item: ResponseOutputItem): item is ResponseFunctionToolCall {
  return item.type === "function_call";
}

function getFunctionCalls(output: ResponseOutputItem[]) {
  return output.filter(isFunctionCall);
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new GoogleGenAI({ apiKey });
}

function getAIProvider() {
  return process.env.AI_PROVIDER === "gemini" ? "gemini" : "openai";
}

function getGeminiCallName(call: FunctionCall) {
  return typeof call.name === "string" ? call.name : "";
}

function cleanAssistantAnswer(value: string) {
  return value
    .replace(/\*\*/g, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildInstructions(role: "super_admin" | "sales" | "operations") {
  return `${buildAssistantSystemPrompt(role)}

Today is ${getManilaDate()} in Asia/Manila.
Use tools for live SalesMetrics data. Do not guess counts, totals, statuses, or dates.
When answering, mention the date range used. Keep the answer concise and practical.
Return plain text only. Do not use Markdown formatting.`;
}

export async function GET(request: NextRequest) {
  const { response, auth } = await requireRouteAccess(request);
  if (response) return response;
  const supabase = getSupabaseAdminClient();
  const conversationId = await getOrCreateAssistantConversation(supabase, auth.userId);
  const messages = await listAssistantMessages(supabase, conversationId, auth.userId);

  return NextResponse.json({
    success: true,
    role: auth.role,
    allowedDomains: getAllowedAssistantDomains(auth.role),
    allowedTools: getAllowedAssistantTools(auth.role),
    provider: getAIProvider(),
    modelConfigured:
      getAIProvider() === "gemini"
        ? Boolean(process.env.GEMINI_API_KEY)
        : Boolean(process.env.OPENAI_API_KEY),
    model:
      getAIProvider() === "gemini"
        ? process.env.GEMINI_MODEL ?? "gemini-2.5-flash"
        : process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    conversationId,
    messages,
  });
}

export async function POST(request: NextRequest) {
  const { response, auth } = await requireRouteAccess(request);
  if (response) return response;

  const body = (await request.json().catch(() => ({}))) as AssistantRequestBody;
  const message = getMessage(body);

  if (!message) {
    return NextResponse.json(
      { success: false, message: "Message is required." },
      { status: 400 },
    );
  }

  const access = checkAssistantMessageAccess(auth.role, message);
  if (!access.allowed) {
    return NextResponse.json(
      {
        success: false,
        message: "Your account cannot ask the assistant about that area.",
        role: auth.role,
        allowedDomains: access.allowedDomains,
        deniedDomains: access.deniedDomains,
      },
      { status: 403 },
    );
  }

  const provider = getAIProvider();

  if (provider === "gemini") {
    const client = getGeminiClient();
    if (!client) {
      return NextResponse.json(
        {
          success: false,
          message: "GEMINI_API_KEY is not configured.",
        },
        { status: 500 },
      );
    }

    try {
      const supabase = getSupabaseAdminClient();
      const conversationId = await getOrCreateAssistantConversation(
        supabase,
        auth.userId,
      );
      await addAssistantMessage(supabase, {
        conversationId,
        userId: auth.userId,
        role: "user",
        content: message,
      });

      const answer = await runGeminiAssistant({
        client,
        role: auth.role,
        message,
        instructions: buildInstructions(auth.role),
      });
      const cleanAnswer = cleanAssistantAnswer(answer.answer);
      await addAssistantMessage(supabase, {
        conversationId,
        userId: auth.userId,
        role: "assistant",
        content: cleanAnswer,
        toolCalls: answer.toolCalls,
      });

      return NextResponse.json({
        success: true,
        role: auth.role,
        provider,
        conversationId,
        answer: cleanAnswer,
        toolCalls: answer.toolCalls,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown assistant error.";

      return NextResponse.json(
        {
          success: false,
          message,
        },
        { status: 500 },
      );
    }
  }

  const client = getOpenAIClient();
  if (!client) {
    return NextResponse.json(
      {
        success: false,
        message: "OPENAI_API_KEY is not configured.",
      },
      { status: 500 },
    );
  }

  const instructions = buildInstructions(auth.role);

  try {
    const supabase = getSupabaseAdminClient();
    const conversationId = await getOrCreateAssistantConversation(
      supabase,
      auth.userId,
    );
    await addAssistantMessage(supabase, {
      conversationId,
      userId: auth.userId,
      role: "user",
      content: message,
    });

    const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
    const tools = getOpenAIAssistantTools(auth.role);
    const input: ResponseInput = [
      {
        role: "user",
        content: message,
      },
    ];

    const firstResponse = await client.responses.create({
      model,
      instructions,
      input,
      tools,
      tool_choice: "auto",
      parallel_tool_calls: false,
      max_output_tokens: 900,
    });

    const functionCalls = getFunctionCalls(firstResponse.output);
    if (functionCalls.length === 0) {
      const cleanAnswer = cleanAssistantAnswer(firstResponse.output_text);
      await addAssistantMessage(supabase, {
        conversationId,
        userId: auth.userId,
        role: "assistant",
        content: cleanAnswer,
      });

      return NextResponse.json({
        success: true,
        role: auth.role,
        provider,
        conversationId,
        answer: cleanAnswer,
        toolCalls: [],
      });
    }

    const toolOutputs = await Promise.all(
      functionCalls.map(async (call) => {
        const result = await runAssistantTool(supabase, auth.role, call);
        return {
          type: "function_call_output" as const,
          call_id: call.call_id,
          output: JSON.stringify(result),
        };
      }),
    );

    const finalInput: ResponseInput = [
      ...input,
      ...functionCalls,
      ...toolOutputs,
    ];

    const finalResponse = await client.responses.create({
      model,
      instructions,
      input: finalInput,
      tools,
      tool_choice: "none",
      max_output_tokens: 900,
    });

    const cleanAnswer = cleanAssistantAnswer(finalResponse.output_text);
    const toolCalls = functionCalls.map((call) => ({
      name: call.name,
      arguments: call.arguments,
    }));

    await addAssistantMessage(supabase, {
      conversationId,
      userId: auth.userId,
      role: "assistant",
      content: cleanAnswer,
      toolCalls,
    });

    return NextResponse.json({
      success: true,
      role: auth.role,
      provider,
      conversationId,
      answer: cleanAnswer,
      toolCalls,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown assistant error.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}

async function runGeminiAssistant({
  client,
  role,
  message,
  instructions,
}: {
  client: GoogleGenAI;
  role: "super_admin" | "sales" | "operations";
  message: string;
  instructions: string;
}) {
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const tools = getGeminiAssistantTools(role);

  const firstResponse = await client.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: message }] }],
    config: {
      systemInstruction: instructions,
      tools: [{ functionDeclarations: tools }],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.AUTO,
        },
      },
      maxOutputTokens: 900,
    },
  });

  const functionCalls = firstResponse.functionCalls ?? [];
  if (functionCalls.length === 0) {
    return {
      answer: firstResponse.text ?? "",
      toolCalls: [],
    };
  }

  const supabase = getSupabaseAdminClient();
  const toolResponseParts = await Promise.all(
    functionCalls.map(async (call) => {
      const name = getGeminiCallName(call);
      const result = await runAssistantToolByName(
        supabase,
        role,
        name,
        call.args ?? {},
      );

      return {
        functionResponse: {
          id: call.id,
          name,
          response: { output: result },
        },
      };
    }),
  );

  const contents: Content[] = [
    { role: "user", parts: [{ text: message }] },
    {
      role: "model",
      parts: functionCalls.map((call) => ({ functionCall: call })),
    },
    {
      role: "user",
      parts: toolResponseParts,
    },
  ];

  const finalResponse = await client.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: instructions,
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.NONE,
        },
      },
      maxOutputTokens: 900,
    },
  });

  return {
    answer: finalResponse.text ?? "",
    toolCalls: functionCalls.map((call) => ({
      name: call.name,
      arguments: call.args ?? {},
    })),
  };
}
