import { ERR_NOT_IN_RANGE, LEFT, OK, RIGHT } from "game/constants";
import { Creep, StructureContainer } from "game/prototypes";
import { getObjectsByPrototype } from "game/utils";

import { BodyPartHelper } from "../bodypartHelper";
import { DataHelper } from "../dataHelper";
import { Strategy, StrategyContent } from "../strategy";

/**
 * 开局
 */
interface OpeningContent extends StrategyContent {
  complete: boolean;
  builder?: Creep;
  transporter?: Creep;
  harvestCount: number;
}

export class OpeningStrategy implements Strategy<OpeningContent> {
  content: OpeningContent;
  get complete() {
    return this.content.complete;
  }
  set complete(val) {
    this.content.complete = val;
  }
  get builder() {
    return this.content.builder;
  }
  set builder(val) {
    this.content.builder = val;
  }
  get transporter() {
    return this.content.transporter;
  }
  set transporter(val) {
    this.content.transporter = val;
  }
  get harvestCount() {
    return this.content.harvestCount;
  }
  set harvestCount(val) {
    this.content.harvestCount = val;
  }
  get harvestLimit() {
    return 3;
  }
  get towardSpawn() {
    return DataHelper.spawnVector.x > 0 ? LEFT : RIGHT;
  }
  get towardContainer() {
    return DataHelper.spawnVector.x > 0 ? RIGHT : LEFT;
  }
  constructor(content: OpeningContent) {
    this.content = content;
  }
  run(): void {
    if (this.complete) return;
    if (!this.transporter) return;
    let mySpawn = DataHelper.mySpawn;
    let transporter = this.transporter;
    if (this.harvestCount < this.harvestLimit) {
      if (transporter.store.energy == 0) {
        const target = { x: mySpawn.x + 4 * DataHelper.spawnVector.x, y: mySpawn.y };
        if (transporter.getRangeTo(target) > 1) {
          transporter.move(this.towardContainer);
        } else {
          const container = getObjectsByPrototype(StructureContainer).find((c) => c.getRangeTo(transporter!) === 1);
          transporter.withdraw(container!, "energy");
          transporter.move(this.towardSpawn);
        }
      } else {
        const tryTransfer = transporter.transfer(mySpawn, "energy");
        if (tryTransfer == ERR_NOT_IN_RANGE) {
          transporter.moveTo({ x: mySpawn.x + DataHelper.spawnVector.x, y: mySpawn.y }, { swampCost: 1, plainCost: 1 });
        }
        if (tryTransfer == OK) {
          this.harvestCount += 1;
          if (this.harvestCount < this.harvestLimit) {
            transporter.move(this.towardContainer);
            return;
          }
        }
      }
    }
    if (this.builder && !DataHelper.isSpawning(this.builder)) {
      let builder = this.builder;
      const target = { x: mySpawn.x + DataHelper.spawnVector.x, y: mySpawn.y };
      if (transporter.getRangeTo(builder) > 1) {
        transporter.moveTo(builder);
      } else {
        transporter.pull(builder);
        builder.moveTo(transporter);
        if (transporter.getRangeTo(target) == 0) {
          transporter.move(this.towardContainer);
          this.complete = true;
          console.log("开局完成");
        } else {
          transporter.moveTo(target);
        }
      }
    }
  }
  scaleUp(): Boolean {
    const transporterBody = "ccmm";
    const builderBody = "wwcc";
    let mySpawn = DataHelper.mySpawn;
    if (!this.transporter) {
      const ret = mySpawn.spawnCreep(BodyPartHelper.toBodyParts(transporterBody));
      if (ret.object) {
        this.transporter = ret.object;
      }
      return true;
    }
    if (!this.builder) {
      const ret = mySpawn.spawnCreep(BodyPartHelper.toBodyParts(builderBody));
      if (ret.object) {
        this.builder = ret.object;
      }
      return true;
    }
    return false;
  }
}

(global as any).OpeningStrategy = OpeningStrategy;
