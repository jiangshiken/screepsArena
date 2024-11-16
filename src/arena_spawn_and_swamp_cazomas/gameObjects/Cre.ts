import { BodyPartConstant, CARRY, MOVE } from "game/constants";
import { Creep } from "game/prototypes";
import { Event_Number } from "../utils/Event";
import { HasTasks, Task } from "../utils/Task";
import { SA } from "../utils/visual";
import { ExtraTauntEvent } from "./battle";
import { Role } from "./CreTool";
import { GameObj } from "./GameObj";
import { HasBattleStats } from "./HasBattleStats";
import { HasHits } from "./HasHits";
import { HasMy, isMyGO, isOppoGO } from "./HasMy";
import { SpawnInfo } from "./spawn";

/** the Task of Creep*/

export class Task_Cre extends Task {
  readonly master: Cre;
  constructor(master: Cre) {
    super(master);
    this.master = master;
  }
}
/** a Task of the Role Function of Creep */
export class Task_Role extends Task_Cre {
  constructor(master: Cre) {
    super(master);
  }
  loop_task(): void {
    SA(this.master, "Task_Role_loop");
    // if (this.role.roleTask) {
    //   // SA(this.master,"Task_Role_loop roleFunc")
    //   this.role.roleTask(this.master);
    // }
  }
}
export type BodyCre = {
  type: BodyPartConstant;
  hits: number;
};
/** extend of `Creep` */

export class Cre
  extends GameObj
  implements HasTasks, HasMy, HasHits, HasBattleStats
{
  readonly master: Creep;
  spawnInfo: SpawnInfo | undefined;
  /** tasks list */
  readonly tasks: Task[] = [];
  /**task execute order */
  taskPriority: number = 10;
  group_ID: number | undefined;
  group_Index: number | undefined;
  /**extra infomation*/

  readonly upgrade: any = {};
  constructor(creep: Creep) {
    super(creep);
    this.master = creep;
    this.tasks = [];
    this.upgrade = {};
  }
  taunt: Event_Number | undefined;
  force: Event_Number | undefined;
  extraTauntList: ExtraTauntEvent[] = [];
  get role(): Role | undefined {
    return this.spawnInfo?.role;
  }
  get my() {
    return isMyGO(this.master);
  }
  get oppo() {
    return isOppoGO(this.master);
  }
  get extraMessage(): any {
    return this.spawnInfo?.extraMessage;
  }
  get store() {
    return this.master.store;
  }
  get hits() {
    return this.master.hits;
  }
  get hitsMax() {
    return this.master.hitsMax;
  }
  get body(): BodyCre[] {
    return this.master.body;
  }
  hasMoveBodyPart(): boolean {
    return this.getBodyPartsNum(MOVE) > 0;
  }
  onlyHasMoveAndCarry() {
    const mNum = this.getBodyPartsNum(MOVE);
    const cNum = this.getBodyPartsNum(CARRY);
    return mNum + cNum === this.body.length;
  }
  getBodyParts(type: BodyPartConstant): BodyCre[] {
    return this.body.filter(i => i.type === type);
  }
  getBodyArray(): BodyPartConstant[] {
    let rtn: BodyPartConstant[] = [];
    for (let b of this.master.body) {
      rtn.push(b.type);
    }
    return rtn;
  }
  getHealthyBodyParts(type: BodyPartConstant): BodyCre[] {
    return this.getBodyParts(type).filter(i => i.hits > 0);
  }
  getBodyPartsNum(type: BodyPartConstant): number {
    return this.getBodyParts(type).length;
  }
  getHealthyBodyPartsNum(type: BodyPartConstant): number {
    return this.getHealthyBodyParts(type).length;
  }
}
