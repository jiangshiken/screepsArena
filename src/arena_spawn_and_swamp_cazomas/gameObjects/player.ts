import { CARRY, WORK } from "game/constants";

import { TB } from "../utils/autoBodys";
import { tick } from "../utils/game";
import { arrayEquals, best } from "../utils/JS";
import { GR } from "../utils/Pos";
import { displayPos, SA } from "../utils/visual";
import { getBodyArrayOfCreep } from "./CreTool";
import { creeps, enemies, enemySpawn } from "./GameObjectInitialize";
import { isOppoGO } from "./HasMy";
import { getEnergy } from "./UnitTool";

//class
export class Player {
  readonly name: String;
  /** the support evidences that show its this player*/
  supportList: {
    [key: string]: number;
  };
  constructor(name: String) {
    this.name = name;
    this.supportList = {};
    playerList.push(this);
  }
  getWorth(): number {
    let rtn = 0;
    for (let evidenceIndex in this.supportList) {
      rtn += this.supportList[evidenceIndex];
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
export const Sneak: Player = new Player("Sneak");
export const Love: Player = new Player("Love");
export const Other: Player = new Player("Other");
export const startWaitTick = 44;
export let guessPlayer = Other;
export function strategyStartTick() {
  return startWaitTick + 1;
}
export function identifyOpponent() {
  //identify tigga
  if (tick === startWaitTick - 1) {
    const ens = enemies.filter(
      i =>
        GR(i, enemySpawn) <= 1 &&
        arrayEquals(getBodyArrayOfCreep(i.master), TB("CM")) &&
        getEnergy(i) > 0
    );
    const cond1 =
      enemies.filter(
        i => i.getBodyPartsNum(CARRY) > 0 && i.getBodyPartsNum(WORK) === 0
      ).length <= 3;
    if (ens.length === 2 && cond1) {
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
  //identify love
  if (tick <= startWaitTick) {
    const scanEn0 = creeps.find(
      i =>
        isOppoGO(i) &&
        arrayEquals(getBodyArrayOfCreep(i).slice(0, 6), TB("MWCMWC"))
    );
    if (scanEn0) {
      SA(displayPos(), "love triggered");
      addSupport(Love, "0", 0.5);
    }
  }
  //
  setGuessPlayer();
  SA(displayPos(), "guessPlayer=" + getGuessPlayer().name);
}
function addSupport(player: Player, evidenceIndex: string, worth: number) {
  player.supportList[evidenceIndex] = worth;
}
function setGuessPlayer() {
  const rtn = <Player>best(playerList, i => i.getWorth());
  guessPlayer = rtn;
}
export function getGuessPlayer(): Player {
  return guessPlayer;
}
