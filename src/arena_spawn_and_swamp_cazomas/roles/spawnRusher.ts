import { enemySpawn } from "arena_spawn_and_swamp_cazomas/gameObjects/GameObjectInitialize";
import { Role } from "../gameObjects/CreTool";
import { Cre_battle } from "../gameObjects/Cre_battle";
import { SA } from "../utils/visual";

/**tring to attack the enemy spawn when no one noticed*/
export const spawnRusher: Role = new Role("spawnRusher", spawnRusherControl);

export function spawnRusherControl(cre: Cre_battle) {
  SA(cre, "i'm spawnRusher");
  cre.fight();
  cre.MTJ_stop(enemySpawn);
}
