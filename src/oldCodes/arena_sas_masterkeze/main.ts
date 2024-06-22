import { ATTACK, CARRY, HEAL, RANGED_ATTACK, RESOURCE_ENERGY } from "game/constants";
import { Creep, Resource, StructureContainer, StructureRampart } from "game/prototypes";
import { getObjectsByPrototype, getTicks } from "game/utils";

import { BodyPartHelper } from "./bodypartHelper";
import { CreepHelper } from "./creepHelper";
import { DataHelper } from "./dataHelper";
import { CollectStrategy } from "./strategies/collect";
import { DropStrategy } from "./strategies/drop";
import { MaintainStrategy } from "./strategies/maintain";
import { OpeningStrategy } from "./strategies/opening";

interface PincerTask {
  force: Creep[];
  target: Creep;
}

/**
 * 被动策略，没有其他信息的情况下，合理使用 attack, ra, rma, heal, rh 方法
 * 带有attack组件：正在被攻击的爬（dps多 > dps 少） > 不在ram底下的爬（dps多 > dps 少） > 敌方非ram建筑（spawn > ext，血量少 > 血量多） > 敌方ram(血量少 > 血量多)
 * 带有RA组件：被敌方单位贴脸或攻击范围内敌方单位 >= 3，无脑rma，其他情况同attack优先级
 * 带有heal组件：不在ram下>在ram下，受伤的自己>受伤的贴脸单位（血量少 > 血量多，dps多 > dps少）> 受伤的不贴脸单位（血量少 > 血量多，dps多 > dps少）> ram下的受伤单位（距离近>距离远）> 不受伤的贴脸单位 >
 * @param creep
 */
function runPassive(creep: Creep) {
  if (!DataHelper.exists(creep)) return;
  let attack = false;
  let ra = false;
  let heal = false;
}

interface AntiRush {
  creeps: Creep[];
}

/**
 * 利用rampart顶住rush强拆，时机合适时出击歼灭对手
 * 注意事项：为spawn留出空位，移动靠对穿
 * @param antiRush
 */
function runAntiRush(antiRush: AntiRush) {
  antiRush.creeps = antiRush.creeps.filter((c) => DataHelper.exists(c));
  let myCreeps = antiRush.creeps;
  let mySpawn = DataHelper.mySpawn;
  // 这些是活动空间
  let rams = getObjectsByPrototype(StructureRampart).filter((r) => DataHelper.exists(r) && r.my && r.getRangeTo(mySpawn) === 1);
  let spaceRecord: { x: number; y: number; last?: Creep }[] = rams.map((r) => {
    return {
      x: r.x,
      y: r.y,
      last: DataHelper.getCreepAt(r),
    };
  });
  let defenceOnly = true;
  let enemy = DataHelper.hostileCreeps.filter((c) => c.getRangeTo(mySpawn) <= 4);

  // 形势判断，什么时候主动出击
  // if (defenceOnly && enemy.length > 0) {
  // 	// attacker先决策
  // 	let attackers = myCreeps.filter(c => DataHelper.hasActivePart(c, ATTACK));
  // 	let rangers = myCreeps.filter(c => DataHelper.hasActivePart(c, RANGED_ATTACK));
  // 	const enemyNearSpawn = enemy.filter(c => c.getRangeTo(mySpawn) === 1);
  // 	// 得分从高到低排序
  // 	enemyNearSpawn.sort((a, b) => {
  // 		return DataHelper.getAttackPriority(b) - DataHelper.getAttackPriority(a);
  // 	});
  // 	let target = enemyNearSpawn.length > 0 ? enemyNearSpawn[0] : undefined;
  // 	if (!target) {
  // 	}
  // 	for (const attacker of attackers) {
  // 		if (target) {
  // 			if (attacker.getRangeTo(attacker) === 1) {
  // 				attacker.attack(target);
  // 			} else {
  // 				runPassive(attacker);
  // 				// ram下没有爬，或者爬还没移动过
  // 				// let reachablePositions = spaceRecord.filter(
  // 				// 	r => target!.getRangeTo(r) === 1 && (!r.last || !DataHelper.hasActivePart(r.last!, ATTACK))
  // 				// );
  // 				// reachablePositions.sort((a, b) => {
  // 				// 	// 优先级 没有爬 > 无攻击部件爬 > ra
  // 				// 	let creepA = a.last;
  // 				// 	let creepB = b.last;
  // 				// 	const scores = [creepA, creepB].map(c => {
  // 				// 		if (!c) return 3;
  // 				// 		if (DataHelper.hasActivePart(c, ATTACK)) return 0;
  // 				// 		if (DataHelper.hasActivePart(c, RANGED_ATTACK)) return 1;
  // 				// 		return 2;
  // 				// 	});
  // 				// 	return scores[1] - scores[0];
  // 				// });
  // 				// let targetPositon = reachablePositions[0];
  // 				// if (targetPositon) {
  // 				// 	if (attacker.getRangeTo(targetPositon) === 1) {
  // 				// 		let creepUnder = targetPositon.last;
  // 				// 		spaceRecord = spaceRecord.filter(
  // 				// 			r =>
  // 				// 				!(
  // 				// 					(r.x === attacker.x && r.y === attacker.y) ||
  // 				// 					(r.x === targetPositon.x && r.y === targetPositon.y)
  // 				// 				)
  // 				// 		);
  // 				// 		if (!creepUnder) {
  // 				// 			attacker.moveTo(targetPositon);
  // 				// 			spaceRecord.push({
  // 				// 				x: attacker.x,
  // 				// 				y: attacker.y,
  // 				// 				last: undefined
  // 				// 			});
  // 				// 		} else {
  // 				// 			attacker.moveTo(creepUnder);
  // 				// 			attacker.pull(creepUnder!);
  // 				// 			creepUnder!.moveTo(attacker);
  // 				// 		}
  // 				// 	} else {
  // 				// 		let nearPosition = reachablePositions.find(p => attacker.getRangeTo(p) === 1);
  // 				// 		if (nearPosition) {
  // 				// 			let creepUnder = nearPosition.last;
  // 				// 			spaceRecord = spaceRecord.filter(
  // 				// 				r =>
  // 				// 					!(
  // 				// 						(r.x === attacker.x && r.y === attacker.y) ||
  // 				// 						(r.x === nearPosition!.x && r.y === nearPosition!.y)
  // 				// 					)
  // 				// 			);
  // 				// 			if (!creepUnder) {
  // 				// 				attacker.moveTo(nearPosition!);
  // 				// 				spaceRecord.push({
  // 				// 					x: attacker.x,
  // 				// 					y: attacker.y,
  // 				// 					last: undefined
  // 				// 				});
  // 				// 			} else {
  // 				// 				attacker.moveTo(creepUnder);
  // 				// 				attacker.pull(creepUnder!);
  // 				// 				creepUnder!.moveTo(attacker);
  // 				// 			}
  // 				// 		}
  // 				// 	}
  // 				// }
  // 			}
  // 		} else {
  // 			runPassive(attacker);
  // 		}
  // 	}
  // 	for (const ranger of rangers) {
  // 		if (target) {
  // 			if (!spaceRecord.find(x => ranger.getRangeTo(x) === 0)) {
  // 				if (ranger.getRangeTo(target) === 1) {
  // 					ranger.rangedMassAttack();
  // 				} else if (ranger.getRangeTo(target) <= 3) {
  // 					ranger.rangedAttack(target);
  // 				} else {
  // 				}
  // 			}
  // 		} else {
  // 			runPassive(ranger);
  // 		}
  // 	}
  // }
}

let antiRush: AntiRush = {
  creeps: [],
};

/**
 * 根据对方rush部队出对策防守单位
 * 默认出一个 4ra4m
 * 对方红球较多：4a4m? 计算一个能顶住的红球
 * 对方绿球、蓝球较多：
 * 1. 出红球2夹1
 * 2. 出大一号的蓝绿球主动出击
 *
 * @param antiRush
 */
function scaleUpAntiRush(antiRush: AntiRush) {
  const mySpawn = DataHelper.mySpawn;
  const hostile = DataHelper.hostileCreeps.filter((c) => (DataHelper.spawnVector.x > 0 ? c.x >= mySpawn.x - 7 : c.x <= mySpawn.x + 7));
  let attacker = antiRush.creeps.find((x) => CreepHelper.hasActivePart(x, ATTACK));
  let ranger = antiRush.creeps.find((x) => CreepHelper.hasActivePart(x, RANGED_ATTACK));
  let healer = antiRush.creeps.find((x) => CreepHelper.hasActivePart(x, HEAL));
  let { aCount, raCount, hCount, cCount } = hostile.reduce(
    (prev, curr) => {
      let out = {
        aCount: prev.aCount + CreepHelper.getActivePartCount(curr, ATTACK),
        raCount: prev.raCount + CreepHelper.getActivePartCount(curr, RANGED_ATTACK),
        hCount: prev.hCount + CreepHelper.getActivePartCount(curr, HEAL),
        cCount: prev.cCount + CreepHelper.getActivePartCount(curr, CARRY),
      };
      return out;
    },
    {
      aCount: 0,
      raCount: 0,
      hCount: 0,
      cCount: 0,
    }
  );
  if (aCount === 0 && raCount === 0 && cCount === 0) {
    return false;
  } else if (aCount === 0 && raCount === 0) {
    if (!ranger) {
      const creep = mySpawn.spawnCreep(BodyPartHelper.toBodyParts("mrrrrmmm")).object;
      if (creep) {
        antiRush.creeps.push(creep);
      }
      return true;
    }
    return false;
  } else {
    if (!attacker && aCount > 0) {
      const creep = mySpawn.spawnCreep(BodyPartHelper.toBodyParts("maaaammm")).object;
      if (creep) {
        antiRush.creeps.push(creep);
      }
      return true;
    }
    if (!ranger) {
      const creep = mySpawn.spawnCreep(BodyPartHelper.toBodyParts("mrrrrmmm")).object;
      if (creep) {
        antiRush.creeps.push(creep);
      }
      return true;
    }
    if (!healer) {
      const creep = mySpawn.spawnCreep(BodyPartHelper.toBodyParts("mmmhhh")).object;
      if (creep) {
        antiRush.creeps.push(creep);
      }
      return true;
    }
    return false;
  }
}

type ScaleUpFunction = () => Boolean;

let opening = new OpeningStrategy({
  complete: false,
  harvestCount: 0,
});

let maintain = new MaintainStrategy({
  rams: [],
  containers: [],
  sites: [],
  complete: false,
});

let drop = new DropStrategy({
  tasks: [],
  creeps: [],
});

let collect = new CollectStrategy({
  drivers: [],
  builders: [],
  pullTasks: [],
  buildTasks: [],
  unUsedBuilderCount: 0,
  unUsedDriverCount: 0,
  unUsedResourceCount: 0,
});

function oldMain() {
  const tick = getTicks();
  if (!tick || tick < 1) return;
  // 开局配置
  if (!opening.complete) {
    opening.run();
    return;
  }


  // 执行所有容器
  let mySpawn = DataHelper.mySpawn;
  let container = getObjectsByPrototype(StructureContainer).find((c) => c.getRangeTo(mySpawn!) === 4 && c.store.energy > 0);
  if (!container && maintain.transporter && maintain.transporter.store.energy <= 20) {
    drop.creeps.push(maintain.transporter!);
    maintain.transporter = undefined;
  }
  maintain.run();
  drop.run();
  collect.run();
  let scaleUpStrategies: { scaleUp: ScaleUpFunction }[] = [];
  // 决定各个容器scaleUp的优先级
  scaleUpStrategies = [drop, collect];
  // 按优先级执行所有scaleUp方法
  for (const strategy of scaleUpStrategies) {
    if (strategy.scaleUp()) {
      break;
    }
  }
}

function runTransporter(c: Creep) {
  let mySpawn = DataHelper.mySpawn;
  if (c.store.energy > 0) {
    if (c.getRangeTo(mySpawn) == 1) {
      c.transfer(mySpawn, RESOURCE_ENERGY);
      return;
    }
    c.drop(RESOURCE_ENERGY);
    c.moveTo(mySpawn, { swampCost: 1, plainCost: 1 });
    return;
  }
  let resource = c.findInRange(getObjectsByPrototype(Resource), 1);
  if (resource.length > 0) {
    c.pickup(resource[0]);
    return;
  }
  let container = c.findClosestByRange(getObjectsByPrototype(StructureContainer).filter(x => DataHelper.exists(x) && x.getRangeTo(mySpawn) > 10 && x.store.energy > 0));
  if (container) {
    if (c.getRangeTo(container) <= 1) {
      c.withdraw(container, RESOURCE_ENERGY);
    } else {
      c.moveTo(container, { swampCost: 1, plainCost: 1 });
    }
  }
}

let c: Creep | undefined = undefined;
export function loop(): void {
  if (getTicks() < 1) return;
  const tick = getTicks();
  if (!tick || tick < 1) return;
  // 开局配置
  if (!opening.complete) {
    opening.run();
    opening.scaleUp();
    return;
  }
  // 开局转运营
  if (DataHelper.exists(opening.builder) && DataHelper.exists(opening.transporter)) {
    if (!maintain.builder) {
      maintain.builder = opening.builder;
      maintain.transporter = opening.transporter;
      let mySpawn = DataHelper.mySpawn;
      // 家附件的基本ram配置
      let x = mySpawn.x;
      let y = mySpawn.y;
      maintain.containers.push({ x: x + DataHelper.spawnVector.x, y });
      maintain.rams.push({ x, y });
      maintain.rams.push({ x: x - 1, y }, { x: x + 1, y }, { x, y: y - 1 }, { x, y: y + 1 });
    }
  }
  maintain.run();
  collect.run();
  drop.run();
  // 决定各个容器scaleUp的优先级
  let scaleUpStrategies = [drop, collect];
  // 按优先级执行所有scaleUp方法
  for (const strategy of scaleUpStrategies) {
    if (strategy.scaleUp()) {
      break;
    }
  }
}
