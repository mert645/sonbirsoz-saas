import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: process.env.CUSTOM_AWS_REGION || process.env.AWS_REGION || "eu-central-1",
  credentials: {
    accessKeyId: (process.env.CUSTOM_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID)!,
    secretAccessKey: (process.env.CUSTOM_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY)!,
  },
});

export interface BedrockMessage {
  role: "user" | "assistant";
  content: string;
}

export interface BedrockOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  system?: string;
}

export async function invokeBedrockClaude(
  messages: BedrockMessage[],
  options: BedrockOptions = {}
): Promise<string> {
  const {
    model = process.env.BEDROCK_MODEL_ID || "eu.anthropic.claude-sonnet-4-6-v1",
    maxTokens = 4096,
    temperature = 0.7,
    system,
  } = options;

  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: maxTokens,
    temperature,
    ...(system && { system }),
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const command = new InvokeModelCommand({
    modelId: model,
    contentType: "application/json",
    accept: "application/json",
    body: new TextEncoder().encode(body),
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  if (responseBody.content?.[0]?.text) {
    return responseBody.content[0].text;
  }

  throw new Error("Unexpected Bedrock response format");
}

export async function invokeBedrockJSON<T>(
  messages: BedrockMessage[],
  options: BedrockOptions = {}
): Promise<T> {
  const text = await invokeBedrockClaude(messages, {
    ...options,
    temperature: options.temperature ?? 0.3,
  });

  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to extract JSON from Bedrock response");
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0];
  return JSON.parse(jsonStr) as T;
}
