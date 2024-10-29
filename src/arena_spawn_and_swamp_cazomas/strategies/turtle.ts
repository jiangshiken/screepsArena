import {
  ConstructionSite,
  StructureContainer,
  StructureRampart,
  StructureRoad,
  StructureWall,
} from "game/prototypes";
import { getTicks } from "game/utils";

import { CARRY } from "game/constants";
import { bodyCM } from "../deprecated/bodyParts";
import { set_setMiniForceMapOn } from "../deprecated/maps";
import { builderTurtle } from "../roles/builder";
import { defender_rampart } from "../roles/defender";
import { harvester } from "../roles/harvester";
import { jamer } from "../roles/jamer";
import { createCS, createCS_wait, supplyCS } from "../units/constructionSite";
import {
  enemyAWeight,
  friends,
  getEnemyArmies,
  getFreeEnergy,
  setIsTurtleContainer,
} from "../units/Cre";
import { displayPos } from "../units/HasHits";
import { baseLoseRampart } from "../units/ramparts";
import {
  getSpawnAndBaseContainerEnergy,
  resetStartGateAvoidFromEnemies,
  spawn,
  spawnCleared,
  spawnCreep,
  spawnCreepInFront,
} from "../units/spawn";
import { SpawnType } from "../units/spawnTypeList";
import { TB } from "../utils/autoBodys";
import { set_switchCPUModeOn } from "../utils/CPU";
import { leftRate, leftVector, tick } from "../utils/game";
import {
  containers,
  isMyGO,
  myConstructionSites,
} from "../utils/gameObjectInitialize";
import { divide0, relu, sum } from "../utils/JS";
import { findGO, overallMap } from "../utils/overallMap";
import { currentGuessPlayer, Dooms } from "../utils/player";
import {
  absRange,
  atPos,
  COO,
  getRangePoss,
  GR,
  Pos,
  posPlusVec,
  X_axisDistance,
  Y_axisDistance,
} from "../utils/Pos";
import { SA, SAN } from "../utils/visual";
import { spawnStartHarvester } from "./strategyTool";

/**use a standard mode of turtling at base*/
export function useStandardTurtling(st: number, strength: number = 0) {
  SA(displayPos(), "Citilize strength=" + strength);
  if (st === 1) {
    if (strength === 0) {
      spawnCreep(TB("AWCM"), builderTurtle); //200
    } else if (strength === 1) {
      spawnCreep(TB("ARWCM"), builderTurtle); //200
    } else {
      spawnCreep(TB("3A2R2WCM"), builderTurtle); //200
    }
    //240+300+300+100+150
    // spawnCreep([ATTACK,ATTACK,ATTACK,RANGED_ATTACK,RANGED_ATTACK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE],builder);//200

    if (strength >= 2) {
      createCS(spawn, StructureRampart, 10, false, true);
    }
    createCS(spawn, StructureRampart, 10, false, true);
  }
  supplyCS({ x: spawn.x, y: spawn.y + 1 }, StructureRampart, 10);
  supplyCS({ x: spawn.x, y: spawn.y - 1 }, StructureRampart, 10);
  if (strength > 0) {
    supplyCS({ x: spawn.x + leftRate(), y: spawn.y }, StructureRampart, 10);
  }
  supplyCS({ x: spawn.x - leftRate(), y: spawn.y }, StructureRampart, 10);
  // supply
  supplyHarvester(st);
  // supplyHarvester
  supplyRoads(true);
  //
  const startRebuildTick = 200;
  let transRebuildTime: number;
  let transRebuildTimeRange2: number = 2000;
  if (strength <= 0) {
    transRebuildTime = 600;
  } else if (strength <= 1) {
    transRebuildTime = 400;
  } else if (strength <= 2) {
    transRebuildTime = 200;
  } else {
    transRebuildTime = 200;
    transRebuildTimeRange2 = 500;
  }
  if (st >= startRebuildTick && st <= transRebuildTime) {
    reBuildBaseRampart();
  }
  // if (st >= transRebuildTime) {
  // 	let leftRate = sasVariables.leftRate();
  // 	supplyCS({ x: spawn.x - leftRate, y: spawn.y + 1 }, StructureRampart, 9);
  // 	supplyCS({ x: spawn.x - leftRate, y: spawn.y - 1 }, StructureRampart, 9);
  // 	supplyCS({ x: spawn.x + leftRate, y: spawn.y + 1 }, StructureRampart, 8);
  // 	supplyCS({ x: spawn.x + leftRate, y: spawn.y - 1 }, StructureRampart, 8);
  // }
  if (st === 370) {
    //defender
    const AW = enemyAWeight();
    if (strength === 0) {
      if (AW < 0.2) {
        spawnCreepInFront(TB("2rm"), defender_rampart);
      } else {
        spawnCreepInFront(TB("2arm"), defender_rampart);
      }
      // spawnCreepInFront(
      // 	TB("2arm"),
      // 	defender_rampart
      // );
    } else if (strength === 1) {
      if (AW < 0.2) {
        //450+50
        spawnCreepInFront(TB("3rm"), defender_rampart);
      } else {
        spawnCreepInFront(TB("6am"), defender_rampart);
      }
    } else {
      //320+450+100
      spawnCreepInFront(TB("3a3rm"), defender_rampart);
      spawnCreepInFront(TB("2a4rm"), defender_rampart);
    }
  }
}
export function supplyHarvester(st: number) {
  //supply harvester
  if (st >= 2 && st <= 300 && spawnCleared(spawn)) {
    let carryNum = sum(
      friends.filter(i => i.role === harvester),
      i => i.getBodiesNum(CARRY)
    );
    if (carryNum < 2) {
      spawnCreepInFront(bodyCM, harvester);
    }
  }
}

/**rebuild the base rampart
 * if not in my rampart ,create a `StructureRampart` at pos
 */
export function reBuildBaseRampart() {
  if (baseLoseRampart()) {
    createCS(spawn, StructureRampart, 10);
  }
}
/**if tutle initialed*/
let turtleInitialed: boolean = false;
export function useTurtleStrategy() {
  if (!turtleInitialed) {
    turtleInitialed = true;
    setIsTurtleContainer(true);
  }
  if (tick >= 400) {
    set_setMiniForceMapOn(false);
    set_setMiniForceMapOn(false);
  }
  set_switchCPUModeOn(false);
  resetStartGateAvoidFromEnemies();
  spawnStartHarvester(2);
  supplyBuilders();
  supplyJamers();
  // if(tick<=400){
  // 	const spl = getSpawnTypeList_turtle();
  // 	spawnBySpawnTypeList(spl);
  // }
  supplyDefenders();
  supplyRoads();
  supplyContainer();
  let tarProtectPoss;
  // if (tick < 1900) {
  // 	tarProtectPoss = getRangePoss(spawn, 1).filter(i => absRange(spawn, i) === 2)
  // } else {
  // 	tarProtectPoss = getRangePoss(spawn, 1).filter(i => Y_axisDistance(spawn, i) === 1)
  // }
  tarProtectPoss = getRangePoss(spawn, 1).filter(i => absRange(spawn, i) === 2);
  const SCEnergy = getSpawnAndBaseContainerEnergy();
  SAN(displayPos(), "SCEnergy", SCEnergy);
  const unProtectPoss = tarProtectPoss.filter(
    i => !findGO(i, StructureRampart) && !findGO(i, StructureWall)
  );
  if (tick > 1700 && SCEnergy < 400) {
    if (unProtectPoss.length > 0) {
      SA(displayPos(), "final protect");
      myConstructionSites.forEach(i => {
        if (i.progress === 0 && i.structure instanceof StructureRampart) {
          SA(i, "remove this");
          i.remove();
        }
      });
      supplyWalls(unProtectPoss);
    } else {
      SA(displayPos(), "not enough energy to build extra ram");
      supplyRamparts();
    }
  } else {
    supplyRamparts();
    supplyExtraRamparts();
  }
  //add defender,builder,add ram,container,road,extra container
}

export function supplyWalls(tarProtectPoss: Pos[]) {
  SA(displayPos(), "supplyWalls");
  for (const pos of tarProtectPoss) {
    if (
      !overallMap.get(pos).find(i => i instanceof ConstructionSite && isMyGO(i))
    ) {
      SA(pos, "supply wall at here");
      supplyCS(pos, StructureWall, 11);
    }
  }
}
export function supplyJamers() {
  if (currentGuessPlayer === Dooms) {
    SA(displayPos(), "no jamer");
  } else {
    SA(displayPos(), "has jamer");
    if (spawnCleared(spawn) && tick <= 350) {
      const js = friends.filter(i => i.role === jamer);
      const jsl = js.length;
      if (jsl < 6) {
        spawnCreep(TB("M"), jamer);
      }
    }
  }
}
export function supplyBuilders() {
  if (
    spawnCleared(spawn) &&
    friends.find(i => i.role === builderTurtle) === undefined
  ) {
    if (currentGuessPlayer === Dooms) {
      //5A4W2C2M=>400+400+100+100
      //6A3W2C2M=>480+300+100+100
      //6A3WC3M=>480+300+50+150
      //7A2M2WCM=>560+100+200+50+50
      spawnCreep(TB("7A2M2WCM"), builderTurtle);
      // spawnCreep(TB("6A3W2C2M"), builderTurtle)
    } else {
      //5A4W2CM=>240+150+400+100+100
      spawnCreep(TB("3AR4W2C2M"), builderTurtle);
    }
  }
  // if (tick === 30) {
  // }
}
export function supplyDefenders() {
  if (spawnCleared(spawn)) {
    const bts = friends.filter(i => i.role === defender_rampart);
    const btsl = bts.length;
    //2A5RM=>160+750+50
    //6RM=>900+50
    //6A3RM=>480+450+50
    //8A2RM=>640+300+50
    //8AR3M=>640+150+150   	speed=9/6=2
    //9AR2M=>720+150+100
    //11A2M=>880+100		speed=11/4=3
    //10A3M=>800+150		speed=10/6=2
    if (currentGuessPlayer === Dooms) {
      if (btsl <= 3) {
        spawnCreep(TB("8AR3M"), defender_rampart);
      }
      if (btsl <= 2) {
        spawnCreep(TB("10A3M"), defender_rampart);
      }
      if (btsl <= 1) {
        spawnCreep(TB("10A3M"), defender_rampart);
      }
      if (btsl <= 0) {
        spawnCreep(TB("10A3M"), defender_rampart);
      }
    } else {
      if (btsl <= 3) {
        spawnCreep(TB("2A5RM"), defender_rampart);
      }
      if (btsl <= 2) {
        spawnCreep(TB("2A5RM"), defender_rampart);
      }
      if (btsl <= 1) {
        spawnCreep(TB("2A5RM"), defender_rampart);
      }
      if (btsl <= 0) {
        spawnCreep(TB("2A5RM"), defender_rampart);
      }
    }
  }
  // if (tick === 70) {
  //160+750+50
  // }
}
/**TODO*/
export function getSpawnTypeList_turtle(): SpawnType[] {
  const spawnTypeList: SpawnType[] = [];
  return spawnTypeList;
}
function supplyExtraRamparts() {
  if (tick > 600) {
    SA(displayPos(), "supplyExtraRamparts");
    const timeToEnd = 2000 - getTicks();
    const totalEnergy = getSpawnAndBaseContainerEnergy();
    const totalExtraEnergy = relu(totalEnergy - 100);
    const buildExtraRamRate = divide0(totalExtraEnergy, timeToEnd);
    SAN(displayPos(), "totalExtraEnergy", totalExtraEnergy);
    SAN(displayPos(), "timeToEnd", timeToEnd);
    SAN(displayPos(), "buildExtraRamRate", buildExtraRamRate);
    const ramWorth = 8;
    const startBias = 0.2;
    const increaseBias = 0.15;
    // if (buildExtraRamRate > startBias + 7 * increaseBias) {
    // 	supplyCS({ x: spawn.x, y: spawn.y + 2 }, StructureRampart, ramWorth)
    // } else if (buildExtraRamRate > startBias + 6 * increaseBias) {
    // 	supplyCS({ x: spawn.x, y: spawn.y - 2 }, StructureRampart, ramWorth)
    // } else
    if (buildExtraRamRate > startBias + 5 * increaseBias) {
      supplyCS(
        { x: spawn.x - 2 * leftRate(), y: spawn.y + 1 },
        StructureRampart,
        ramWorth,
        false,
        false,
        true
      );
    }
    if (buildExtraRamRate > startBias + 4 * increaseBias) {
      supplyCS(
        { x: spawn.x - 2 * leftRate(), y: spawn.y - 1 },
        StructureRampart,
        ramWorth,
        false,
        false,
        true
      );
    }
    if (buildExtraRamRate > startBias + 3 * increaseBias) {
      supplyCS(
        { x: spawn.x - 2 * leftRate(), y: spawn.y },
        StructureRampart,
        ramWorth
      );
    }
    if (buildExtraRamRate > startBias + 2 * increaseBias) {
      supplyCS(
        { x: spawn.x + 2 * leftRate(), y: spawn.y + 1 },
        StructureRampart,
        ramWorth
      );
    }
    if (buildExtraRamRate > startBias + 1 * increaseBias) {
      supplyCS(
        { x: spawn.x + 2 * leftRate(), y: spawn.y - 1 },
        StructureRampart,
        ramWorth
      );
    }
    if (buildExtraRamRate > startBias) {
      supplyCS(
        { x: spawn.x + 2 * leftRate(), y: spawn.y },
        StructureRampart,
        ramWorth
      );
    }
  }
}
/**supply the ramparts around the base*/
function supplyRamparts() {
  const cssAtSpawn = myConstructionSites.filter(i => atPos(i, spawn));
  const hasEnemyArmyAround =
    getEnemyArmies().find(i => GR(i, spawn) <= 4) !== undefined;
  const baseRamNum = currentGuessPlayer === Dooms ? 2 : 3;
  if (hasEnemyArmyAround) {
    createCS_wait(spawn, StructureRampart, 15);
  } else {
    if (cssAtSpawn.length < baseRamNum) {
      createCS_wait(spawn, StructureRampart, 15, false, true);
    }
  }
  const rangePos = getRangePoss(spawn, 1).filter(
    i => !findGO(i, StructureWall)
  );
  for (let pos of rangePos) {
    if (!atPos(pos, spawn)) {
      if (supplyCS(pos, StructureRampart, 10)) {
        break;
      }
    }
  }
}
/**supply the roads around the base*/
export function supplyRoads(simpleRoad: boolean = false) {
  let rangePos;
  if (simpleRoad) {
    rangePos = getRangePoss(spawn, 1).filter(
      i => X_axisDistance(spawn, i) === 0 || Y_axisDistance(spawn, i) === 0
    );
  } else {
    const rectPos = getRangePoss(spawn, 2).filter(
      i =>
        GR(spawn, i) === 2 &&
        X_axisDistance(spawn, i) === 2 &&
        Y_axisDistance(spawn, i) <= 1
    );
    // const crossPos = getRangePoss(spawn, 2).filter(i => MGR(spawn, i) === 2 && absRange(spawn, i) === 2)
    // const rangePos = getRangePoss(spawn, 1).concat(rectPos, crossPos)
    rangePos = getRangePoss(spawn, 1).concat(rectPos);
  }
  for (let pos of rangePos) {
    if (!atPos(pos, spawn)) {
      if (supplyCS(pos, StructureRoad, 9)) {
        break;
      }
    }
  }
}
/**supply base container*/
function supplyContainer() {
  const aroundCon = containers.find(
    i => GR(i, spawn) <= 1 && getFreeEnergy(i) > 0
  );
  SA(displayPos(), "supplyContainer aroundCon=" + COO(aroundCon));
  if (!aroundCon) {
    const pos = posPlusVec(spawn, leftVector());
    SA(displayPos(), "pos=" + COO(pos));
    createCS_wait(pos, StructureContainer, 13);
  }
}
