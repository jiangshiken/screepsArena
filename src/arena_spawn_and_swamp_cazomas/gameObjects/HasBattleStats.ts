import { Event_Number } from "../utils/Event";
import { ExtraTauntEvent } from "./battle";

export interface HasBattleStats {
  taunt: Event_Number | undefined;
  force: Event_Number | undefined;
  extraTauntList: ExtraTauntEvent[];
}
