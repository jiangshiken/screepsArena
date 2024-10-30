import { findPath } from "game/utils";

import { Cre, friends, Role } from "../gameObjects/Cre";
import { enemySpawn } from "../gameObjects/spawn";
import { Event_C, validEvent } from "../utils/Event";
import { COO, GR } from "../utils/Pos";
import { drawPolyLight, SA } from "../utils/visual";

/**tring to attack the enemy spawn when no one noticed*/
export const spawnRusher: Role = new Role("spawnRusher", spawnRusherControl);
export const spawnRusher_swamp: Role = new Role(
  "spawnRusher_swamp",
  spawnRusher_swamp_Control
);

export const tailer: Role = new Role("tailer", tailerJob);

export function tailerJob(cre: Cre) {
  SA(cre, "i'm tailer");
  const ca = friends.find(
    i => i.role === spawnRusher || i.role === spawnRusher_swamp
  );
  if (ca) {
    cre.directBePulled(ca);
  }
}
export function spawnRusherControl(cre: Cre) {
  SA(cre, "i'm spawnRusher");
  cre.fight();
  cre.MTJ_stop(enemySpawn);
}
export function spawnRusher_swamp_Control(cre: Cre) {
  SA(cre, "i'm spawnRusher_swamp");
  cre.fight();
  if (cre.upgrade.inited === undefined) {
    cre.upgrade.inited = new Event_C();
  }
  if (validEvent(cre.upgrade.inited, 60)) {
    return;
  }
  if (GR(cre, enemySpawn) >= 7) {
    const p = findPath(cre, enemySpawn, { plainCost: 5, swampCost: 1 });
    // cre.moveToNormal
    const target = p[0];
    drawPolyLight(p);
    SA(cre, "target=" + COO(target));
    cre.moveToNormal(target);
  } else {
    cre.MTJ_stop(enemySpawn);
  }
  // cre.moveToNormal
}
