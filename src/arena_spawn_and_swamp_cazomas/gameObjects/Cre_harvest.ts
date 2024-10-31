import { Cre_move } from "./Cre_move";

export class Cre_harvest extends Cre_move {
  /** withdraw by amount */
  withdrawRealAmount(tar: HasStore, amount: number) {
    if (getEnergy(tar) < amount) {
      amount = getEnergy(tar);
    }
    return this.master.master.withdraw(<any>tar, RESOURCE_ENERGY, amount);
  }
  /** transfer by amount */
  transferAmount(tar: HasStore, amount: number) {
    if (valid(this.master) && valid(tar)) {
      if (getEnergy(this.master) < amount) {
        amount = getEnergy(this.master);
      }
      return this.master.master.transfer(
        tar instanceof Cre ? tar.master : tar,
        RESOURCE_ENERGY,
        amount
      );
    } else return null;
  }

  /**drop energy by amount.It will drop all if not enough*/
  dropEnergyByAmount(amount: number) {
    if (getEnergy(this.master) < amount) {
      amount = getEnergy(this.master);
    }
    this.master.master.drop(RESOURCE_ENERGY, amount);
  }
  /**drop all energy*/
  dropEnergy(): void {
    this.master.master.drop(RESOURCE_ENERGY);
  }
  /**pick up resources*/
  pickUpResources() {
    const target = findClosestByRange(this.master, resources);
    if (target) {
      this.directPickUp(target);
      return true;
    }
    return false;
  }
  /** withdraw static*/
  withDrawStatic(): boolean {
    let har = getHarvables().find(i => GR(i, this.master) <= 1);
    if (har) {
      return this.withdrawNormal(har);
    } else return false;
  }
  /**move and withdraw target*/
  directWithdraw(con: HasEnergy): boolean {
    //TODO back to base
    drawLineLight(this.master, con);
    if (GR(con, this.master) > 1) {
      this.master.MTJ(con);
    } else {
      this.master.stop();
    }
    return this.withdrawNormal(con);
  }
  /**withdraw normal*/
  withdrawNormal(con: HasEnergy): boolean {
    if (con instanceof Resource) {
      return this.master.master.pickup(con) === OK;
    } else if (con instanceof Structure)
      return this.master.master.withdraw(con, RESOURCE_ENERGY) === OK;
    else if (con instanceof Cre)
      return con.master.transfer(this.master.master, RESOURCE_ENERGY) === OK;
    else return false;
  }
  /**withdraw target*/
  withDrawTarget(tar: HasEnergy): boolean {
    if (GR(this.master, tar) <= 1) {
      return this.withdrawNormal(tar);
    } else return false;
  }
  /** move and withdraw then drop */
  directWithdrawAndDrop(con: HasStore): void {
    if (getEnergy(this.master) === 0) {
      this.directWithdraw(con);
    } else {
      this.dropEnergy();
    }
  }
  /** move and transfer*/
  directTransfer(tar: HasStore): boolean {
    SA(this.master, "directTransfer" + COO(tar));
    if (GR(this.master, tar) <= 1) {
      return this.transferNormal(tar);
    } else {
      this.master.MTJ(tar);
      return false;
    }
  }
  /**if a harvable will not disappear before you reach it*/
  reachableHarvable(harvable: Harvable): boolean {
    let td;
    if (harvable instanceof StructureContainer) {
      td =
        harvable.ticksToDecay == undefined ? Infinity : harvable.ticksToDecay;
    } else {
      //is Resource
      td = getEnergy(harvable);
    }
    return td > GR(this.master, harvable);
  }
  /**find a fit harvable*/
  findFitHarvable(): Harvable | undefined {
    let needTransHarvable: Harvable[] = getHarvables().filter(
      i =>
        !(i instanceof Resource && hasFullProducerAround(i)) &&
        this.reachableHarvable(i) &&
        !(i instanceof Resource && !validRes(<Res>i))
    );
    let harvableWorths: {
      harvable: Harvable | undefined;
      worth: number;
    }[] = needTransHarvable.map(harvable => {
      let range = GR(this.master, harvable);
      let baseRangeBonus =
        1 + 3 * divideReduce(X_axisDistance(harvable, spawnPos), 10);
      let volumn = getCapacity(this.master);
      let energy = Math.min(getEnergy(harvable), volumn);
      let worth = (baseRangeBonus * energy) / (range + 4);
      drawLineComplex(this.master, harvable, 0.1 * worth, "#22bb22");
      return { harvable: harvable, worth: worth };
    });
    let rtn: Harvable | undefined = harvableWorths.reduce(
      (a, b) => (a.worth > b.worth ? a : b),
      { harvable: undefined, worth: 0 }
    ).harvable;
    return rtn;
  }
  /** find harvestable and withdraw */
  findHarvestableAndWithdraw() {
    let harvestables = getHarvables();
    let cs = this.master.findClosestByRange(harvestables);
    if (cs) {
      this.directWithdraw(cs);
    }
  }
  /**move and drop energy*/
  directDrop(tar: Pos): boolean {
    if (GR(this.master, tar) <= 1) {
      SA(this.master, "dropEnergy");
      this.dropEnergy();
      return true;
    } else {
      SA(this.master, "MTJ");
      this.master.MTJ(tar);
      return false;
    }
  }

  /**move and harvest target*/
  directHarve(har: Harvable | null) {
    //TODO back to base
    if (har === null) return null;
    if (getFreeEnergy(this.master) === 0) {
      return this.transToProducers();
    } else {
      return this.directWithdraw(har);
    }
  }
  /** find harvestable and harve */
  harve(ifOutSide: boolean = false) {
    let harvestables = getHarvables();
    let liveHarvable = harvestables.filter(i => getEnergy(i) > 0);
    let harvestable = findClosestByRange(this.master, liveHarvable);
    return this.directHarve(harvestable);
  }
  /** transport to producer ,free producer will be transfered prior */
  transToProducers(): boolean {
    SA(this.master, "transToProducers");
    const tar = this.findFitProducer();
    if (tar) {
      drawLineLight(this.master, tar);
      if (getFreeEnergy(tar) === 0) {
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
    if (GR(this.master, tar) <= 1) {
      //if producer is full,drop at producer
      if (getFreeEnergy(tar) === 0) {
        if (tick <= notDropLimitTick) {
          SA(this.master, "stop" + S(tar));
          this.master.stop();
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
    return (
      this.master.master.transfer(
        tar instanceof Cre ? tar.master : tar,
        RESOURCE_ENERGY
      ) === OK
    );
  }
  /**transfer energy to target*/
  transferTarget(tar: HasStore): boolean {
    SA(this.master, "transferTarget " + S(tar));
    if (GR(this.master, tar) <= 1) {
      return this.transferNormal(tar);
    } else {
      return false;
    }
  }
  /**move and pick up resource*/
  directPickUp(resource: Resource) {
    this.master.master.pickup(resource);
    this.master.MTJ(resource);
  }
  /**find a fit producer*/
  findFitProducer(): Producer | undefined {
    // calculate worth of free producer
    const myProducers: Producer[] = getMyProducers();
    let maxWorth: number = -Infinity;
    let maxWorthTarget: Producer | undefined;
    for (let producer of myProducers) {
      const sRtnFree = this.master.getDecideSearchRtnByCre(producer);
      const costFree = sRtnFree.cost;
      let typeRate: number;
      if (producer instanceof Cre) {
        typeRate = 0.12;
      } else if (producer instanceof StructureSpawn) {
        typeRate = 1;
      } else if (producer instanceof StructureExtension) {
        if (GR(producer, spawnPos) <= 7) {
          typeRate = 0.75;
        } else {
          typeRate = 0.5;
        }
      } else {
        typeRate = 0;
      }
      const fullRate: number = getFreeEnergy(producer) > 0 ? 8 : 1;
      const worth = (typeRate * fullRate) / (1 + costFree);
      if (worth > maxWorth) {
        maxWorth = worth;
        maxWorthTarget = producer;
      }
    }
    return maxWorthTarget;
  }
  /** fill extension static*/
  fillExtension(): boolean {
    const ext = <StructureExtension | undefined>(
      myOwnedStrus.find(
        i =>
          i instanceof StructureExtension &&
          GR(i, this.master) <= 1 &&
          getFreeEnergy(i) > 0
      )
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
  return (<Harvable[]>getRess().filter(i => validRes(i))).concat(
    containers.filter(
      i =>
        exist(i) &&
        getEnergy(i) > 0 &&
        !isOppoContainer(i) &&
        !(
          GR(i, spawnPos) <= 1 &&
          (getFreeEnergy(spawnPos) === 0 || isTurtleContainer)
        )
    )
  );
}
/**
 *  resouce and outside not empty containers and not containers at enemy base
 *  include be droped on the ground in one tick
 */
export function getHarvablesIncludeDrop(): Harvable[] {
  //resouce and outside/my not empty containers
  return (<Harvable[]>resources).concat(
    containers.filter(i => i.exists && getEnergy(i) > 0 && !isOppoContainer(i))
  );
}

/**
 * get the number of harvestable around
 */
export function getHarvestableAroundNum(pos: Pos): number {
  const hvs = getHarvables();
  const hvas = hvs.filter(i => getRange(pos, i) <= 1);
  return hvas.length;
}
/**
 * has full producer around,that means we can not put energy into it anymore
 */
export function hasFullProducerAround(pos: Pos) {
  const rangePoss = getRangePoss(pos, 1);
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
  return isProducer(go) && getFreeEnergy(<HasStore>go) === 0;
}
/**
 * any thing use energy will be regard as a producer
 * such as builder
 */
export function isProducer(unit: Unit): boolean {
  return (
    my(unit) &&
    (unit instanceof StructureSpawn ||
      unit instanceof StructureExtension ||
      (unit instanceof Cre && isWorkingBuilder(<Cre>unit)))
  );
}
export function isEnemyProducer(unit: Unit): boolean {
  return (
    oppo(unit) &&
    (unit instanceof StructureSpawn ||
      unit instanceof StructureExtension ||
      (unit instanceof Cre && unit.getBodypartsNum(WORK) > 0))
  );
}
export function getMyProducers(): Producer[] {
  return <Producer[]>myUnits.filter(i => isProducer(i));
}
export function getEnemyProducers(): Producer[] {
  return <Producer[]>oppoUnits.filter(i => isEnemyProducer(i));
}
