import { getTicks } from "game/utils";

import { HasPos, Pos } from "./Pos";

/**
 *  initial the tick by the current game tick
 */
export class Event {
  readonly invokeTick: number;
  constructor() {
    this.invokeTick = getTicks();
  }
  /**
   *  judge if this `Event` is overdue,if the `e.tick`==1 ,`permitTime`=3 and `getTicks()` is 5
   *  that this function will return false.
   *  if `getTicks()` is 4 ,that this function will return true
   * @param permitTime the time that allow an Event valid
   */
  validEvent(permitTime: number = 0): boolean {
    return getTicks() <= this.invokeTick + permitTime;
  }
}
/**
 *  a Event combined with a number
 */
export class Event_Number extends Event {
  num: number;
  constructor(num: number) {
    super();
    this.num = num;
  }
}
/**
 *  have a `pos` member attribute
 */
export class Event_Pos extends Event implements HasPos {
  readonly x: number;
  readonly y: number;
  constructor(pos: Pos) {
    super();
    this.x = pos.x;
    this.y = pos.y;
  }
}
