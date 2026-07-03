export type ChatMessage = {
  id: string;
  role: "user" | "ai";
  text: string;
  bullets?: string[];
};

export type TokenTotals = {
  input: number;
  output: number;
  total: number;
};

export type Usage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type ChatApiResponse = {
  response: string;
  usage: Usage;
  model: string;
  responseTimeMs: number;
  tokensPerSecond: number | null;
};
