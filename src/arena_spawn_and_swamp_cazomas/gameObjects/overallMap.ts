import { MyMap } from "../utils/MyMap";
import { Pos } from "../utils/Pos";

/**
 * a map store all things has pos in the game
 */
export const overallMap: MyMap<Pos[]> = new MyMap<Pos[]>(
  100,
  100,
  () => [],
  []
);
export function overallMapInit() {
  overallMap.setByLambda(pos => {
    const old = overallMap.get(pos);
    if (old.length > 0) {
      return [];
    } else {
      return old;
    }
  });
}
export let gameObjectsThisTick: Pos[];
export function setGameObjectsThisTick(g: Pos[]) {
  gameObjectsThisTick = g;
}
export function findGO(pos: Pos, goType: any): Pos | undefined {
  return overallMap.get(pos).find(i => i instanceof goType);
}
export function hasGO(pos: Pos, goType: any): boolean {
  return findGO(pos, goType) !== undefined;
}
/**
 * put all the things has Pos value into this map at every tick
 */
export function setOverallMap(): void {
  const gameObjects = gameObjectsThisTick;
  for (let go of gameObjects) {
    const list = overallMap[go.x][go.y];
    list.push(go);
  }
}
