import type { Lang, TwistId } from "./task";
import type { AiDraft } from "./records";
import { simulatedDraft } from "./ai";

export async function draftFeedback(explanation: string, twistId: TwistId, lang: Lang): Promise<AiDraft> {
  return simulatedDraft(explanation, twistId, lang);
}
