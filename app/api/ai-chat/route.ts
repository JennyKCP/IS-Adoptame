import { NextResponse } from "next/server";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
} from "ai";
import { getCachedSession } from "@/app/lib/auth/session";
import { can } from "@/app/lib/auth/can";
import { AppPermissions } from "@/app/lib/auth/permissions";
import { toActor } from "@/app/lib/auth/actor";
import { PreconditionFailedError } from "@/app/lib/utils/errors";
import { MAX_STEPS, model } from "@/app/lib/ai/provider";
import { AiProviderConfigError } from "@/app/lib/ai/provider-guard";
import { getToolApprovalSecret } from "@/app/lib/ai/approval-secret";
import { buildToolsForActor } from "@/app/lib/ai/registry";
import { WRITE_TOOL_NAMES } from "@/app/lib/ai/tool-names";
import { buildSystemPrompt } from "@/app/lib/ai/prompt";
import { getShelterToday } from "@/app/lib/data/shelter-settings.data";
import { setTaskStatusApproval } from "@/app/lib/ai/tools/set-task-status";
import { CHAT_ERROR_COPY, classifyChatError } from "@/app/lib/ai/chat-errors";
import type { ShelterUIMessage } from "@/app/lib/ai/ui-message";


export const maxDuration = 60;


export async function POST(request: Request) {
  const session = await getCachedSession();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized: You must be logged in." },
      { status: 401 },
    );
  }

  if (!can(session.user.role, AppPermissions.AI_CHAT_USE)) {
    return NextResponse.json(
      { error: "Forbidden: You do not have access to the AI assistant." },
      { status: 403 },
    );
  }

  let actor;
  try {
    actor = toActor(session.user);
  } catch (error) {
    
    
    if (error instanceof PreconditionFailedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  let messages: ShelterUIMessage[];
  try {
    ({ messages } = (await request.json()) as { messages: ShelterUIMessage[] });
  } catch {
    return NextResponse.json(
      { error: "Bad Request: expected a JSON body." },
      { status: 400 },
    );
  }
  if (!Array.isArray(messages)) {
    return NextResponse.json(
      { error: "Bad Request: `messages` must be an array." },
      { status: 400 },
    );
  }

  
  
  const { tools, toolsContext } = buildToolsForActor(actor);
  const availableTools = Object.keys(tools) as (keyof typeof tools)[];

  
  
  
  
  
  const hasWriteTool = WRITE_TOOL_NAMES.some((name) => name in tools);
  let toolApprovalSecret: string | undefined;
  if (hasWriteTool) {
    try {
      toolApprovalSecret = getToolApprovalSecret();
    } catch (error) {
      if (error instanceof AiProviderConfigError) {
        console.error("AI chat refused: approval secret missing.", error);
        return NextResponse.json(
          { error: CHAT_ERROR_COPY.misconfigured },
          { status: 500 },
        );
      }
      throw error;
    }
  }

  const result = streamText({
    model,
    instructions: buildSystemPrompt({
      actor,
      displayName: session.user.name,
      availableTools,
      today: await getShelterToday(),
    }),
    messages: await convertToModelMessages(messages),
    tools,
    toolsContext,
    
    
    
    
    toolApproval: { setTaskStatus: setTaskStatusApproval },
    experimental_toolApprovalSecret: toolApprovalSecret,
    stopWhen: isStepCount(MAX_STEPS),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      
      
      
      
      sendReasoning: false,
      onError: describeStreamError,
    }),
  });
}


function describeStreamError(error: unknown): string {
  console.error("AI chat stream failed.", error);

  const message = error instanceof Error ? error.message : String(error);
  return CHAT_ERROR_COPY[classifyChatError(message)];
}
