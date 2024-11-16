import { OK, RESOURCE_ENERGY, WORK } from "game/constants";
import { Resource } from "game/prototypes";
import { Event_Pos } from "../utils/Event";
import { tick } from "../utils/game";
import { best, divideReduce } from "../utils/JS";
import { Adj, COO, GR, Pos, X_axisDistance, getRangePoss } from "../utils/Pos";
import { SA, drawLineComplex, drawLineLight } from "../utils/visual";
import { Cre } from "./Cre";
import { Cre_pull } from "./Cre_pull";
import { S } from "./export";
import {
  Harvable,
  HasEnergy,
  HasStore,
  Producer,
  Unit,
  containers,
  myExtensions,
  mySpawn,
  myUnits,
  oppoUnits,
  ress,
} from "./GameObjectInitialize";
import { findGO, overallMap } from "./overallMap";
import { Con, Ext, Res, Spa, Stru } from "./Stru";
import {
  energyFull,
  energylive,
  getCapacity,
  getEnergy,
  getFreeEnergy,
  isOppoBaseContainer,
  isTurtleContainer,
} from "./UnitTool";

export class Cre_harvest extends Cre_pull {
  /** withdraw by amount */
  withdrawByAmount(tar: HasStore, amount: number) {
    if (getEnergy(tar) < amount) {
      amount = getEnergy(tar);
    }
    return this.master.withdraw(<any>tar, RESOURCE_ENERGY, amount);
  }
  /** transfer by amount */
  transferByAmount(tar: HasStore, amount: number) {
    if (getEnergy(this) < amount) {
      amount = getEnergy(this);
    }
    return this.master.transfer(tar.master, RESOURCE_ENERGY, amount);
  }

  /**drop energy by amount.It will drop all if not enough*/
  dropEnergyByAmount(amount: number) {
    if (getEnergy(this) < amount) {
      amount = getEnergy(this);
    }
    this.master.drop(RESOURCE_ENERGY, amount);
  }
  /**drop all energy*/
  dropEnergy(): void {
    this.master.drop(RESOURCE_ENERGY);
  }
  /** withdraw static*/
  withDrawStatic(): boolean {
    const har = getHarvables().find(i => Adj(i, this.master));
    if (har) {
      return this.withdrawNormal(har);
    } else return false;
  }
  /**move and withdraw target*/
  directWithdraw(con: HasEnergy): boolean {
    //TODO back to base
    drawLineLight(this.master, con);
    this.MT_stop(con);
    return this.withdrawNormal(con);
  }
  /**withdraw normal*/
  withdrawNormal(con: HasEnergy): boolean {
    if (con instanceof Res) {
      return this.master.pickup(con.master) === OK;
    } else if (con instanceof Stru)
      return this.master.withdraw(con.master, RESOURCE_ENERGY) === OK;
    else if (con instanceof Cre)
      return con.master.transfer(this.master, RESOURCE_ENERGY) === OK;
    else return false;
  }
  /**withdraw target*/
  withDrawTarget(tar: HasEnergy): boolean {
    if (Adj(this.master, tar)) {
      return this.withdrawNormal(tar);
    } else return false;
  }
  /** move and withdraw then drop */
  directWithdrawAndDrop(con: HasStore): void {
    if (energylive(this)) {
      this.dropEnergy();
    } else {
      this.directWithdraw(con);
    }
  }
  /** move and transfer*/
  directTransfer(tar: HasStore): boolean {
    SA(this.master, "directTransfer" + COO(tar));
    if (Adj(this.master, tar)) {
      return this.transferNormal(tar);
    } else {
      this.MT(tar);
      return false;
    }
  }
  /**if a harvable will not disappear before you reach it*/
  reachableHarvable(harvable: Harvable): boolean {
    let ticksToDecay;
    if (harvable instanceof Con) {
      ticksToDecay =
        harvable.ticksToDecay == undefined ? Infinity : harvable.ticksToDecay;
    } else {
      //is Resource
      ticksToDecay = getEnergy(harvable);
    }
    return ticksToDecay > GR(this.master, harvable);
  }
  /**find a fit harvable*/
  findFitHarvable(): Harvable | undefined {
    const needTransHarvable: Harvable[] = getHarvables().filter(
      i =>
        !(i instanceof Resource && hasFullProducerAround(i)) &&
        this.reachableHarvable(i) &&
        !(i instanceof Resource && !validRes(<Res>i))
    );
    const harvableWorths: {
      harvable: Harvable | undefined;
      worth: number;
    }[] = needTransHarvable.map(harvable => {
      const range = GR(this.master, harvable);
      const baseRangeBonus =
        1 + 3 * divideReduce(X_axisDistance(harvable, mySpawn), 10);
      const volumn = getCapacity(this);
      const energy = Math.min(getEnergy(harvable), volumn);
      const worth = (baseRangeBonus * energy) / (range + 4);
      drawLineComplex(this.master, harvable, 0.1 * worth, "#22bb22");
      return { harvable: harvable, worth: worth };
    });
    const rtn: Harvable | undefined = harvableWorths.reduce(
      (a, b) => (a.worth > b.worth ? a : b),
      { harvable: undefined, worth: 0 }
    ).harvable;
    return rtn;
  }
  /**move and drop energy*/
  directDrop(tar: Pos): boolean {
    if (Adj(this.master, tar)) {
      this.dropEnergy();
      return true;
    } else {
      this.MT(tar);
      return false;
    }
  }

  /**move and harvest target*/
  directHarve(har: Harvable | null) {
    //TODO back to base
    if (har === null) return null;
    if (energyFull(this)) {
      return this.transToProducers();
    } else {
      return this.directWithdraw(har);
    }
  }
  /** transport to producer ,free producer will be transfered prior */
  transToProducers(): boolean {
    SA(this.master, "transToProducers");
    const tar = this.findFitProducer();
    if (tar) {
      drawLineLight(this.master, tar);
      if (energyFull(tar)) {
        //if producer is full
        this.directDrop(tar); //drop at producer
      } else {
        //if not full,transfer to it
        return this.directTransfer(tar);
      }
    }
    return false;
  }
  /**transport to target producer*/
  transToTargetProducer(tar: Producer): boolean {
    SA(this.master, "transToTargetProducer " + S(tar));
    drawLineComplex(this.master, tar, 0.25, "#22ee22");
    if (Adj(this.master, tar)) {
      //if producer is full,drop at producer
      if (energyFull(tar)) {
        if (tick <= notDropLimitTick) {
          SA(this.master, "stop" + S(tar));
          this.stop();
        } else {
          SA(this.master, "dropEnergy" + S(tar));
          this.dropEnergy();
        }
        return true;
        //if not full,transfer to it
      } else {
        return this.transferTarget(tar); //
      }
    } else return false;
  }
  /** normal transfer  */
  transferNormal(tar: HasStore): boolean {
    SA(this.master, "transferNormal " + S(tar));
    return this.master.transfer(tar.master, RESOURCE_ENERGY) === OK;
  }
  /**transfer energy to target*/
  transferTarget(tar: HasStore): boolean {
    SA(this.master, "transferTarget " + S(tar));
    if (Adj(this.master, tar)) {
      return this.transferNormal(tar);
    } else {
      return false;
    }
  }
  /**move and pick up resource*/
  directPickUp(resource: Resource) {
    this.master.pickup(resource);
    this.MT(resource);
  }
  /**find a fit producer*/
  findFitProducer(): Producer | undefined {
    // calculate worth of free producer
    const myProducers: Producer[] = getMyProducers();
    const target = best(myProducers, producer => {
      const sRtnFree = this.searchPathByCreCost(producer);
      const costFree = sRtnFree.cost;
      let typeRate: number;
      if (producer instanceof Cre) {
        typeRate = 0.12;
      } else if (producer instanceof Spa) {
        typeRate = 1;
      } else if (producer instanceof Ext) {
        if (GR(producer, mySpawn) <= 7) {
          typeRate = 0.75;
        } else {
          typeRate = 0.5;
        }
      } else {
        typeRate = 0;
      }
      const fullRate: number = getFreeEnergy(producer) > 0 ? 8 : 1;
      const worth = (typeRate * fullRate) / (1 + costFree);
      return worth;
    });
    return target;
  }
  /** fill extension static*/
  fillExtension(): boolean {
    const ext = <Ext | undefined>(
      myExtensions.find(i => Adj(i, this) && !energyFull(i))
    );
    if (ext) {
      this.transferNormal(ext);
      return true;
    }
    return false;
  }
}
const notDropLimitTick = 420;

/**
 *  resouce and outside not empty containers and not containers at enemy base
 */
export function getHarvables(): Harvable[] {
  return (<Harvable[]>ress.filter(i => validRes(i))).concat(
    containers.filter(
      i =>
        i.master.exists &&
        energylive(i) &&
        !isOppoBaseContainer(i) &&
        !(Adj(i, mySpawn) && (energyFull(mySpawn) || isTurtleContainer))
    )
  );
}
/**
 *  resouce and outside not empty containers and not containers at enemy base
 *  include be droped on the ground in one tick
 */
export function getHarvablesIncludeDrop(): Harvable[] {
  //resouce and outside/my not empty containers
  return (<Harvable[]>ress).concat(
    containers.filter(
      i => i.master.exists && energylive(i) && !isOppoBaseContainer(i)
    )
  );
}

/**
 * get the number of harvestable around
 */
export function getHarvestableAroundNum(pos: Pos): number {
  const hvs = getHarvables();
  const hvas = hvs.filter(i => Adj(pos, i));
  return hvas.length;
}
/**
 * has full producer around,that means we can not put energy into it anymore
 */
export function hasFullProducerAround(pos: Pos) {
  const rangePoss = getRangePoss(pos);
  for (let pos of rangePoss) {
    const goList = overallMap.get(pos);
    for (let go of goList) {
      if (isFullProducer(<Unit>go)) {
        return true;
      }
    }
  }
  return false;
}
export function isFullProducer(go: Unit) {
  return isProducer(go) && energyFull(<HasStore>go);
}
/**
 * any thing use energy will be regard as a producer
 * such as builder
 */
export function isProducer(unit: Unit): boolean {
  return (
    unit.my &&
    (unit instanceof Spa ||
      unit instanceof Ext ||
      (unit instanceof Cre &&
        unit.getBodyPartsNum(WORK) > 0 &&
        !energyFull(unit)))
  );
}
export function isEnemyProducer(unit: Unit): boolean {
  return (
    unit.oppo &&
    (unit instanceof Spa ||
      unit instanceof Ext ||
      (unit instanceof Cre && unit.getBodyPartsNum(WORK) > 0))
  );
}
export function getMyProducers(): Producer[] {
  return <Producer[]>myUnits.filter(i => isProducer(i));
}
export function getEnemyProducers(): Producer[] {
  return <Producer[]>oppoUnits.filter(i => isEnemyProducer(i));
}
/**
 * calculate energy around
 */
export function calAroundEnergy(pos: Pos) {
  let sources = getHarvables().filter(i => GR(pos, i) <= 1);
  let sum: number = 0;
  for (let sou of sources) {
    sum += getEnergy(sou);
  }
  return sum;
}

export class ResourceDropEvent extends Event_Pos {
  constructor(pos: Pos) {
    super(pos);
  }
}
/**
 * be droped in 1 tick is not a valid Resource,
 * cause it may be pick and drop transported by the harvester
 */
export function validRes(res: Res) {
  const DropEvent = <ResourceDropEvent | undefined>(
    findGO(res, ResourceDropEvent)
  );
  if (DropEvent && DropEvent.validEvent(1)) {
    return false;
  } else {
    return true;
  }
}
