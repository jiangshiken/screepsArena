import { CARRY, MOVE } from "game/constants";

import { friends } from "../gameObjects/GameObjectInitialize";
import { spawn, spawnCleared, spawnCreep } from "../gameObjects/spawn";
import { harvester } from "../roles/harvester";
import { TB } from "../utils/autoBodys";
import { tick } from "../utils/game";
import { sum } from "../utils/JS";
import { displayPos, SA } from "../utils/visual";

/**spawn the start harvester of every strategy*/
export function spawnStartHarvester(
  needCarryNum: number,
  is2C2M: boolean = false
) {
  if (tick <= 300 && spawnCleared(spawn)) {
    const tarHarvesters = friends.filter(
      i => i.role === harvester && i.getHealthyBodyPartsNum(MOVE) > 0
    );
    const carryNum = sum(tarHarvesters, i => i.getHealthyBodyPartsNum(CARRY));
    SA(displayPos(), "spawnStartHarvester carryNum=" + carryNum);
    if (carryNum < needCarryNum) {
      SA(displayPos(), "supply harvester");
      if (is2C2M) {
        spawnCreep(TB("m2cm"), harvester); //
      } else {
        spawnCreep(TB("cm"), harvester); //
      }
    }
  }
}
