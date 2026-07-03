"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Chat from "@/components/Chat";
import MetricsPanel, { type MetricItem } from "@/components/MetricsPanel";
import styles from "./page.module.css";
import type {
  ChatApiResponse,
  ChatMessage,
  TokenTotals,
  Usage,
} from "@/types/chat";

const STORAGE_MESSAGES_KEY = "groq-chat-messages";
const STORAGE_TOTALS_KEY = "groq-chat-token-totals";
const DEFAULT_MODEL = "llama-3.1-8b-instant";

const initialMessages: ChatMessage[] = [];

const initialTokenTotals: TokenTotals = {
  input: 0,
  output: 0,
  total: 0,
};

type LastResponseMetrics = {
  usage: Usage;
  model: string;
  responseTimeMs: number;
  tokensPerSecond: number | null;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-AR").format(value);
}

function isValidRole(role: unknown): role is ChatMessage["role"] {
  return role === "user" || role === "ai";
}

function parseStoredMessages(value: string | null): ChatMessage[] | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return null;
    }

    const messages: ChatMessage[] = [];

    for (const item of parsed) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const candidate = item as Partial<ChatMessage>;
      if (
        typeof candidate.id !== "string" ||
        !isValidRole(candidate.role) ||
        typeof candidate.text !== "string"
      ) {
        continue;
      }

      const bullets = Array.isArray(candidate.bullets)
        ? candidate.bullets.filter(
            (bullet): bullet is string => typeof bullet === "string"
          )
        : undefined;

      messages.push({
        id: candidate.id,
        role: candidate.role,
        text: candidate.text,
        bullets,
      });
    }

    return messages;
  } catch {
    return null;
  }
}

function parseStoredTotals(value: string | null): TokenTotals | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<TokenTotals>;
    if (
      typeof parsed.input !== "number" ||
      typeof parsed.output !== "number" ||
      typeof parsed.total !== "number"
    ) {
      return null;
    }

    const input = Math.max(0, parsed.input);
    const output = Math.max(0, parsed.output);

    return {
      input,
      output,
      total: input + output,
    };
  } catch {
    return null;
  }
}

function buildApiContent(message: ChatMessage) {
  if (!message.bullets || message.bullets.length === 0) {
    return message.text;
  }

  return `${message.text}\n\n${message.bullets.map((bullet) => `- ${bullet}`).join("\n")}`;
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tokenTotals, setTokenTotals] = useState<TokenTotals>(initialTokenTotals);
  const [activeModel, setActiveModel] = useState(DEFAULT_MODEL);
  const [lastResponseMetrics, setLastResponseMetrics] =
    useState<LastResponseMetrics | null>(null);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);
  const skipNextPersistRef = useRef(false);

  useEffect(() => {
    const storedMessages = parseStoredMessages(
      localStorage.getItem(STORAGE_MESSAGES_KEY)
    );
    const storedTotals = parseStoredTotals(
      localStorage.getItem(STORAGE_TOTALS_KEY)
    );

    queueMicrotask(() => {
      if (storedMessages) {
        setMessages(storedMessages);
      }

      if (storedTotals) {
        setTokenTotals(storedTotals);
      }

      setHasLoadedStorage(true);
    });
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) {
      return;
    }

    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }

    localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages));
    localStorage.setItem(STORAGE_TOTALS_KEY, JSON.stringify(tokenTotals));
  }, [hasLoadedStorage, messages, tokenTotals]);

  const metrics: MetricItem[] = useMemo(() => {
    const lastPromptTokens = lastResponseMetrics
      ? formatNumber(lastResponseMetrics.usage.promptTokens)
      : "-";
    const lastCompletionTokens = lastResponseMetrics
      ? formatNumber(lastResponseMetrics.usage.completionTokens)
      : "-";
    const lastTotalTokens = lastResponseMetrics
      ? formatNumber(lastResponseMetrics.usage.totalTokens)
      : "-";
    const usedModel = lastResponseMetrics?.model || activeModel;
    const responseTime = lastResponseMetrics
      ? `${lastResponseMetrics.responseTimeMs} ms`
      : "-";
    const tokensPerSecond =
      lastResponseMetrics?.tokensPerSecond != null
        ? `${lastResponseMetrics.tokensPerSecond.toFixed(2)} tok/s`
        : "-";

    return [
      { label: "Ultima respuesta: Prompt Tokens", value: lastPromptTokens },
      {
        label: "Ultima respuesta: Completion Tokens",
        value: lastCompletionTokens,
      },
      { label: "Ultima respuesta: Total Tokens", value: lastTotalTokens },
      { label: "Acumulados: Prompt Tokens", value: formatNumber(tokenTotals.input) },
      {
        label: "Acumulados: Completion Tokens",
        value: formatNumber(tokenTotals.output),
      },
      { label: "Acumulados: Total Tokens", value: formatNumber(tokenTotals.total) },
      { label: "Modelo utilizado", value: usedModel },
      { label: "Tiempo de respuesta", value: responseTime },
      { label: "Tokens por segundo", value: tokensPerSecond },
    ];
  }, [
    activeModel,
    lastResponseMetrics,
    tokenTotals.input,
    tokenTotals.output,
    tokenTotals.total,
  ]);

  const handleSendMessage = async () => {
    const nextPrompt = inputValue.trim();

    if (!nextPrompt || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: nextPrompt,
    };

    setMessages((previous) => [...previous, userMessage]);
    setInputValue("");
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const requestMessages = [...messages, userMessage].map((message) => ({
        role: message.role,
        content: buildApiContent(message),
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: requestMessages,
        }),
      });

      const rawPayload = await response.text();
      let payload: (ChatApiResponse & { error?: string }) | null = null;

      try {
        payload = JSON.parse(rawPayload) as ChatApiResponse & { error?: string };
      } catch {
        payload = null;
      }

      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo obtener respuesta de Groq.");
      }

      if (!payload) {
        throw new Error("La API devolvio una respuesta invalida.");
      }

      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        text: payload.response,
      };

      setMessages((previous) => [...previous, aiMessage]);
      setActiveModel(payload.model || DEFAULT_MODEL);
      setLastResponseMetrics({
        usage: payload.usage,
        model: payload.model || DEFAULT_MODEL,
        responseTimeMs: payload.responseTimeMs,
        tokensPerSecond: payload.tokensPerSecond,
      });
      setTokenTotals((previous) => {
        const input = previous.input + payload.usage.promptTokens;
        const output = previous.output + payload.usage.completionTokens;
        return {
          input,
          output,
          total: input + output,
        };
      });
    } catch (error) {
      const nextErrorMessage =
        error instanceof Error
          ? error.message
          : "Ocurrio un problema al consultar la API.";

      setErrorMessage(nextErrorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    skipNextPersistRef.current = true;
    setMessages([]);
    setInputValue("");
    setErrorMessage(null);
    setTokenTotals(initialTokenTotals);
    setLastResponseMetrics(null);
    setActiveModel(DEFAULT_MODEL);
    localStorage.removeItem(STORAGE_MESSAGES_KEY);
    localStorage.removeItem(STORAGE_TOTALS_KEY);
  };

  return (
    <div className={styles.viewport}>
      <div className={styles.gridGlow} aria-hidden="true" />

      <main className={styles.shell}>
        <Chat
          title="Groq AI Chat"
          subtitle="CHAT CON IA + METRICAS DE CONSUMO EN TIEMPO REAL"
          modelName={activeModel}
          messages={messages}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />

        <MetricsPanel
          title="Metricas"
          items={metrics}
          clearLabel="Limpiar historial"
          onClearHistory={handleClearHistory}
          disabled={isLoading}
        />
      </main>
    </div>
  );
}
