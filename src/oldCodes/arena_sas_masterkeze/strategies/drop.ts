import { Creep, StructureContainer } from "game/prototypes";
import { findClosestByRange, getObjectsByPrototype } from "game/utils";

import { BodyPartHelper } from "../bodypartHelper";
import { DataHelper } from "../dataHelper";
import { Strategy, StrategyContent } from "../strategy";

/**
 * 野外container扔地上
 */
interface DropContent extends StrategyContent {
  tasks: DropTask[];
  creeps: Creep[];
}

interface DropTaskContent {
  creep: Creep;
  container: StructureContainer;
}
class DropTask {
  content: DropTaskContent;
  get creep() {
    return this.content.creep;
  }
  get container() {
    return this.content.container;
  }
  constructor(content: DropTaskContent) {
    this.content = content;
  }
  run() {
    let creep = DataHelper.exists(this.creep) ? this.creep : undefined;
    let container = DataHelper.exists(this.container)
      ? this.container
      : undefined;
    if (creep && container) {
      if (creep.getRangeTo(container) === 0) {
        // 在容器上了
        if (creep.store.energy > 0) {
          creep.drop("energy");
        } else {
          creep.withdraw(container, "energy");
        }
      } else {
        creep.moveTo(container);
      }
    }
  }
}

export class DropStrategy implements Strategy<DropContent> {
  content: DropContent;
  get creeps() {
    return this.content.creeps;
  }
  set creeps(val) {
    this.content.creeps = val;
  }
  get tasks() {
    return this.content.tasks;
  }
  set tasks(val) {
    this.content.tasks = val;
  }
  constructor(content: DropContent) {
    this.content = content;
  }
  run(): void {
    this.creeps = this.creeps.filter(c => DataHelper.exists(c));
    if (this.creeps.length == 0) return;
    let newTasks: DropTask[] = [];
    let usedCreeps: string[] = [];
    let usedContainers: string[] = [];
    let creeps = this.creeps;
    let tasks = this.tasks;
    for (const task of tasks) {
      if (
        DataHelper.exists(task.creep) &&
        DataHelper.exists(task.container) &&
        (task.creep.store.energy > 0 || task.container.store.energy > 0)
      ) {
        task.run();
        usedCreeps.push(task.creep.id);
        usedContainers.push(task.container.id);
        newTasks.push(task);
      }
    }
    if (usedCreeps.length < creeps.length) {
      // 还有未分配的creep
      const unUsedCreeps = creeps.filter(c => !usedCreeps.includes(c.id));
      let containers = getObjectsByPrototype(StructureContainer).filter(
        c =>
          DataHelper.exists(c) &&
          c.ticksToDecay &&
          c.store &&
          c.store.energy > 0 &&
          !usedContainers.includes(c.id)
      );
      for (const creep of unUsedCreeps) {
        let options = containers.filter(
          c => creep.getRangeTo(c) + 10 <= c.ticksToDecay!
        );
        if (options.length > 0) {
          let container = findClosestByRange(creep, options);
          let newTaskContent = {
            creep,
            container,
          };
          let newTask = new DropTask(newTaskContent);
          newTask.run();
          newTasks.push(newTask);
          // 用过了
          containers = containers.filter(c => c.id !== container.id);
        } else {
          creep.moveTo({ x: 25, y: 25 });
        }
      }
    }
    this.tasks = newTasks;
  }
  scaleUp(): Boolean {
    const dropBody = "ccm";
    if (this.creeps.length < 2) {
      let mySpawn = DataHelper.mySpawn;
      const ret = mySpawn.spawnCreep(BodyPartHelper.toBodyParts(dropBody));
      if (ret.object) {
        this.creeps.push(ret.object);
      }
      return true;
    }
    return false;
  }
}

(global as any).DropStrategy = DropStrategy;
