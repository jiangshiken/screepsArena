
import { enemySpawn } from "../units/spawn";
import { Cre, Role } from "../utils/Cre";
import { SA } from "../utils/visual";

/**tring to attack the enemy spawn when no one noticed*/
export const spawnStealer: Role = new Role("spawnStealer", spawnStealerControl);
export function spawnStealerControl(cre: Cre) {
	SA(cre, "i'm stealer")
	cre.fight();
	if (cre.upgrade.isFighting === undefined) {
		cre.upgrade.isFighting = false
	}
	const fightExtra = cre.upgrade.isFighting ? -14 : 0
	if (cre.battle.flee(4, 12)) {
		SA(cre, "flee");
		cre.upgrade.isFighting = false
	} else if (cre.battle.flee(18 + fightExtra, 30)) {
		SA(cre, "flee2")
		cre.upgrade.isFighting = false
	} else {
		SA(cre, "rush");
		cre.upgrade.isFighting = true
		cre.MTJ_follow(enemySpawn)
	}
}
