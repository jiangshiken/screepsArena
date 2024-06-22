import { ResourceConstant } from "game/constants";
import { Creep, RoomPosition, Store, Structure, StructureContainer } from "game/prototypes";
import { getObjectsByPrototype } from "game/utils";

import { BodyPartHelper } from "./bodypartHelper";
import { DataHelper } from "./dataHelper";

function getCreep(bodyString: string) {
  let mySpawn = DataHelper.mySpawn;
  let ret = mySpawn.spawnCreep(BodyPartHelper.toBodyParts(bodyString));
  return ret.object;
}

function transport(creep: Creep, from: { store: Store<ResourceConstant> } & Structure, to: { store: Store<ResourceConstant> } & Structure) {
  if (creep.store.energy == 0) {
    if (creep.getRangeTo(from) > 0) {
      creep.moveTo(from, { range: 1 });
    } else {
      creep.withdraw(from, "energy");
      creep.moveTo(to, { range: 1 });
    }
  } else {
    if (creep.getRangeTo(to) > 0) {
      creep.moveTo(to, { range: 1 });
    } else {
      creep.transfer(from, "energy");
      creep.moveTo(from, { range: 1 });
      return true;
    }
  }
  return false;
}

function pull(driver: Creep, passenger: Creep, target: RoomPosition) {
  if (passenger.getRangeTo(target) === 0) return true;
  if (driver.getRangeTo(passenger) > 1) {
    driver.moveTo(passenger, { range: 1 });
  } else {
    driver.pull(passenger);
    passenger.moveTo(driver);
    if (driver.getRangeTo(target) > 0) {
      driver.moveTo(target);
    } else {
      driver.moveTo(passenger);
      return true;
    }
  }
  return false;
}

export function* opening() {
  let transporter = getCreep("ccmm");
  let mySpawn = DataHelper.mySpawn;
  while (!transporter || transporter.spawning) {
    yield undefined;
    if (!transporter) transporter = getCreep("ccmm");
  }
  let harvestCount = 0;
  let builder = getCreep("wwcc");
  let containerPos = { x: mySpawn.x + 3 * DataHelper.spawnVector.x, y: mySpawn.y };
  let container = getObjectsByPrototype(StructureContainer).find((c) => c.getRangeTo(containerPos) === 0);
  transport(transporter, container!, mySpawn);
  while (!builder || builder.spawning || harvestCount < 3) {
    yield undefined;
    if (!builder) builder = getCreep("wwcc");
    if (transport(transporter, container!, mySpawn)) {
      harvestCount += 1;
    }
  }
  let targetPos = { x: mySpawn.x + DataHelper.spawnVector.x, y: mySpawn.y };
  pull(transporter, builder, targetPos);
  while (builder.getRangeTo(targetPos) > 0) {
    yield undefined;
    pull(transporter, builder, targetPos);
  }
  transporter.moveTo(container!, { range: 1 });
}
