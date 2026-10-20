import styles from "./ui.module.css";

/**
 * Mount point for Clara. P5 replaces the empty slot with the chat widget; the
 * slot exists on every page in the meantime so the layout can stay stable.
 */
export function ChatWidgetSlot() {
  return (
    <div id="clara-chat-slot" data-clara-chat-slot className={styles.chatSlot} aria-hidden="true" />
  );
}
