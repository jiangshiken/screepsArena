import { inRange_int } from "./JS";
import { Pos, pos00, Pos_C } from "./Pos";
import { ERR } from "./print";

/**
 * a map that represent the map tiles
 */
export class MyMap<T> extends Array<Array<T>> {
  /** the start pos*/
  startPos: Pos;
  /**
   * the width of map,you can still use width=100 to represent the whole map
   */
  width: number;
  /**
   * the height of map,you can still use height=100 to represent the whole map
   */
  height: number;
  /**
   * default value
   */
  defaultValue: () => T;
  /**
   * border value
   */
  borderValue: T;
  constructor(
    width: number,
    height: number,
    defaultValue: () => T,
    borderValue: T,
    startPos: Pos = pos00
  ) {
    super(width);
    this.startPos = startPos;
    this.width = width;
    this.height = height;
    this.defaultValue = defaultValue;
    this.borderValue = borderValue;
    this.init(this.width, this.height);
    this.setByLambda(pos => defaultValue());
  }
  init(w: number, h: number): void {
    for (let i = 0; i < w; i++) {
      this[i] = new Array<T>(h); // make each element an array
    }
  }
  /**
   * get the value of the specific position
   */
  get(pos: Pos): T {
    const index_x = pos.x - this.startPos.x;
    const index_y = pos.y - this.startPos.y;
    if (
      inRange_int(index_x, 0, this.width) &&
      inRange_int(index_y, 0, this.height)
    ) {
      return this[index_x][index_y];
    } else {
      return this.borderValue;
    }
  }
  /**
   * set the value of the specific position
   */
  set(pos: Pos, value: T): void {
    const index_x = pos.x - this.startPos.x;
    const index_y = pos.y - this.startPos.y;
    if (
      inRange_int(index_x, 0, this.width) &&
      inRange_int(index_y, 0, this.height)
    ) {
      this[index_x][index_y] = value;
    } else {
      ERR("MyMap set");
    }
  }
  /**
   * set the value by lambda function
   */
  setByLambda(l: (pos: Pos) => T): void {
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        const d: T = l(new Pos_C(this.startPos.x + i, this.startPos.y + j));
        this[i][j] = d;
      }
    }
  }
  /**
   * for lambda function
   */
  forLambda(l: (pos: Pos) => void): void {
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        l(new Pos_C(this.startPos.x + i, this.startPos.y + j));
      }
    }
  }
  /**
   * clone this one
   */
  clone(): MyMap<T> {
    const rtn = new MyMap<T>(
      this.width,
      this.height,
      this.defaultValue,
      this.borderValue,
      this.startPos
    );
    rtn.setByLambda(pos => this.get(pos));
    return rtn;
  }
}
