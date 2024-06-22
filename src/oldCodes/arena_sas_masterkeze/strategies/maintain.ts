import { ERR_NOT_IN_RANGE, OK, WORK } from "game/constants";
import { ConstructionSite, Creep, RoomPosition, StructureContainer, StructureRampart } from "game/prototypes";
import { createConstructionSite, getObjectsByPrototype } from "game/utils";

import { CreepHelper } from "../creepHelper";
import { DataHelper } from "../dataHelper";
import { Strategy, StrategyContent } from "../strategy";

/**
 * 运维
 */
interface MaintainContent extends StrategyContent {
  builder?: Creep;
  transporter?: Creep;
  rams: RoomPosition[];
  containers: RoomPosition[];
  sites: ConstructionSite[];
  complete: Boolean;
}
export class MaintainStrategy implements Strategy<MaintainContent> {
  content: MaintainContent;
  get builder() {
    return this.content.builder;
  }
  get transporter() {
    return this.content.transporter;
  }
  set builder(val) {
    this.content.builder = val;
  }
  set transporter(val) {
    this.content.transporter = val;
  }
  get rams() {
    return this.content.rams;
  }
  get containers() {
    return this.content.containers;
  }
  get sites() {
    return this.content.sites;
  }
  get complete() {
    return this.content.complete;
  }
  set complete(val) {
    this.complete = val;
  }
  constructor(content: MaintainContent) {
    this.content = content;
  }
  run(): void {
    if (this.complete) return;
    // console.log("基础维护");
    this.builder = DataHelper.exists(this.builder) ? this.builder! : undefined;
    this.transporter = DataHelper.exists(this.transporter) ? this.transporter! : undefined;
    this.content.sites = this.sites.filter((s) => DataHelper.exists(s));
    let builder = this.builder;
    let transporter = this.transporter;
    let mySpawn = DataHelper.mySpawn;
    let container = getObjectsByPrototype(StructureContainer).find((c) => c.getRangeTo(mySpawn!) === 4 && c.store.energy > 0);
    const source = getObjectsByPrototype(StructureContainer).find((c) => c.getRangeTo(mySpawn!) === 1);
    if (DataHelper.exists(builder) || DataHelper.exists(transporter)) {
      transporter = transporter!;
      builder = builder!;
      if (DataHelper.exists(transporter)) {
        if (transporter.store.energy <= 20) {
          if (container) {
            if (transporter.getRangeTo(container) > 1) {
              transporter.moveTo(container);
            } else {
              transporter.withdraw(container!, "energy");
              transporter.moveTo(builder);
            }
          }
        } else {
          const tryTransfer = transporter.transfer(builder, "energy");
          if (tryTransfer == ERR_NOT_IN_RANGE) {
            transporter.moveTo(builder);
          }
          if (tryTransfer == OK) {
            if (container) {
              transporter.moveTo(container);
            }
          }
        }
      }
      if (this.containers.length > 0) {
        const tocreate = this.containers.find((p) => !getObjectsByPrototype(StructureContainer).find((r) => DataHelper.exists(r) && r.x === p.x && r.y === p.y) && !getObjectsByPrototype(ConstructionSite).find((r) => DataHelper.exists(r) && r.x === p.x && r.y === p.y));
        if (tocreate) {
          const site = createConstructionSite(tocreate, StructureContainer).object;
          if (site) {
            this.sites.push(site);
          }
        } else {
          if (this.rams.length > 0) {
            const tocreate = this.rams.find((p) => !getObjectsByPrototype(StructureRampart).find((r) => DataHelper.exists(r) && r.x === p.x && r.y === p.y) && !getObjectsByPrototype(ConstructionSite).find((r) => DataHelper.exists(r) && r.x === p.x && r.y === p.y && r.my === true));
            if (tocreate) {
              const site = createConstructionSite(tocreate, StructureRampart).object;
              if (site) {
                this.sites.push(site);
              }
            }
          }
        }
      }

      let sites = this.sites.filter((s) => DataHelper.exists(s));
      if (sites.length > 0) {
        let energy = builder.store.energy;
        const ret = builder.build(sites[0]);
        const buildCost = CreepHelper.getActivePartCount(builder, WORK) * 5;
        if (ret == OK) energy -= buildCost;
        if (energy <= buildCost) {
          if (!container && source && source.store.energy > 0) {
            builder.withdraw(source, "energy");
          }
          return;
        }
        if (mySpawn.store.energy >= 990) {
          if (source && source.store.getFreeCapacity("energy")! >= energy) {
            builder.transfer(source, "energy", Math.max(0, Math.min(energy - buildCost, source.store.getFreeCapacity("energy")!)));
          }
        } else {
          builder.transfer(mySpawn, "energy", Math.max(0, Math.min(energy - buildCost, 990 - mySpawn.store.energy)));
        }
      } else {
        if (mySpawn.store.energy >= 990 && source) {
          builder.transfer(source, "energy");
        } else {
          if (!container && source) {
            builder.withdraw(source, "energy");
          }
          builder.transfer(mySpawn, "energy");
        }
      }
    } else {
      this.complete = true;
    }
  }
  scaleUp(): Boolean {
    return false;
  }
}

(global as any).MaintainStrategy = MaintainStrategy;
