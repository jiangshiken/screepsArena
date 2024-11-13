import { BodyPartConstant } from "game/constants";

import { best, d2, divide0, repeat } from "../utils/JS";
import { P, SA } from "../utils/visual";
import { Cre } from "./Cre";
import { Role } from "./CreTool";
import { S } from "./export";
import { friends } from "./GameObjectInitialize";
import {
  enoughEnergy,
  spawn,
  spawnAndSpawnListEmpty,
  spawnCreep,
} from "./spawn";

export function spawnBySpawnTypeList(spl: SpawnType[]) {
  const maxNeedSpawnType = best(spl, s => {
    //every spawnType
    if (s.onlyEnoughEnergy) {
      //if it is 'only enough energy'
      if (!enoughEnergy(spawn, s.body)) {
        //if not enough ,pass
        return 0;
      }
    }
    //getCreeps_includeSpawning
    const currentNum: number = s.filterObj(friends);
    const needRate = divide0(s.need, currentNum + 0.5);
    //print the need
    const s1 = "needRate of " + s.role.roleName + "(" + s.body.length + ")=";
    const repeatNum = Math.min(Math.ceil(needRate * 3), 100);
    const tableNum = 5 - Math.floor((s1.length + 1) / 8);
    P(
      s1 +
        repeat("\t", tableNum) +
        d2(needRate) +
        "\t " +
        repeat("#", repeatNum)
    );
    return needRate;
  });
  //spawn maxNeedSpawnType
  if (
    spawnAndSpawnListEmpty(spawn) &&
    maxNeedSpawnType &&
    enoughEnergy(spawn, maxNeedSpawnType.body)
  ) {
    SA(spawn, "decide spawn " + S(maxNeedSpawnType));
    spawnCreep(maxNeedSpawnType.body, maxNeedSpawnType.role);
  }
}
/**
 *  a spawn type that represent a kind of requirement,that means need a specific type
 *  of creep at the case of this tick.it will sum the total creep that match the
 * {@link SpawnType.filterObj} when it less than the {@link SpawnType.need} value
 *  it may be spawn by another method
 */
export class SpawnType {
  readonly role: Role;
  /** represent how much you need this type of creep */
  need: number;
  /** the body of the creep that will be spawn*/
  readonly body: BodyPartConstant[];
  /** used to calculate the number of creeps of this type on the map in this tick*/
  readonly filterObj: (c: Cre[]) => number;
  /** if this is true ,it will only valid when your spawn has the energy to born this body*/
  onlyEnoughEnergy: boolean;
  constructor(
    role: Role,
    need: number,
    body: BodyPartConstant[],
    filterObj: (c: Cre[]) => number,
    onlyEnoughEnergy: boolean = false
  ) {
    this.role = role;
    this.need = need;
    this.body = body;
    this.onlyEnoughEnergy = onlyEnoughEnergy;
    this.filterObj = filterObj;
  }
}
