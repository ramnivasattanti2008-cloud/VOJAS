/**
 * AI Provider Abstraction for VOJAS.
 *
 * Allows swapping the underlying LLM provider without changing call sites.
 * Per VOJAS policy: "AI must operate over real evidence. Do not use AI to
 * manufacture missing facts."
 *
 * ── Provider options ──────────────────────────────────────────────────────────
 *
 *  OPENAI (default)   — Paid per token. Set OPENAI_API_KEY in backend/.env.
 *  GROQ                — Free tier for open models (Llama 3, Mixtral).
 *                       Set GROQ_API_KEY. No credit card needed.
 *  OLLAMA_LOCAL        — Fully free, runs locally (Ollama app). Set OLLAMA_BASE_URL.
 *                       No API key needed. Good for offline dev / demos.
 *
 * Set the provider via AI_PROVIDER=openai|groq|ollama in backend/.env.
 * Each provider returns the same interface so call sites never change.
 *
 * ── Adding a new provider ────────────────────────────────────────────────────
 *
 *  1. Add the provider name to AiProvider type.
 *  2. Implement the providerConfig function (returns base URL + headers).
 *  3. Add the provider branch in ai() below.
 *  4. Add AI_PROVIDER=<name> to backend/.env.example and .env.template.
 */

export type AiProvider = "openai" | "groq" | "ollama";

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface ProviderConfig {
  baseUrl: string;
  headers: Record<string, string>;
}

function providerConfig(provider: AiProvider): ProviderConfig {
  switch (provider) {
    case "openai":
      return {
        baseUrl: "https://api.openai.com/v1",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      };
    case "groq":
      // Groq free tier: 30 requests/min, 14k context, open models (Llama 3, Mixtral)
      return {
        baseUrl: "https://api.groq.com/openai/v1",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      };
    case "ollama":
      // Ollama runs locally — default port 11434, no API key required.
      return {
        baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
        headers: { "Content-Type": "application/json" },
      };
  }
}

function providerModel(provider: AiProvider, model?: string): string {
  if (model) return model;
  switch (provider) {
    case "openai":  return "gpt-4o-mini";
    case "groq":    return "llama-3.1-8b-instant";  // Groq free tier default
    case "ollama":  return process.env.OLLAMA_MODEL ?? "llama3.2";
  }
}

/**
 * Core AI call. Takes messages + optional overrides, returns the assistant's
 * text reply. Call sites never need to know which provider is configured.
 */
export async function ai(
  messages: AiMessage[],
  options: AiOptions = {}
): Promise<string> {
  const provider = (process.env.AI_PROVIDER ?? "openai") as AiProvider;
  const config = providerConfig(provider);
  const model = providerModel(provider, options.model);

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.3, // Low temp for factual evidence tasks
    max_tokens: options.maxTokens ?? 1024,
  };

  // Ollama uses a slightly different API shape
  if (provider === "ollama") {
    body.stream = false;
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: config.headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "unknown");
    throw new Error(
      `AI provider '${provider}' returned ${response.status}: ${detail}`
    );
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    message?: { content?: string };
    error?: { message?: string };
  };

  // Ollama returns a different shape
  if (provider === "ollama") {
    return (data as { message?: { content?: string } }).message?.content ?? "";
  }

  const content =
    data.choices?.[0]?.message?.content ??
    (data as { message?: { content?: string } }).message?.content ??
    "";

  return content;
}

/**
 * Thin wrapper for AI-powered anomaly evidence generation.
 * Per VOJAS policy: "AI must operate over real evidence. Do not manufacture facts."
 *
 * @param anomalyDescription - The raw anomaly record (real data, not fabricated)
 * @param relatedProjects    - Real project records associated with this anomaly
 */
export async function generateAnomalyEvidence(
  anomalyDescription: string,
  relatedProjects: Array<{ name: string; amount: number; date: string }>
): Promise<string> {
  const systemPrompt = `You are a financial audit assistant for VOJAS, an Indian MPLAD accountability platform.
You receive real government project records. NEVER fabricate figures, dates, or names.
If evidence is insufficient, say "Insufficient evidence to draw a conclusion."
Keep responses factual, concise, and grounded in the provided data.`;

  const projectSummary = relatedProjects
    .map((p) => `- ${p.name}: ₹${p.amount.toLocaleString("en-IN")} (${p.date})`)
    .join("\n");

  const messages: AiMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Analyze this anomaly and provide supporting evidence from the related projects:\n\nAnomaly: ${anomalyDescription}\n\nRelated projects:\n${projectSummary}`,
    },
  ];

  return ai(messages, { temperature: 0.2, maxTokens: 512 });
}
