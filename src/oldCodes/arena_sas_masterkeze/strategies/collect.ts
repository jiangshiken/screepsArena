import { TERRAIN_WALL } from "game/constants";
import { ConstructionSite, Creep, Resource, RoomPosition, StructureContainer, StructureExtension, StructureRampart } from "game/prototypes";
import { createConstructionSite, findClosestByRange, getObjectsByPrototype, getTerrainAt, getTicks } from "game/utils";

import { BodyPartHelper } from "arena_sas_masterkeze/bodypartHelper";

import { DataHelper } from "../dataHelper";
import { Strategy, StrategyContent, Task } from "../strategy";

// 拖车任务
interface PullTaskContent {
  // 判断超时
  start: number;
  driver: Creep;
  passenger: Creep;
  target: RoomPosition;
}

// 建造任务
interface BuildTaskContent {
  builder: Creep;
  resource: Resource;
  exts: RoomPosition[];
  sites: ConstructionSite[];
  energyAvailable?: number;
}
// 野外采集，拖车至掉落资源上，建造建筑消耗资源
interface CollectContent extends StrategyContent {
  drivers: Creep[];
  builders: Creep[];
  pullTasks: PullTask[];
  buildTasks: BuildTask[];
  unUsedBuilderCount: number;
  unUsedDriverCount: number;
  unUsedResourceCount: number;
}

class PullTask implements Task<PullTaskContent> {
  content: PullTaskContent;
  get driver() {
    return this.content.driver;
  }
  get passenger() {
    return this.content.passenger;
  }
  get target() {
    return this.content.target;
  }
  constructor(content: PullTaskContent) {
    this.content = content;
  }
  run() {
    let driver = DataHelper.exists(this.driver) ? this.driver : undefined;
    let passenger = DataHelper.exists(this.passenger) ? this.passenger : undefined;
    let target = this.target;
    if (driver && passenger && target) {
      if (driver.getRangeTo(passenger) > 1) {
        driver.moveTo(passenger);
        return;
      }
      if (passenger.store.energy > 0) {
        passenger.drop("energy");
      }
      if (driver.getRangeTo(target) > 0) {
        driver.moveTo(target, { swampCost: 1, plainCost: 1 });
        driver.pull(passenger);
        passenger.moveTo(driver);
      } else {
        driver.moveTo(passenger);
        driver.pull(passenger);
        passenger.moveTo(driver);
      }
    }
  }
}
class BuildTask implements Task<BuildTaskContent> {
  content: BuildTaskContent;
  get sites() {
    return this.content.sites;
  }
  get builder() {
    return this.content.builder;
  }
  get resource() {
    return this.content.resource;
  }
  get exts() {
    return this.content.exts;
  }
  get energyAvailable() {
    return this.content.energyAvailable;
  }
  set energyAvailable(val) {
    this.content.energyAvailable = val;
  }
  constructor(content: BuildTaskContent) {
    this.content = content;
  }
  run(): void {
    this.content.sites = this.sites.filter((s) => DataHelper.exists(s));
    if (!DataHelper.exists(this.builder)) return;
    let builder = this.builder;
    let resource = this.resource;
    let exts = this.exts;
    let sites = this.sites;
    // resource + store能造完才造，要不然移除site，优先填充
    let container = getObjectsByPrototype(StructureContainer).find((c) => DataHelper.exists(c) && !c.ticksToDecay && c.getRangeTo(builder) === 0);
    let ram = getObjectsByPrototype(StructureRampart).find((c) => DataHelper.exists(c) && c.my === true && c.getRangeTo(builder) === 0);
    let containerStore = DataHelper.exists(container) ? container!.store.energy : 0;
    let resourceAmount = DataHelper.exists(resource) ? resource.amount : 0;
    let energyAvailable = resourceAmount + containerStore + builder.store.energy;
    this.energyAvailable = energyAvailable;
    if (DataHelper.exists(resource)) {
      builder.pickup(resource);
    } else if (DataHelper.exists(container)) {
      builder.withdraw(container!, "energy");
    }
    const extsToFill = DataHelper.myExtensions.find((e) => e.getRangeTo(builder) === 1 && e.store.getFreeCapacity("energy")! > 0);

    let remainAmount = sites.length > 0 ? 10 : 0;

    if (extsToFill) {
      const fillAmount = Math.max(0, Math.min(builder.store.energy, extsToFill.store.getFreeCapacity("energy")!));
      if (fillAmount > 0) {
        builder.transfer(extsToFill, "energy", fillAmount);
      }
    } else if (DataHelper.exists(container)) {
      const fillAmount = Math.max(0, Math.min(builder.store.energy - 2 * remainAmount, container!.store.getFreeCapacity("energy")!));
      if (fillAmount > 0) {
        builder.transfer(container!, "energy", fillAmount);
      }
    }

    if (sites.length > 0) {
      const toBuild = sites[0];
      const progressRemain = toBuild.progressTotal! - toBuild.progress!;
      if (progressRemain < energyAvailable) {
        builder.build(toBuild);
      } else {
        // 移除工地
        toBuild.remove();
        this.content.sites = [];
      }
    } else {
      if (!ram) {
        const site = createConstructionSite(builder, StructureRampart).object;
        if (site) {
          this.content.sites = [site];
        }
      } else {
        const extsToCreate = exts.filter((p) => !getObjectsByPrototype(StructureExtension).find((r) => DataHelper.exists(r) && r.x === p.x && r.y === p.y) && !getObjectsByPrototype(Resource).find((r) => DataHelper.exists(r) && r.x === p.x && r.y === p.y) && !getObjectsByPrototype(ConstructionSite).find((r) => DataHelper.exists(r) && r.x === p.x && r.y === p.y && r.my === true) && getTerrainAt(p) !== TERRAIN_WALL);
        if (!container && energyAvailable > extsToCreate.length * 300 + 100 + 200) {
          const site = createConstructionSite(builder, StructureContainer).object;
          if (site) {
            this.content.sites = [site];
          }
        } else if (energyAvailable > 320) {
          for (const tocreate of extsToCreate) {
            const site = createConstructionSite(tocreate, StructureExtension).object;
            if (site) {
              this.content.sites = [site];
              break;
            }
          }
        }
      }
    }
  }
}
export class CollectStrategy implements Strategy<CollectContent> {
  content: CollectContent;
  get drivers() {
    return this.content.drivers;
  }
  set drivers(val) {
    this.content.drivers = val;
  }
  get builders() {
    return this.content.builders;
  }
  set builders(val) {
    this.content.builders = val;
  }
  get pullTasks() {
    return this.content.pullTasks;
  }
  set pullTasks(val) {
    this.content.pullTasks = val;
  }
  get buildTasks() {
    return this.content.buildTasks;
  }
  set buildTasks(val) {
    this.content.buildTasks = val;
  }
  get unUsedBuilderCount() {
    return this.content.unUsedBuilderCount;
  }
  set unUsedBuilderCount(val) {
    this.content.unUsedBuilderCount = val;
  }
  get unUsedDriverCount() {
    return this.content.unUsedDriverCount;
  }
  set unUsedDriverCount(val) {
    this.content.unUsedDriverCount = val;
  }
  get unUsedResourceCount() {
    return this.content.unUsedResourceCount;
  }
  set unUsedResourceCount(val) {
    this.content.unUsedResourceCount = val;
  }
  constructor(content: CollectContent) {
    this.content = content;
  }
  run(): void {
    this.drivers = this.drivers.filter((c) => DataHelper.exists(c));
    this.builders = this.builders.filter((c) => DataHelper.exists(c));
    const runnable = this.builders.length > 0 || this.drivers.length > 0;
    if (!runnable) return;
    let newPullTasks: PullTask[] = [];
    let newBuildTasks: BuildTask[] = [];
    let usedResources: string[] = [];
    let usedDrivers: string[] = [];
    let usedBuilders: string[] = [];
    for (const pullTask of this.pullTasks) {
      let resource = getObjectsByPrototype(Resource).find((r) => DataHelper.exists(r) && r.getRangeTo(pullTask.target) === 0);
      if (DataHelper.exists(pullTask.driver) && DataHelper.exists(pullTask.passenger) && DataHelper.exists(resource) && pullTask.passenger!.getRangeTo(pullTask.target) !== 0) {
        pullTask.run();
        newPullTasks.push(pullTask);
        usedBuilders.push(pullTask.passenger.id);
        usedDrivers.push(pullTask.driver.id);
        usedResources.push(resource!.id);
      }
      if (DataHelper.exists(pullTask.passenger) && DataHelper.exists(resource) && pullTask.passenger!.getRangeTo(resource!) === 0) {
        let builder = pullTask.passenger!;
        const arrange =
          (builder.x + builder.y) % 2 === 0
            ? [
              { x: 1, y: 0 },
              { x: -1, y: 0 },
              { x: 0, y: -1 },
              { x: 0, y: 1 },
            ]
            : [
              { x: -1, y: -1 },
              { x: 1, y: -1 },
              { x: -1, y: 1 },
              { x: 1, y: 1 },
            ];
        let buildTask = new BuildTask({
          builder: builder,
          resource: resource!,
          exts: arrange.map((dp) => {
            return { x: builder.x + dp.x, y: builder.y + dp.y };
          }),
          sites: [],
        });
        this.buildTasks.push(buildTask);
      }
    }
    for (const buildTask of this.buildTasks) {
      if (DataHelper.exists(buildTask.builder) && (DataHelper.exists(buildTask.resource) || (buildTask.sites.length > 0 && buildTask.energyAvailable))) {
        buildTask.run();
        newBuildTasks.push(buildTask);
        usedBuilders.push(buildTask.builder.id);
        usedResources.push(buildTask.resource.id);
      }
    }
    // 分配任务
    let unUsedBuilders = this.builders.filter((c) => !usedBuilders.includes(c.id) && !DataHelper.isSpawning(c));
    let unUsedDrivers = this.drivers.filter((c) => !usedDrivers.includes(c.id) && !DataHelper.isSpawning(c));
    let unUsedResources = getObjectsByPrototype(Resource).filter((r) => !usedResources.includes(r.id) && DataHelper.exists(r) && r.amount > 900);
    while (unUsedBuilders.length > 0 && unUsedDrivers.length > 0 && unUsedResources.length > 0) {
      const builder = unUsedBuilders.pop()!;
      const driver = findClosestByRange(builder, unUsedDrivers);
      const resource = findClosestByRange(builder, unUsedResources);
      let pullTask = new PullTask({
        driver,
        passenger: builder,
        target: { x: resource.x, y: resource.y },
        start: getTicks(),
      });
      pullTask.run();
      newPullTasks.push(pullTask);
      unUsedDrivers = unUsedDrivers.filter((c) => c.id !== driver.id);
      unUsedResources = unUsedResources.filter((c) => c.id !== resource.id);
    }

    for (const driver of unUsedDrivers) {
      const nearyByBuilder = this.builders.find((b) => b.getRangeTo(driver) === 1);
      if (nearyByBuilder) {
        // 不要占住建造位置
        driver.moveTo(nearyByBuilder, { flee: true, range: 2 });
      }
    }
    this.unUsedBuilderCount = unUsedBuilders.length + this.builders.filter((c) => DataHelper.isSpawning(c)).length;
    this.unUsedDriverCount = unUsedDrivers.length + this.drivers.filter((c) => DataHelper.isSpawning(c)).length;
    this.unUsedResourceCount = unUsedResources.length;
    this.buildTasks = newBuildTasks;
    this.pullTasks = newPullTasks;
  }
  scaleUp(): Boolean {
    const driverBody = BodyPartHelper.toBodyParts("mmmmmmmmmm");
    const builderBody = BodyPartHelper.toBodyParts("wwcc");
    if (this.drivers.length === 0) {
      let mySpawn = DataHelper.mySpawn;
      const creep = mySpawn.spawnCreep(driverBody).object;
      if (creep) {
        this.drivers.push(creep);
      }
    } else if (this.builders.length === 0) {
      let mySpawn = DataHelper.mySpawn;
      const creep = mySpawn.spawnCreep(builderBody).object;
      if (creep) {
        this.builders.push(creep);
      }
    } else {
      if (this.unUsedDriverCount < this.unUsedBuilderCount) {
        let mySpawn = DataHelper.mySpawn;
        const creep = mySpawn.spawnCreep(driverBody).object;
        if (creep) {
          this.drivers.push(creep);
        }
      } else if (this.unUsedBuilderCount === 0 && this.unUsedResourceCount > 0) {
        let mySpawn = DataHelper.mySpawn;
        const creep = mySpawn.spawnCreep(builderBody).object;
        if (creep) {
          this.builders.push(creep);
        }
      } else {
        return false;
      }
    }
    return true;
  }
}
