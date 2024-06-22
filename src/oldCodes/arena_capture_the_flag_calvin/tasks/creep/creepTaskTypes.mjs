import { TargetingMove } from "./targetingMove.mjs";
import { MeleeAttack } from "./attack/meleeAttack.mjs";
import { RangedAttack } from "./attack/rangedAttack.mjs";
import { Heal } from "./heal.mjs";
import { CaptureFlag } from "./captureFlag.mjs";

export const creepTaskTypes = Object.freeze({
	TargetingMove: TargetingMove,
    MeleeAttack: MeleeAttack,
    RangedAttack: RangedAttack,
    Heal: Heal,
    CaptureFlag: CaptureFlag,
});
