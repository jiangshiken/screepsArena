import { GameObject } from "game/prototypes";
import { d2, invalid, valid } from "./JS";
import { COO, Pos_C } from "./Pos";

/** get print string not print attribute */
export function toString_simple(o: any): string {
  if (invalid(o)) return o;
  else if (typeof o === "object") {
    if (o instanceof Pos_C || o instanceof GameObject) {
      return COO(o);
    } else if (o.length) {
      return "obj(len=" + o.length + ")";
    } else if (o.toString) {
      return o.toString();
    } else {
      return "object";
    }
  } else if (typeof o === "number") {
    return "" + d2(o);
  } else if (typeof o === "string") {
    return o;
  } else if (typeof o === "function") {
    return "function";
  } else {
    return o;
  }
}
/** get print string print 1 layer of attribute */
export function toString_object(o: any): string {
  if (invalid(o)) return o;
  if (typeof o === "string") {
    return o;
  } else if (o.length > 10) {
    return "arr(len=" + o.length + ")";
  }
  let rtn = "{";
  let w: number = 10;
  for (let i in o) {
    w--;
    if (w <= 0) {
      rtn += "......";
      break;
    }
    let d = o[i];
    if (valid(d)) {
      d = toString_simple(d);
    }
    rtn += i + ":" + d + ",";
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
