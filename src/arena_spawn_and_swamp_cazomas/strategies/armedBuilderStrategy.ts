import { CARRY } from "game/constants";
import { StructureExtension } from "game/prototypes";

import { createCS } from "../gameObjects/CS";
import {
  myConstructionSites,
  myExtensions,
} from "../gameObjects/GameObjectInitialize";
import { displayPos } from "../gameObjects/HasHits";
import {
  EEB,
  resetStartGateAvoidFromEnemies,
  spawn,
  spawnAndExtensionsEnergy,
} from "../gameObjects/spawn";
import { spawnBySpawnTypeList, SpawnType } from "../gameObjects/spawnTypeList";
import { builderStandard } from "../roles/builder";
import { defender_rampart } from "../roles/defender";
import { harvester } from "../roles/harvester";
import { jamer } from "../roles/jamer";
import { spawnRusher } from "../roles/spawnRusher";
import { TB } from "../utils/autoBodys";
import {
  enemyArmyReduce,
  enemyBuilderBonus,
  ticksBonus,
  totalInferiorityBonus,
  totalSuperiorityRateReduce,
} from "../utils/bonus";
import { addStrategyTick, leftRate, strategyTick, tick } from "../utils/game";
import { GR, posPlusVec, Vec, VecMultiplyConst } from "../utils/Pos";
import { SA, SAN } from "../utils/visual";
import { useStandardTurtling } from "./turtle";

/**use a bunch of builder with ATTACK part to confuse enemy and harve huge
 * amount of energy
 */
export function useArmedBuilderStrategy() {
  const st = strategyTick;
  const TKB2_2 = ticksBonus(200, 2);
  const TKB2_4 = ticksBonus(200, 4);
  const TKB4_4 = ticksBonus(400, 4);
  const TKB4_2 = ticksBonus(400, 2);
  const TSRR = totalSuperiorityRateReduce();
  const EBB1p7 = enemyBuilderBonus(1.7);
  const EAR = enemyArmyReduce(1.5);
  const TG800_3 = tick >= 800 ? 3 : 1; //tick greater than 1000
  const TG1500_3 = tick >= 1500 ? 3 : 1;
  const extraExtBonus =
    tick <= 400 &&
    (myExtensions.find(i => GR(i, spawn) <= 7) !== undefined ||
      myConstructionSites.find(
        i => GR(i, spawn) <= 7 && i.structure instanceof StructureExtension
      ) !== undefined)
      ? 2.5
      : 1;
  const TG300_1p5 = tick >= 300 ? 1.5 : 1;
  const TIB = totalInferiorityBonus();
  if (tick === 1) {
    createCS(
      posPlusVec(spawn, VecMultiplyConst(new Vec(4, 2), leftRate())),
      StructureExtension,
      11
    );
  }
  SAN(displayPos(), "extraExtBonus", extraExtBonus);
  SA(
    displayPos(),
    "spawnAndExtensionsEnergy(spawn)=" + spawnAndExtensionsEnergy(spawn)
  );
  resetStartGateAvoidFromEnemies();
  useStandardTurtling(st, 1);
  const spawnTypeList: SpawnType[] = [
    //150+600+100+240=1090
    new SpawnType(
      builderStandard,
      1 * TKB4_2 * extraExtBonus * EEB(1090, 2.5),
      TB("12M3CW3A"),
      fri => fri.filter(i => i.role === builderStandard).length
    ),
    //150+500+100+240=990
    new SpawnType(
      builderStandard,
      1 * TKB4_2 * EEB(990, 2),
      TB("10M3CW3A"),
      fri => fri.filter(i => i.role === builderStandard).length
    ),
    //150+250+100+80=580
    new SpawnType(
      builderStandard,
      1 * TG300_1p5 * TKB4_2 * EEB(530, 1.4),
      TB("5M3CWA"),
      fri => fri.filter(i => i.role === builderStandard).length
    ),
    //100+200+100+80=480
    new SpawnType(
      builderStandard,
      1 * TG300_1p5 * EEB(480, 1.2),
      TB("4M2CWA"),
      fri => fri.filter(i => i.role === builderStandard).length
    ),
    //50+150+100+80=380
    new SpawnType(
      builderStandard,
      1 * TG300_1p5 * EEB(380, 1.1),
      TB("3MCWA"),
      fri => fri.filter(i => i.role === builderStandard).length
    ),
    //280
    new SpawnType(
      defender_rampart,
      0.6 * TIB * EEB(280, 1.8),
      TB("ARM"),
      fri => fri.filter(i => i.role === defender_rampart).length
    ),
    //50
    new SpawnType(
      jamer,
      0.8 * TKB2_4 * TKB4_4 * EBB1p7 * TSRR * EEB(50, 1.2),
      TB("M"),
      fri => fri.filter(i => i.role === jamer).length
    ),
    //100
    // //500
    // new SpawnType(stdHealer, 0.15 * EEB(500, 1.4), TB("5MH"),
    // 	fri => fri.filter(i => i.role === stdHealer).length),
    // //400
    // new SpawnType(stdShoter, 0.3 * EEB(400, 1.4), TB("5MR"),
    // 	fri => fri.filter(i => i.role === stdShoter).length),
    //330
    new SpawnType(
      spawnRusher,
      0.5 * EAR * TG800_3 * TG1500_3 * EEB(330, 1.4),
      TB("5MA"),
      fri => fri.filter(i => i.role === spawnRusher).length
    ),
    //230
    new SpawnType(
      spawnRusher,
      0.5 * EAR * TG800_3 * TG1500_3 * EEB(230, 1.1),
      TB("3MA"),
      fri => fri.filter(i => i.role === spawnRusher).length
    ),
    // //330
    // new SpawnType(spawnStealer, 0.5 * EAR * EEB(330, 1.4), TB("5MA"),
    // 	fri => fri.filter(i => i.role === spawnStealer).length),
    //10+100+80
    // new SpawnType(stdAttacker, 0.12 * TKB2_4 * EEB(190, 1.4), TB("T2MA"),
    // 	fri => fri.filter(i => i.role === stdAttacker).length),
    //200
    new SpawnType(
      harvester,
      0.4 * EEB(200, 1.4),
      TB("3CM"),
      fri =>
        fri.filter(i => i.role === harvester && i.getBodypartsNum(CARRY) >= 2)
          .length
    ),
  ];
  spawnBySpawnTypeList(spawnTypeList);
  addStrategyTick();
}
