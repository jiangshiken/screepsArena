import { CARRY, MOVE } from "game/constants";

import { friends } from "../gameObjects/Cre";
import { displayPos } from "../gameObjects/HasHits";
import { spawn, spawnCleared, spawnCreep } from "../gameObjects/Spa";
import { harvester } from "../roles/harvester";
import { TB } from "../utils/autoBodys";
import { tick } from "../utils/game";
import { sum } from "../utils/JS";
import { SA } from "../utils/visual";

/**spawn the start harvester of every strategy*/
export function spawnStartHarvester(
  needCarryNum: number,
  is2C2M: boolean = false
) {
  if (tick <= 300 && spawnCleared(spawn)) {
    const tarHarvesters = friends.filter(
      i => i.role === harvester && i.getHealthyBodiesNum(MOVE) > 0
    );
    const carryNum = sum(tarHarvesters, i => i.getHealthyBodiesNum(CARRY));
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
