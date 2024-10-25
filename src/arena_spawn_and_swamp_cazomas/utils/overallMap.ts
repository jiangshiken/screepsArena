
import { valid } from "./JS";
import { MyMap } from "./MyMap";
import { Pos } from "./pos";

/**
 * a map store all things has pos in the game
 */
export let overallMap: MyMap<Pos[]>;
export function overallMapInit() {
	overallMap.setByLambda_realIndex((x, y) => {
		const old = overallMap.get_realIndex(x, y)
		if (old.length > 0) {
			return []
		} else {
			return old
		}
	})
}
export let gameObjectsThisTick: Pos[]
export function setGameObjectsThisTick(g: Pos[]) {
	gameObjectsThisTick = g
}

export function findGO(pos: Pos, goType: any): Pos | undefined {
	return overallMap.get(pos).find(i => i instanceof goType);
}
export function hasGO(pos: Pos, goType: any): boolean {
	return valid(findGO(pos, goType));
}
export function firstInit_overallMap() {
	overallMap = new MyMap<Pos[]>(100, 100, [], []);
}
/**
 * put all the things has Pos value into this map at every tick
 */
export function setOverallMap(): void {
	const gameObjects = gameObjectsThisTick
	for (let go of gameObjects) {
		const list = overallMap[go.x][go.y];
		list.push(go);
	}
}
