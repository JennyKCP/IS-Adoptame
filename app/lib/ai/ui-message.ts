import type { InferUITools, UIDataTypes, UIMessage } from "ai";
import type { AiToolSet } from "./registry";


export type ShelterUIMessage = UIMessage<
  never,
  UIDataTypes,
  InferUITools<AiToolSet>
>;
