export interface ModelToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export type ModelMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: ModelToolCall[];
    }
  | {
      role: "tool";
      tool_call_id: string;
      content: string;
    };

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatModelResult {
  model: string;
  content: string;
  toolCalls: ModelToolCall[];
  finishReason?: string;
}

export interface ChatBookingOptions {
  timezone: string;
  slots: { id: string; label: string; start: string; end: string }[];
  offer: string;
}

export interface ChatEvent {
  type: "text" | "status" | "degraded" | "error" | "done" | "confirmation" | "booking_options";
  bookingOptions?: ChatBookingOptions;
  action?: string;
  token?: string;
  description?: string;
  text?: string;
  status?: string;
  message?: string;
  code?: string;
}
