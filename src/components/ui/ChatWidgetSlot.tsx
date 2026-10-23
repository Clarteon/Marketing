import { ClaraChat } from "@/components/chat/ClaraChat";
import styles from "./ui.module.css";

/**
 * Mount point for Clara on every page.
 */
export function ChatWidgetSlot({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  return (
    <div id="clara-chat-slot" data-clara-chat-slot className={styles.chatSlot}>
      <ClaraChat turnstileSiteKey={turnstileSiteKey} />
    </div>
  );
}
