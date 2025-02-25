import { ATTACK, WORK } from "game/constants";
import { StructureExtension, StructureRampart } from "game/prototypes";
import { findClosestByRange } from "game/utils";

import {
  Cre,
  Task_Cre,
  Task_Role,
} from "arena_spawn_and_swamp_cazomas/gameObjects/Cre";
import {
  CS,
  enemySpawn,
  mySpawn,
} from "arena_spawn_and_swamp_cazomas/gameObjects/GameObjectInitialize";
import { Adj, closest } from "arena_spawn_and_swamp_cazomas/utils/Pos";
import { protectSelfExtraTaunt } from "../gameObjects/battle";
import { canBeBuildByCre, Cre_build } from "../gameObjects/Cre_build";
import { calAroundEnergy, getHarvables } from "../gameObjects/Cre_harvest";
import {
  defendTheRampart,
  gotoTargetRampart,
} from "../gameObjects/CreCommands";
import {
  getEnemyThreats,
  hasEnemyArmyAround,
  hasEnemyThreatAround,
  Role,
} from "../gameObjects/CreTool";
import {
  createCS,
  getMaxWorthCSS,
  hasConstructionSite,
} from "../gameObjects/CS";
import { S } from "../gameObjects/export";
import {
  friends,
  HasEnergy,
  HasStore,
  myCSs,
  myRamparts,
} from "../gameObjects/GameObjectInitialize";
import { overallMap } from "../gameObjects/overallMap";
import {
  getMyHealthyRamparts,
  inMyHealthyRampart,
  inMyRampart,
  myRampartAt,
} from "../gameObjects/ramparts";
import {
  getSpawnAndBaseContainerEnergy,
  inMyBaseRan,
} from "../gameObjects/spawn";
import {
  blocked,
  energyFull,
  energylive,
  getCapacity,
  getEnergy,
  getOutsideContainers,
  getSpawnAroundFreeContainers,
  getSpawnAroundLiveContainers,
} from "../gameObjects/UnitTool";
import { tick } from "../utils/game";
import { d2, getClassName, invalid } from "../utils/JS";
import { atPos, COO, getRangePoss, GR, midPoint, Pos } from "../utils/Pos";
import { findTask } from "../utils/Task";
import { SA, SAN } from "../utils/visual";
export class builderTurtleInfo {
  returnEnergy: boolean;
  constructor(returnEnergy: boolean) {
    this.returnEnergy = returnEnergy;
  }
}

/**this type of builder will harvest outside after base building tasks finished*/
export const builder4Ram: Role = new Role(
  "builder4Ram",
  cre => new builder4RamJob(<Cre_build>cre)
);
export function isBuilderOutSide(role: Role | undefined): boolean {
  return role === builderStandard || role === builder4Ram;
}
/**job of builder4Ram*/
export class builder4RamJob extends Task_Role {
  master: Cre_build;
  constructor(master: Cre_build) {
    super(master);
    this.master = master;
    this.cancelOldTask(builder4RamJob);
  }
  loop_task() {
    const cre = this.master;
    SA(cre, "builder4RamJob");
    const scanCSRange = 8;
    if (myCSs.find(i => GR(mySpawn, i) <= scanCSRange)) {
      const css = <CS[]>(
        myCSs.filter(
          i => GR(i, mySpawn) <= scanCSRange && canBeBuildByCre(i, cre)
        )
      );
      const cs = getMaxWorthCSS(css);
      if (cs) {
        SA(cre, "builderNormalControl");
        builderNormalControl(cre, cs);
      } else {
        SA(cre, "job has no cs");
        if (myCSs.find(i => atPos(i, cre))) {
          SA(cre, "random move");
          cre.randomMove();
        }
      }
      // builderControl(cre);
    } else {
      SA(cre, "builderStandardControl");
      new builderStandardJob(cre);
    }
  }
}
/**get the energy of spawn and builderTurtles*/
export function spawnAndBuilderEnergy() {
  const builders = friends.filter(i => i.role === builderTurtle);
  let rtn = 0;
  for (let builder of builders) {
    rtn += getEnergy(builder);
  }
  rtn += getEnergy(mySpawn);
  return rtn;
}
/**Builder that used in trutling,will not go to wild resource.
 * Only stay at ramparts.
 */
export const builderTurtle: Role = new Role(
  "builderTurtle",
  cre => new builderTurtleJob(<Cre_build>cre)
);
/**builder that build base structures and assign base containers.
 * Can be used as defender
 */
export class builderTurtleJob extends Task_Role {
  master: Cre_build;
  constructor(master: Cre_build) {
    super(master);
    this.master = master;
  }
  loop_task(): void {
    const cre = this.master;
    SA(cre, "builderTurtleControl");
    cre.fight();
    cre.taskPriority = 9;
    //
    if (cre.appointMovementIsActived(1)) {
      cre.useAppointMovement();
      return;
    }
    //
    const scanCSRange = 4;
    const css = myCSs.filter(
      i => canBeBuildByCre(i, cre) && GR(i, mySpawn) <= scanCSRange
    );
    const canUseEnergy = getEnergy(cre) + getSpawnAndBaseContainerEnergy();
    SAN(cre, "canUseEnergy", canUseEnergy);
    const cs = getMaxWorthCSS(css);
    const emptyRamparts = myRamparts.filter(i => !blocked(i));
    const hasEmptyRampart: boolean = emptyRamparts.length > 0;
    const spawnHasRam = myRampartAt(mySpawn) !== undefined;
    SA(cre, "spawnHasRam=" + spawnHasRam);
    cre.setIsWorking(false);
    const appointmentValidTick = 1;
    if (!inMyRampart(cre) && hasEmptyRampart) {
      //if not in ram,move to ram
      SA(cre, "not in ram");
      if (cre.appointMovementIsActived(appointmentValidTick)) {
        SA(cre, "appointMovementIsActived");
        cre.useAppointMovement();
        return;
      }
      defendTheRampart(cre);
    } else if (
      hasEnemyArmyAround(cre, 1) &&
      spawnHasRam &&
      !(tick >= 1900 && cs && canUseEnergy >= 200)
    ) {
      SA(cre, "enemyAround");
      if (cre.appointMovementIsActived(appointmentValidTick)) {
        SA(cre, "appointMovementIsActived");
        cre.useAppointMovement();
        return;
      }
      defendTheRampart(cre);
    } else if (cs) {
      cre.setIsWorking(true);
      SA(cre, "build");
      if (cre.appointMovementIsActived(appointmentValidTick)) {
        SA(cre, "appointMovementIsActived");
        cre.useAppointMovement();
      } else {
        defendTheRampart(cre);
      }
      const cond1 =
        tick > 600 &&
        !spawnHasRam &&
        getEnergy(cre) >= 5 * cre.getBodyPartsNum(WORK);
      const cond2 = cre.getIsBuilding();
      if (cond1 || cond2) {
        SA(cre, "normalBuild");
        cre.normalBuild(cs);
      } else if (tick <= 300) {
        //time for build ramparts
        SA(cre, "collectResource");
        const harvables = (<HasEnergy[]>(
          getHarvables().filter(i => GR(i, mySpawn) <= 3)
        )).concat(mySpawn);
        const harvable = <HasEnergy>closest(cre, harvables);
        if (harvable) {
          cre.directWithdraw(harvable);
        }
      } else {
        //time after tick 300
        SA(cre, "withdrawNormal");
        builderTurtleWithdrawNormal(cre);
      }
    } else {
      cre.setIsWorking(false);
      //assign spawn energy to container
      if (energyFull(mySpawn)) {
        SA(cre, "withdraw spawn to container");
        if (getEnergy(cre) > 0) {
          SA(cre, "has en");
          const cons = getSpawnAroundFreeContainers();
          const con = findClosestByRange(cre, cons);
          if (con) {
            SA(cre, "has container");
            if (Adj(con, cre)) {
              cre.transferNormal(con);
            } else {
              gotoTargetRampart(cre, con);
            }
          }
        } else {
          SA(cre, "no en");
          if (GR(cre, mySpawn) <= 1) {
            cre.withdrawNormal(mySpawn);
          } else {
            gotoTargetRampart(cre, mySpawn);
          }
        }
      } else {
        const em = cre.extraMessage;
        const returnMod =
          em && em instanceof builderTurtleInfo && em.returnEnergy;
        if (
          !returnMod &&
          !energyFull(cre) &&
          canUseEnergy >= getCapacity(cre)
        ) {
          SA(cre, "withdraw backup energy");
          builderTurtleWithdrawNormal(cre);
        } else {
          if (returnMod && energylive(cre) && Adj(cre, mySpawn)) {
            cre.transferNormal(mySpawn);
          }
          SA(cre, "normal defend");
          if (cre.appointMovementIsActived(appointmentValidTick)) {
            SA(cre, "appointMovementIsActived");
            cre.useAppointMovement();
            return;
          }
          defendTheRampart(cre);
        }
      }
    }
  }
}
export function builderTurtleWithdrawNormal(cre: Cre_build) {
  let target: HasStore;
  const cons = getSpawnAroundLiveContainers();
  const con = findClosestByRange(cre, cons);
  if (con && energylive(con)) {
    SA(cre, "withdraw con");
    target = con;
  } else {
    SA(cre, "withdraw spawn");
    target = mySpawn;
  }
  if (GR(cre, target) <= 1) {
    SA(cre, "withdraw it");
    cre.withdrawNormal(target);
  } else {
    SA(cre, "go it");
    gotoTargetRampart(cre, target);
  }
}
/**
 * will search the 3*3 area to find an empty place to create the {@link CS}
 */
export function buildStructureByWorth(
  pos: Pos,
  type: any,
  worth: number = 1
): Pos | undefined {
  SA(pos, "buildStructure here type=" + getClassName(type));
  const poss = getRangePoss(pos);
  const mc = myCSs;
  const validPos = poss.find(i => !hasConstructionSite(i) && !blocked(i));
  if (validPos) {
    createCS(validPos, type, worth, true);
    return validPos;
  } else return undefined;
}
/**has builderStandard around the pos*/
export function hasBuilderStandardAround(pos: Pos) {
  const bss = friends.filter(i => isBuilderOutSide(i.role) && GR(i, pos) <= 1);
  return bss.length > 0;
}
/**the job of builderNormal*/
export function builderNormalControl(cre: Cre_build, tar: CS): boolean {
  if (cre.getIsBuilding()) {
    SA(cre, "directBuild");
    return cre.directBuild(tar);
  } else {
    SA(cre, "harvesterControl");
    if (getEnergy(cre) > 0) {
      cre.setIsBuilding(true);
    } else {
      const target = findClosestByRange(cre, getHarvables());
      cre.directWithdraw(target);
    }
    return true;
  }
}
/**Builder that will only harvest wild resources,if you give it an ATTACK part
 * it will rush enemySpawn when game near end
 */
export const builderStandard: Role = new Role(
  "builderStandard",
  cre => new builderStandardJob(<Cre_build>cre)
);
/**the job of builderStandard*/
export class builderStandardJob extends Task_Role {
  master: Cre_build;
  constructor(master: Cre_build) {
    super(master);
    this.master = master;
    this.cancelOldTask(builderStandardJob);
  }
  loop_task(): void {
    const cre = this.master;
    SA(cre, "melee");
    cre.fight();
    //
    const task = findTask(cre, BuilderStandardTask);
    if (!task) {
      if (cre.getBodyPartsNum(ATTACK) > 0) {
        SA(cre, "new ArmedBuilderTask(cre)");
        new ArmedBuilderTask(cre);
      } else {
        SA(cre, "new BuilderStandardTask(cre)");
        new BuilderStandardTask(cre);
      }
    }
  }
}
// /**the*/
/**steps*/
const goto_outside_resource: string = "goto outside resource";
const drop_on_the_ground = "drop on the ground";
const build_rampart = "build rampart";
const build_extensions = "build extensions";

export class BuilderStandardTask extends Task_Cre {
  readonly master: Cre_build;
  step: string = goto_outside_resource;
  readonly fleeRange: number;
  isWorking: boolean = true;
  readonly fleeBias: number;
  constructor(master: Cre_build) {
    super(master, Infinity);
    this.master = master;
    // resetStartGateAvoidFromEnemies();
    if (master.getBodyPartsNum(ATTACK) > 0) {
      this.fleeRange = 12;
      this.fleeBias = 7;
    } else {
      this.fleeRange = 8;
      this.fleeBias = 3;
    }
  }
  /**control steps and run away from danger*/
  loop_task(): void {
    const cre = this.master;
    // if (cpuBreakJudge(cre)) {
    //   cre.buildStatic();
    //   return;
    // }
    SA(cre, "step=" + this.step);
    const closestEnemy = findClosestByRange(cre, getEnemyThreats());
    const cs = <CS | undefined>(
      overallMap
        .get(cre)
        .find(
          i => i instanceof CS && i.master.structure instanceof StructureRampart
        )
    );
    SA(cre, "cs=" + S(cs));
    //try flee
    const workingExtra = this.isWorking ? -this.fleeBias : 0;
    const hasEnemyAround = hasEnemyThreatAround(cre, 4);
    SA(cre, "hasEnemyAround=" + hasEnemyAround);
    if (hasEnemyAround) {
      protectSelfExtraTaunt(cre, 0.5);
    }
    let doStep: boolean = true;
    if (!inMyHealthyRampart(cre) && hasEnemyAround) {
      SA(cre, "builder flee");
      protectSelfExtraTaunt(cre, 0.8);
      cre.dropEnergy();
      const ram = getMyHealthyRamparts().find(
        i => GR(i, cre) <= 10 && !blocked(i)
      );
      const realFleeRange = this.fleeRange + workingExtra;
      if (ram) {
        cre.MT(ram);
        doStep = false;
      } else if (cre.flee(realFleeRange, realFleeRange * 2)) {
        SA(cre, "flee");
        doStep = false;
      } else {
        doStep = true;
      }
      //go to outside resource
    }
    if (doStep) {
      //move to safe gate
      if (
        inMyBaseRan(cre) &&
        getEnemyThreats().find(i => inMyBaseRan(cre)) !== undefined
      ) {
        SA(cre, "move to safe gate");
        cre.MT(enemySpawn);
        doStep = false;
      } else {
        doStep = true;
      }
    }
    if (doStep) {
      if (this.step === goto_outside_resource && !hasEnemyAround) {
        SA(cre, "goto_outside_resource");
        this.gotoOutSideResource();
      } else if (this.step === drop_on_the_ground) {
        SA(cre, "drop_on_the_ground");
        this.dropOntheGround();
      } else if (this.step === build_rampart) {
        SA(cre, "build_rampart");
        this.buildRampart(cs, closestEnemy, this.fleeRange + 2);
      } else if (this.step === build_extensions) {
        SA(cre, "build_extensions");
        this.buildExtensions(cs, closestEnemy, this.fleeRange + 2);
      } else {
        SA(cre, "no work");
      }
    } else {
      SA(cre, "don't do step");
    }
  }
  /**the step of go to outside resource.It will avoid the harvable
   * that already has a builderStandard there
   */
  gotoOutSideResource() {
    const cre = this.master;
    if (inMyHealthyRampart(cre) && hasEnemyThreatAround(cre, 3)) {
      SA(cre, "i'm scared");
    } else {
      let harvestables = getHarvables().filter(i => {
        let j0 = getEnergy(i) > 500;
        let j1 = GR(i, mySpawn) >= 5;
        let j2 = !(hasBuilderStandardAround(i) && !(GR(cre, i) <= 1));
        let j3 = cre.reachableHarvable(i);
        return j0 && j1 && j2 && j3;
      });
      let har = closest(cre, harvestables);
      if (har) {
        cre.MT(har);
        cre.dropEnergy();
        if (GR(cre, har) <= 1) {
          cre.stop();
          this.step = drop_on_the_ground;
        }
      } else {
        cre.MT(midPoint);
      }
    }
  }
  /**drop the energy of container onto the ground*/
  dropOntheGround() {
    //drop con
    const cre = this.master;
    const ccs = getOutsideContainers().filter(
      i => getEnergy(i) > 0 && GR(i, cre) <= 1
    );
    const cc = closest(cre, ccs);
    if (cc) {
      cre.directWithdrawAndDrop(cc);
    } else {
      this.step = build_rampart;
    }
  }
  /**build the rampart for itself.It will not build it finished if not dangerous*/
  buildRampart(cs: CS | undefined, closestEnemy: Cre, fleeRange: number) {
    const cre = this.master;
    //if rampart is far from finished and enemy is still far away from here,
    //give up the building and directly build extensions
    if (
      cs &&
      GR(cre, closestEnemy) - fleeRange >
        (cs.progressTotal - cs.progress) / 5 &&
      cs.progressRate < 0.8
    ) {
      this.step = build_extensions;
      (<CS>cs).worth = 5;
    }
    //build ram
    let sumEn = calAroundEnergy(cre);
    sumEn += getEnergy(cre);
    if (sumEn >= 200) {
      if (inMyRampart(cre)) {
        this.step = build_extensions;
      } else {
        createCS(cre, StructureRampart, 5, true);
        if (hasEnemyArmyAround(cre, 1) && cre.getBodyParts(ATTACK).length > 0) {
          cre.fight();
        } else {
          cre.buildStatic();
        }
      }
    } else {
      this.step = goto_outside_resource;
    }
  }
  /**build extensions and fill it until all energy exhaust*/
  buildExtensions(cs: CS | undefined, closestEnemy: Cre, fleeRange: number) {
    const cre = this.master;
    if (
      !inMyRampart(cre) &&
      cs &&
      GR(cre, closestEnemy) - fleeRange <= (cs.progressTotal - cs.progress) / 5
    ) {
      this.step = build_rampart;
      (<CS>cs).worth = 12;
    }
    let sumEn: number = calAroundEnergy(cre);
    sumEn += getEnergy(cre);
    SA(cre, "sumEn=" + d2(sumEn));
    if (sumEn > 0) {
      if (getEnergy(cre) > 0) {
        let fb = cre.fillExtension();
        if (!fb) {
          SA(cre, "fillExtension=" + fb);
          if (sumEn > 0) {
            let css = myCSs.find(i => {
              let j0 = GR(i, cre) <= 3;
              let j1 = i.master.structure instanceof StructureExtension;
              let j2 = !blocked(i);
              // SA(i,"j0="+j0)
              // SA(i,"j1="+j1)
              // SA(i,"j2="+j2)
              return j0 && j1 && j2;
            });
            SA(cre, "css=" + COO(css));
            if (invalid(css)) {
              SA(cre, "create CS");
              let exPos: Pos | undefined = getRoundEmptyPosLeave1Empty(
                cre,
                true
              );
              if (exPos) {
                SA(exPos, "exPos here");
                if (sumEn >= 200) {
                  if (hasEnemyArmyAround(cre, 4)) {
                    createCS(exPos, StructureRampart, 9, true);
                  }
                  SA(exPos, "createCS");
                  createCS(exPos, StructureExtension, 8, true);
                } else {
                  this.step = goto_outside_resource;
                }
              } else {
                this.step = goto_outside_resource;
              }
            }
            if (
              hasEnemyArmyAround(cre, 1) &&
              cre.getBodyParts(ATTACK).length > 0
            ) {
              cre.fight();
            } else {
              cre.buildStatic();
            }
          } else {
            this.step = goto_outside_resource;
          }
        }
      } else {
        cre.withDrawStatic();
      }
    } else {
      this.step = goto_outside_resource;
    }
  }
}
/**the builderStandardTask when there is ATTACK part on the builder*/
export class ArmedBuilderTask extends BuilderStandardTask {
  rush: boolean;
  constructor(master: Cre_build) {
    super(master);
    this.rush = false;
  }
  loop_task() {
    const cre = this.master;
    if (friends.length > 45) {
      cre.upgrade.rush = true;
    }
    if (tick >= 1700 || cre.upgrade.rush) {
      //rush enemySpawn
      cre.dropEnergy();
      cre.MT(enemySpawn);
    } else {
      super.loop_task();
    }
  }
}
export function getRoundEmptyPosLeave1Empty(
  cre: Pos,
  containerBlock: boolean = false
): Pos | undefined {
  const roundPoss = getRangePoss(cre, 1);
  const emptyRoundPoss = roundPoss.filter(i => !blocked(i, true));
  if (emptyRoundPoss.length == 1) {
    //leave 1 empty avoid block Creep in 8 blocker
    return undefined;
  } else if (emptyRoundPoss.length >= 2) {
    return emptyRoundPoss[0];
  } else return undefined;
}
