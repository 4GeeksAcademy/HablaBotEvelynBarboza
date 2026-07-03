import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

type IncomingMessage = {
  role?: string;
  text?: string;
  content?: string;
};

type GroqUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

type GroqResponse = {
  model?: string;
  usage?: GroqUsage;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const FALLBACK_MODEL = "llama-3.1-8b-instant";
const KNOWLEDGE_FILE_PATH = path.join(
  process.cwd(),
  "conocimiento",
  "conocimiento.txt"
);

type OutgoingMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

async function loadKnowledgeContext() {
  try {
    const fileContent = await readFile(KNOWLEDGE_FILE_PATH, "utf8");
    const normalized = fileContent.trim();
    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
}

const knowledgeContextPromise = loadKnowledgeContext();

const SYSTEM_INSTRUCTIONS =
  "Eres el asistente oficial de esta aplicacion.\n\n" +
  "Dispones de una base de conocimiento oficial que debes utilizar como fuente principal de informacion.\n\n" +
  "Cuando el usuario haga preguntas relacionadas con la aplicacion, sus funcionalidades o cualquier informacion presente en la base de conocimiento, debes responder utilizando exclusivamente esa informacion.\n\n" +
  "No inventes datos.\n\n" +
  "Si la informacion solicitada no aparece en la base de conocimiento, indicalo claramente y no supongas respuestas.\n\n" +
  "Solo cuando la pregunta no tenga relacion con la base de conocimiento puedes responder utilizando tu conocimiento general.";

function normalizeRole(role: string): OutgoingMessage["role"] {
  if (role === "ai") {
    return "assistant";
  }

  if (role === "assistant" || role === "system") {
    return role;
  }

  return "user";
}

function toSafeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || FALLBACK_MODEL;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta configurar GROQ_API_KEY en el servidor." },
      { status: 500 }
    );
  }

  let parsedBody: { messages?: IncomingMessage[] };

  try {
    parsedBody = (await request.json()) as { messages?: IncomingMessage[] };
  } catch {
    return NextResponse.json(
      { error: "JSON invalido en el cuerpo de la solicitud." },
      { status: 400 }
    );
  }

  const incomingMessages = Array.isArray(parsedBody.messages)
    ? parsedBody.messages
    : [];

  const messages: OutgoingMessage[] = incomingMessages
    .map((message) => {
      const content = (message.content ?? message.text ?? "").trim();

      return {
        role: normalizeRole((message.role ?? "user").toLowerCase()),
        content,
      };
    })
    .filter((message) => message.content.length > 0);

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "Debes enviar al menos un mensaje en el historial." },
      { status: 400 }
    );
  }

  const startedAt = Date.now();

  try {
    const knowledgeContext = await knowledgeContextPromise;
    const messagesWithContext = knowledgeContext
      ? [
          {
            role: "system",
            content: `${SYSTEM_INSTRUCTIONS}\n\nBase de conocimiento oficial:\n${knowledgeContext}`,
          },
          ...messages,
        ]
      : messages;

    const groqResponse = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messagesWithContext,
      }),
    });

    const responseTimeMs = Date.now() - startedAt;

    if (!groqResponse.ok) {
      const errorPayload = await groqResponse.text();
      return NextResponse.json(
        {
          error: "Error al consultar Groq.",
          detail: errorPayload,
        },
        { status: groqResponse.status }
      );
    }

    const groqData = (await groqResponse.json()) as GroqResponse;
    const responseText = groqData.choices?.[0]?.message?.content?.trim() ?? "";
    const promptTokens = toSafeNumber(groqData.usage?.prompt_tokens);
    const completionTokens = toSafeNumber(groqData.usage?.completion_tokens);
    const totalTokens =
      toSafeNumber(groqData.usage?.total_tokens) || promptTokens + completionTokens;

    const tokensPerSecond =
      completionTokens > 0 && responseTimeMs > 0
        ? Number((completionTokens / (responseTimeMs / 1000)).toFixed(2))
        : null;

    return NextResponse.json({
      response: responseText,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
      },
      model: groqData.model || model,
      responseTimeMs,
      tokensPerSecond,
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo completar la solicitud a Groq." },
      { status: 500 }
    );
  }
}
