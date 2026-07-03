import styles from "@/app/page.module.css";
import type { ChatMessage as ChatMessageData } from "@/types/chat";

type ChatMessageProps = {
  message: ChatMessageData;
};

export default function ChatMessage({ message }: ChatMessageProps) {
  const roleClass = message.role === "user" ? styles.userBubble : styles.aiBubble;

  return (
    <article className={`${styles.bubble} ${roleClass}`}>
      <p>{message.text}</p>
      {message.bullets && message.bullets.length > 0 ? (
        <ul>
          {message.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
