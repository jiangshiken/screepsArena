import { enemySpawn } from "arena_spawn_and_swamp_cazomas/gameObjects/GameObjectInitialize";
import { Role } from "../gameObjects/CreTool";
import { Cre_battle } from "../gameObjects/Cre_battle";
import { SA } from "../utils/visual";

/**tring to attack the enemy spawn when no one noticed*/
export const spawnStealer: Role = new Role("spawnStealer", spawnStealerControl);
export function spawnStealerControl(cre: Cre_battle) {
  SA(cre, "i'm stealer");
  cre.fight();
  if (cre.upgrade.isFighting === undefined) {
    cre.upgrade.isFighting = false;
  }
  const fightExtra = cre.upgrade.isFighting ? -14 : 0;
  if (cre.flee(4, 12)) {
    SA(cre, "flee");
    cre.upgrade.isFighting = false;
  } else if (cre.flee(18 + fightExtra, 30)) {
    SA(cre, "flee2");
    cre.upgrade.isFighting = false;
  } else {
    SA(cre, "rush");
    cre.upgrade.isFighting = true;
    cre.MTJ(enemySpawn);
  }
}
