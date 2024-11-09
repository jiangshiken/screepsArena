import { Role } from "../gameObjects/CreTool";
import { Cre_battle } from "../gameObjects/Cre_battle";
import { oppoExtensions } from "../gameObjects/GameObjectInitialize";
import { inRampart } from "../gameObjects/UnitTool";
import { closest } from "../utils/Pos";
import { SA } from "../utils/visual";

/**tring to attack the enemy spawn when no one noticed*/
export const extStealer: Role = new Role("extStealer", extStealerJob);
export function extStealerJob(cre: Cre_battle) {
  SA(cre, "i'm stealer");
  cre.fight();
  if (cre.flee(6)) {
    SA(cre, "flee");
  } else {
    SA(cre, "rush");
    const targets = oppoExtensions.filter(i => !inRampart(i));
    const target = closest(cre, targets);
    if (target) {
      cre.MTJ_stop(target);
    }
  }
}
