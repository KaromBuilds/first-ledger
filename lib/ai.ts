import type { Lang, TwistId } from "./task";
import { CRITERIA, type AiDraft, type Mark } from "./records";

// Rule-based fallback. Always labeled "Simulated AI" in the UI.
const KEYWORDS: Record<TwistId, { changed: RegExp; side: RegExp }> = {
  returned: {
    changed: /(rebot|devuel|sin fondos|returned|bounc|insufficient)/i,
    side: /(libro|contab|registr|book|ledger|record)/i,
  },
  duplicate: {
    changed: /(duplic|doble|dos veces|twice|double|error del banco|bank error|bank's error)/i,
    side: /(banco|bank)/i,
  },
  voided: {
    changed: /(cancel|anul|void|nunca se entreg|never (handed|delivered|given))/i,
    side: /(libro|contab|registr|book|ledger|record|revers)/i,
  },
};
const OWNER = /(cliente|cobrar|reclam|aclara|dueñ|avis|llamar|owner|customer|collect|call|tell|claim|dispute)/i;

export function simulatedDraft(explanation: string, twistId: TwistId, lang: Lang): AiDraft {
  const k = KEYWORDS[twistId];
  const short = explanation.trim().split(/\s+/).length < 12;
  const mark = (hit: boolean): Mark => (hit ? (short ? "partly" : "yes") : "no");
  const marks = {
    what_changed: mark(k.changed.test(explanation)),
    which_side: mark(k.side.test(explanation)),
    tell_owner: mark(OWNER.test(explanation)),
  };
  const notes: Record<Lang, Record<Mark, string>> = {
    es: { yes: "Se menciona con claridad.", partly: "Se menciona, pero muy breve.", no: "No se encontró en la explicación." },
    en: { yes: "Clearly mentioned.", partly: "Mentioned, but very briefly.", no: "Not found in the explanation." },
  };
  return {
    source: "simulated",
    criteria: CRITERIA.map((id) => ({ id, mark: marks[id], note: notes[lang][marks[id]] })),
    summary:
      lang === "es"
        ? "Borrador simulado por reglas de palabras clave (sin IA real). Una persona decide."
        : "Simulated draft from keyword rules (no real AI). A person decides.",
  };
}
