import { divide0 } from "../utils/JS";

export interface HasHits {
  hits: number;
  hitsMax: number;
}
export function damaged(hh: HasHits) {
  return hh.hits# < hh.hitsMax;
}
export function damageAmount(hh: HasHits) {
  return hh.hitsMax - hh.hits;
}
export function damagedRate(hh: HasHits): number {
  return divide0(damageAmount(hh), hh.hitsMax);
}
export function healthRate(hh: HasHits): number {
  return divide0(hh.hits, hh.hitsMax);
}
