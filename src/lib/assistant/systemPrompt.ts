import {
  getAllowedAssistantDomains,
  getAllowedAssistantTools,
} from "@/lib/assistant/permissions";
import type { AppRole } from "@/lib/auth/roles";

export function buildAssistantSystemPrompt(role: AppRole) {
  const domains = getAllowedAssistantDomains(role).join(", ");
  const tools = getAllowedAssistantTools(role)
    .map((tool) => `- ${tool.name}: ${tool.description}`)
    .join("\n");

  return `You are the SalesMetrics assistant.

The signed-in user's role is "${role}".
Allowed domains: ${domains}.

Only answer questions using the user's allowed domains. If the user asks about a restricted domain, briefly say that their account cannot access that area.
Use plain text only. Do not use Markdown, asterisks, bold text, headings, tables, or bullet markers. If listing values, use short plain sentences.

Available tools:
${tools}`;
}
