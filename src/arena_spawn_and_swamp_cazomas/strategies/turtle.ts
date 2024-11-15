import {
  StructureContainer,
  StructureRampart,
  StructureRoad,
  StructureWall,
} from "game/prototypes";
import { getTicks } from "game/utils";
import { getEnemyArmies } from "../gameObjects/CreTool";
import { createCS_wait, supplyCS } from "../gameObjects/CS";
import {
  containers,
  friends,
  myCSs,
  spawn,
} from "../gameObjects/GameObjectInitialize";
import { findGO } from "../gameObjects/overallMap";
import { currentGuessPlayer, Dooms } from "../gameObjects/player";
import {
  getSpawnAndBaseContainerEnergy,
  spawnCleared,
  spawnCreep,
} from "../gameObjects/spawn";
import { energyFull, setIsTurtleContainer } from "../gameObjects/UnitTool";
import { builderTurtle } from "../roles/builder";
import { defender_rampart } from "../roles/defender";
import { jamer } from "../roles/jamer";
import { TB } from "../utils/autoBodys";
import { leftRate, leftVector, tick } from "../utils/game";
import { divide0, relu } from "../utils/JS";
import {
  absRange,
  Adj,
  atPos,
  COO,
  getRangePoss,
  GR,
  Pos,
  posPlusVec,
  X_axisDistance,
  Y_axisDistance,
} from "../utils/Pos";
import { displayPos, SA, SAN } from "../utils/visual";
import { spawnStartHarvester } from "./strategyTool";

/**if tutle initialed*/
let turtleInitialed: boolean = false;
export function useTurtleStrategy() {
  if (!turtleInitialed) {
    turtleInitialed = true;
    setIsTurtleContainer(true);
  }
  spawnStartHarvester(2);
  supplyBuilders();
  supplyJamers();
  supplyDefenders();
  supplyRoads();
  supplyContainer();
  const tarProtectPoss = getRangePoss(spawn).filter(
    i => absRange(spawn, i) === 2
  );
  const SCEnergy = getSpawnAndBaseContainerEnergy();
  SAN(displayPos(), "SCEnergy", SCEnergy);
  const unProtectPoss = tarProtectPoss.filter(
    i => !findGO(i, StructureRampart) && !findGO(i, StructureWall)
  );
  if (tick > 1700 && SCEnergy < 400) {
    if (unProtectPoss.length > 0) {
      SA(displayPos(), "final protect");
      myCSs.forEach(i => {
        if (
          i.progress === 0 &&
          i.master.structure instanceof StructureRampart
        ) {
          SA(i, "remove this");
          i.master.remove();
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
}

export function supplyWalls(tarProtectPoss: Pos[]) {
  SA(displayPos(), "supplyWalls");
  for (const pos of tarProtectPoss) {
    SA(pos, "supply wall at here");
    supplyCS(pos, StructureWall, 11);
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
    if (buildExtraRamRate > startBias + 5 * increaseBias) {
      supplyCS(
        { x: spawn.x - 2 * leftRate(), y: spawn.y + 1 },
        StructureRampart,
        ramWorth,
        false,
        false
      );
    }
    if (buildExtraRamRate > startBias + 4 * increaseBias) {
      supplyCS(
        { x: spawn.x - 2 * leftRate(), y: spawn.y - 1 },
        StructureRampart,
        ramWorth,
        false,
        false
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
  const cssAtSpawn = myCSs.filter(i => atPos(i, spawn));
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
  const rangePos = getRangePoss(spawn).filter(i => !findGO(i, StructureWall));
  for (let pos of rangePos) {
    if (!atPos(pos, spawn)) {
      if (supplyCS(pos, StructureRampart, 10)) {
        break;
      }
    }
  }
}
/**supply the roads around the base*/
export function supplyRoads(strength: number = 2) {
  let rangePos;
  if (strength === 0) {
    rangePos = getRangePoss(spawn, 1).filter(
      i => X_axisDistance(spawn, i) === 0 || Y_axisDistance(spawn, i) === 0
    );
  } else if (strength === 1) {
    rangePos = getRangePoss(spawn);
  } else {
    const rectPos = getRangePoss(spawn, 2).filter(
      i =>
        GR(spawn, i) === 2 &&
        X_axisDistance(spawn, i) === 2 &&
        Y_axisDistance(spawn, i) <= 1
    );
    rangePos = getRangePoss(spawn).concat(rectPos);
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
  const aroundCon = containers.find(i => Adj(i, spawn) && !energyFull(i));
  SA(displayPos(), "supplyContainer aroundCon=" + COO(aroundCon));
  if (!aroundCon) {
    const pos = posPlusVec(spawn, leftVector());
    SA(displayPos(), "pos=" + COO(pos));
    createCS_wait(pos, StructureContainer, 13);
  }
}
