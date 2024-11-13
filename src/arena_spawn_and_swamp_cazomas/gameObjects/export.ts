import { d2, invalid, objLen, valid } from "../utils/JS";
import { COO, Pos_C } from "../utils/Pos";
import { GameObj } from "./GameObj";

/** get print string not print attribute */
export function toString_simple(o: any): string {
  if (invalid(o)) {
    return o;
  } else if (o instanceof GameObj) {
    return COO(o) + "id=" + o.master.id;
  } else if (o instanceof Pos_C) {
    return COO(o);
  } else if (o.length) {
    return "obj(len=" + o.length + ")";
  } else if (typeof o === "number") {
    return "" + d2(o);
  } else if (typeof o === "string") {
    return o;
  } else if (typeof o === "function") {
    return "function";
  } else {
    return "" + o;
  }
}
/** get print string print 1 layer of attribute */
export function toString_object(o: object): string {
  if (objLen(o) > 10) {
    return "obj(len=" + objLen(o) + ")";
  }
  let rtn = "{";
  for (let i in o) {
    const data = (<any>o)[i];
    const data_str = toString_simple(data);
    rtn += i + ":" + data_str + ",";
  }
  rtn += "}";
  return rtn;
}

/** get print string of anything */
export function S(o: any): string {
  if (valid(o)) {
    if (typeof o === "object") {
      return toString_object(o);
    } else {
      return toString_simple(o);
    }
  } else {
    return o;
  }
}
/** get print string of array */
export function SOA(oa: any[]): string {
  let rtn = "[";
  for (let o of oa) {
    rtn += toString_simple(o) + ",";
  }
  rtn += "]";
  return rtn;
}
