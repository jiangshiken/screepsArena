import { GameObject } from "game/prototypes";
import { invalid, valid } from "../utils/JS";

export interface HasMy {
  my: boolean;
  oppo: boolean;
}
export function neutral(g: GameObject): boolean {
  return invalid((<any>g).my);
}
export function isMyGO(g: GameObject): boolean {
  return valid((<any>g).my) && (<any>g).my;
}
export function isOppoGO(g: GameObject): boolean {
  return valid((<any>g).my) && !(<any>g).my;
}
