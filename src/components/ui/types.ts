// UI re-exports of the shared contract in src/lib/core (pure, client safe).
export type {
  Fact, FactKind, ReasonCode, FormId, Trip, Question, Answer, Contradiction, Pack,
} from "@/lib/core/types";
import type { FormId } from "@/lib/core/types";

export const FORM_NAMES: Record<FormId, string> = {
  uk_visitor: "UK Standard Visitor",
  schengen: "Schengen harmonised form",
  us_ds160: "US DS 160",
};
