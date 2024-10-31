import { MOVE, WORK } from "game/constants";
import { getRange } from "game/utils";

import { drawLineLight, SA } from "arena_spawn_and_swamp_cazomas/utils/visual";

import {
  Cre,
  exist,
  friends,
  getFriendArmies,
  hasMovePart,
  Role,
  Task_Cre,
} from "../gameObjects/Cre";
import { validEvent } from "../utils/Event";
import { S } from "../utils/export";
import { remove } from "../utils/JS";
import { COO, Pos } from "../utils/Pos";
import { findTaskByFilter, Task } from "../utils/Task";

/** will go to pull the fatigue friend ,
 * until it can move by full speed by itself
 * TODO still has bugs*/
class pullFatigueFriendTask extends Task_Cre {
  tarFri: Cre;
  constructor(master: Cre, tarFri: Cre) {
    super(master);
    this.tarFri = tarFri;
  }
  loop_task(): void {
    let tar = this.tarFri;
    let cre = this.master;
    SA(cre, "do pullFatigueFriendTask");
    SA(cre, "tarFri=" + COO(this.tarFri));
    if (exist(tar)) {
      //if target exist
      drawLineLight(cre, tar);
      let dbRtn = cre.directBePulled(tar); //go and be pulled
      if (dbRtn) {
        //if pulled
        SA(cre, "do pull linked");
        remove(tar.tryPullFatigueFriend, cre);
        //
      }
      //check end
      let creMoveNum = cre.getHealthyBodyParts(MOVE).length;
      //
      let mb = tar.getMoveAndFatigueNum();
      let moveNum = mb.moveNum;
      let fatigue = mb.fatigueNum;
      let allowComplete;
      if (dbRtn) {
        //if pulled
        allowComplete = fatigue <= (moveNum - creMoveNum) * 2;
      } else {
        allowComplete = fatigue <= moveNum * 2;
      }
      SA(cre, "fatigue=" + fatigue);
      SA(cre, "moveNum=" + moveNum);
      SA(cre, "creMoveNum=" + creMoveNum);
      if (allowComplete) {
        //taskComplete
        this.end();
        SA(cre, "do pull end");
      }
    } else {
      //taskComplete
      this.end();
      SA(cre, "do pull end for not exist");
    }
  }
  end(): void {
    super.end();
    remove(this.tarFri.tryPullFatigueFriend, this.master);
  }
}

export function controlMovers() {
  // P("try find tasks for movers");
  // 	//try link harvables and producers
  // 	let linkHTasks=tryLinkHarvable();
  // 	//try port pipe to outSide harvestable
  // 	let portHTasks=tryPortPipeToHarvestable();
  // 	//	doPortPipeToHarvestable
  let pullFTasks = tryPullFatigueFriend();
  // 	//
  // 	let moverTasks=linkHTasks.concat(portHTasks).concat(pullFTasks);
  let moverTasks: MoverTaskInfo[] = pullFTasks;
  let movers = getMovers();
  for (let mover of movers) {
    let mtb = getMoverTask(mover);
    if (!mtb) {
      //for every mover find the fit task
      let minRange = 9999;
      let minInfo: MoverTaskInfo | undefined;
      for (let t of moverTasks) {
        let sp = t.startPos;
        let range = getRange(sp, mover);
        if (range < minRange) {
          minRange = range;
          minInfo = t;
        }
      }
      //take task
      if (minInfo) {
        SA(mover, "take minInfo=" + S(minInfo));
        remove(moverTasks, minInfo);
        if (minInfo instanceof tryPullFatigueFriendInfo) {
          let tarFri = minInfo.friend;
          let arr = tarFri.tryPullFatigueFriend;
          arr.push(mover);
          new pullFatigueFriendTask(mover, tarFri);
        }
      }
    }
  }
}

export function getMovers() {
  return friends.filter(i => i.role == mover);
}

export function tryPullFatigueFriend(): tryPullFatigueFriendInfo[] {
  // P("tryPullFatigueFriend");
  let rtn: tryPullFatigueFriendInfo[] = [];
  let fatigueFriends = friends.filter(i => {
    let j0 = hasMovePart(i);
    let j1 = !i.isFullSpeed();
    let j2 = validEvent(i.wantMove, 1);
    let j3 = !i.onlyHasMoveAndCarry();
    // let j3=i.role!=defender && i.role!=harvester && i.role!=containerDroper
    // && i.role!=builder && i.role!=builderStandard;
    // SA(i,"j0="+j0+' j1='+j1+' j2='+j2+' j3='+j3);
    return j0 && j1 && j2 && j3;
  });
  // P("fatigueFriends="+SOA(fatigueFriends));
  for (let ff of fatigueFriends) {
    let mb = ff.getMoveAndFatigueNum();
    let fm = mb.fatigueNum;
    let MoverList = ff.tryPullFatigueFriend;
    SA(ff, "MoverHelpNum=" + MoverList.length);
    SA(ff, "fatigue=" + fm);
    let sumMovePart = 0;
    for (let mover of MoverList) {
      sumMovePart += mover.getBodies(MOVE).length;
    }
    sumMovePart += mb.moveNum;
    SA(ff, "sumMovePart=" + sumMovePart);
    if (sumMovePart * 2 < fm) {
      let stillNeedFatigue = fm - sumMovePart * 2;
      let newTask = new tryPullFatigueFriendInfo(ff, stillNeedFatigue, ff);
      SA(ff, "new task=" + S(newTask));
      rtn.push(newTask);
    }
  }
  return rtn;
}
export const mover: Role = new Role("mover", moverControl);
export function getMoverTask(cre: Cre): pullFatigueFriendTask | undefined {
  return <pullFatigueFriendTask>(
    findTaskByFilter(cre, (i: Task) => i instanceof pullFatigueFriendTask)
  );
  //TODO addTask
}

/** info of a MoverTask */
export class MoverTaskInfo {
  startPos: Pos;
  constructor(startPos: Pos) {
    this.startPos = startPos;
  }
}

/**
 * info of {@link pullFatigueFriendTask}
 */
export class tryPullFatigueFriendInfo extends MoverTaskInfo {
  friend: Cre;
  /**
   * the fatigue that need to deal with every tick of this friend
   */
  fatigue: number;
  constructor(friend: Cre, fatigue: number, startPos: Pos) {
    super(startPos);
    this.friend = friend;
    this.fatigue = fatigue;
  }
}
export function moverControl(cre: Cre) {
  //find idle pipe
  let mt = getMoverTask(cre);
  if (mt) {
    SA(cre, "mt=" + S(mt));
  } else {
    let builders = friends.filter(i => i.getBodies(WORK).length > 0);
    let army = getFriendArmies();
    let tars = builders.concat(army);
    let tar = cre.findClosestByRange(tars);
    if (tar) cre.MTJ(tar);
  }
}
