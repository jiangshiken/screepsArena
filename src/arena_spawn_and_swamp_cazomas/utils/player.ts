import { CARRY } from "game/constants";

import { enemies, getBodyArrayOfCreep, getEnergy } from "../gameObjects/Cre";
import { creeps, isOppoGO } from "../gameObjects/GameObjectInitialize";
import { displayPos } from "../gameObjects/HasHits";
import { enemySpawn } from "../gameObjects/Spa";
import { TB } from "./autoBodys";
import { tick } from "./game";
import { arrayEquals, best } from "./JS";
import { GR } from "./Pos";
import { SA } from "./visual";

//class
export class Player {
  readonly name: String;
  /** the support evidences that show its this player*/
  supportList: {
    [key: string]: {
      worth: number;
    };
  };
  constructor(name: String) {
    this.name = name;
    this.supportList = {};
    playerList.push(this);
  }
  getWorth(): number {
    let rtn = 0;
    for (let evidenceIndex in this.supportList) {
      const worth: number = this.supportList[evidenceIndex].worth;
      rtn += worth;
    }
    return rtn;
  }
}
//players
export const playerList: Player[] = [];
export const Tigga: Player = new Player("Tigga");
export const Dooms: Player = new Player("Dooms");
export const MathI: Player = new Player("MathI");
export const Capta: Player = new Player("Capta");
export const Kerob: Player = new Player("Kerob");
export const Other: Player = new Player("Other");
export const startWaitTick = 44;
export let currentGuessPlayer = Other;
export function identifyOpponent() {
  //identify tigga
  if (tick === startWaitTick - 1) {
    const ens = enemies.filter(
      i =>
        GR(i, enemySpawn) <= 1 && i.getBodiesNum(CARRY) > 0 && getEnergy(i) > 0
    );
    if (ens.length >= 2) {
      SA(displayPos(), "tigga1 triggered");
      addSupport(Tigga, "1", 0.5);
    }
  }
  if (tick <= startWaitTick) {
    const scanEn0 = creeps.find(
      i => isOppoGO(i) && arrayEquals(getBodyArrayOfCreep(i), TB("3C2W5M"))
    );
    if (scanEn0) {
      SA(displayPos(), "tigga0 triggered");
      addSupport(Tigga, "0", 0.5);
    }
  }
  //identify Kerob
  if (tick <= startWaitTick) {
    const scanEn0 = creeps.find(
      i => isOppoGO(i) && arrayEquals(getBodyArrayOfCreep(i), TB("4M3R"))
    );
    if (scanEn0 !== undefined) {
      SA(displayPos(), "Kerob0 triggered");
      addSupport(Kerob, "0", 1);
    }
    const scanEn1 = creeps.find(
      i => isOppoGO(i) && arrayEquals(getBodyArrayOfCreep(i), TB("2M3R2M"))
    );
    if (scanEn1 !== undefined) {
      SA(displayPos(), "Kerob1 triggered");
      addSupport(Kerob, "1", 1);
    }
  }
  //identify dooms
  if (tick <= startWaitTick) {
    const scanEn0 = creeps.find(
      i => isOppoGO(i) && arrayEquals(getBodyArrayOfCreep(i), TB("C"))
    );
    if (scanEn0) {
      SA(displayPos(), "dooms triggered");
      addSupport(Dooms, "0", 0.5);
    }
  }
  //
  SA(displayPos(), "guessPlayer=" + getGuessPlayer().name);
}
function addSupport(player: Player, evidenceIndex: string, worth: number) {
  player.supportList[evidenceIndex] = { worth: worth };
}
export function getGuessPlayer(): Player {
  const rtn = <Player>best(playerList, i => i.getWorth());
  currentGuessPlayer = rtn;
  return rtn;
}
