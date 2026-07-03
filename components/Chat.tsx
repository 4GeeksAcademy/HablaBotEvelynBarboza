import { useEffect, useRef } from "react";
import styles from "@/app/page.module.css";
import ChatMessage from "@/components/ChatMessage";
import Header from "@/components/Header";
import MessageInput from "@/components/MessageInput";
import type { ChatMessage as ChatMessageData } from "@/types/chat";

type ChatProps = {
  title: string;
  subtitle: string;
  modelName: string;
  messages: ChatMessageData[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  isLoading: boolean;
  errorMessage: string | null;
};

export default function Chat({
  title,
  subtitle,
  modelName,
  messages,
  inputValue,
  onInputChange,
  onSendMessage,
  isLoading,
  errorMessage,
}: ChatProps) {
  const showThinking = isLoading;
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ block: "end" });
  }, [messages, showThinking, errorMessage]);

  return (
    <section className={styles.chatColumn}>
      <Header title={title} subtitle={subtitle} modelName={modelName} />

      <section className={styles.messagesPanel} aria-label="Historial de chat">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {showThinking ? (
          <ChatMessage
            message={{
              id: "thinking",
              role: "ai",
              text: "Pensando...",
            }}
          />
        ) : null}

        {errorMessage ? (
          <ChatMessage
            message={{
              id: "error-message",
              role: "ai",
              text: `Error: ${errorMessage}`,
            }}
          />
        ) : null}

        <div ref={bottomAnchorRef} aria-hidden="true" />
      </section>

      <MessageInput
        placeholder="Escribe tu mensaje..."
        buttonLabel={isLoading ? "Enviando..." : "Enviar"}
        value={inputValue}
        onChange={onInputChange}
        onSubmit={onSendMessage}
        isLoading={isLoading}
      />
    </section>
  );
}
