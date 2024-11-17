import { Task_Role } from "../gameObjects/Cre";
import { Cre_battle } from "../gameObjects/Cre_battle";
import { Role } from "../gameObjects/CreTool";
import { SA } from "../utils/visual";
import { wormPartJob } from "./wormPart_rush";

export const wormHeader: Role = new Role(
  "wormHeader",
  cre => new wormHeaderJob(<Cre_battle>cre)
);
export class wormHeaderJob extends Task_Role {
  master: Cre_battle;
  constructor(master: Cre_battle) {
    super(master);
    this.master = master;
    this.cancelOldTask(wormPartJob);
  }
  loop_task(): void {
    const cre = this.master;
    SA(cre, "WHJ");
  }
}
