import { ATTACK, BodyPartConstant, BODYPART_COST, CARRY, HEAL, MOVE, RANGED_ATTACK, TOUGH, WORK } from "game/constants";

/**
 * 支持BodyPart[]和简写字符串之间相互转换
 * toString toBodyParts
 * 映射关系如下
  m: MOVE,
  a: ATTACK,
  c: CARRY,
  w: WORK,
  h: HEAL,
  t: TOUGH,
  r: RANGED_ATTACK
 * aaaamm 对应 [ATTACK,ATTACK,ATTACK,ATTACK,MOVE,MOVE]
 */
export const BodyPartHelper = {
  getCost(bodyparts: BodyPartConstant[]) {
    return bodyparts.reduce((prev, curr) => {
      return prev + BODYPART_COST[curr];
    }, 0);
  },
  map(bodypart: BodyPartConstant) {
    switch (bodypart) {
      case MOVE:
        return "m";
      case ATTACK:
        return "a";
      case CARRY:
        return "c";
      case WORK:
        return "w";
      case HEAL:
        return "h";
      case TOUGH:
        return "t";
      case RANGED_ATTACK:
        return "r";
      default:
        return "n";
    }
  },
  toString(bodyparts: BodyPartConstant[]) {
    return bodyparts.reduce((prev, curr) => {
      return prev + this.map(curr);
    }, "");
  },
  mapReverse(code: string): BodyPartConstant {
    const dict: { [code: string]: BodyPartConstant } = {
      m: MOVE,
      a: ATTACK,
      c: CARRY,
      w: WORK,
      h: HEAL,
      t: TOUGH,
      r: RANGED_ATTACK,
    };
    if (dict[code]) return dict[code];
    return TOUGH;
  },
  toBodyParts(codes: string) {
    return Array.from(codes).reduce((prev, curr) => {
      prev.push(this.mapReverse(curr));
      return prev;
    }, [] as BodyPartConstant[]);
  },
};

(global as any).BodyPartHelper = BodyPartHelper;
