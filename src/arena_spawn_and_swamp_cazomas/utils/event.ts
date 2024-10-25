
import { getTicks } from "game/utils";

import { Pos, Pos_C } from "./pos";

//interfaces
/**
 *  represent a event in the game
 */
export interface Event {
	invokeTick: number;
}
//classes
/**
 *  the class of {@link Event} , will initial the tick by the current game tick
 */
export class Event_C implements Event {
	invokeTick: number;
	constructor() {
		this.invokeTick = getTicks();
		addEventMap(this)
	}
	setTick(n: number) {
		this.invokeTick = n;
	}
	validEvent(n:number=0):boolean{
		return validEvent(this,n)
	}
	freshTick() {
		this.invokeTick = getTicks();
	}
}
export const eventList: Event[][] = initEventList()
export function filterEventList(startTick: number, endTick: number, lamb: (e: Event) => boolean): Event[] {
	let rtn: Event[] = []
	for (let i = startTick; i < endTick; i++) {
		// P("i=" + i)
		// P(eventList[i])
		rtn = rtn.concat(eventList[i].filter(lamb))
	}
	return rtn
}
function initEventList() {
	let rtn = []
	for (let i = 0; i < 2000; i++) {
		rtn.push([])
	}
	return rtn
}
export function addEventMap(eve: Event) {
	// SA(pos00, "addEventMap " + eve.invokeTick + " " + S(eve))
	eventList[eve.invokeTick].push(eve)
	// SA(pos00, "" + eventList[eve.invokeTick])
}
/**
 *  have a `num` member attribute
 */
export class Event_Number extends Event_C {
	num: number
	constructor(num: number) {
		super();
		this.num = num;
	}
	increase(n: number, timeLimit: number = 0) {
		if (validEvent(this, timeLimit)) {
			this.num += n;
		} else {
			this.num = n;
			this.freshTick();
		}
	}
	getFreshNum(timeLimit: number = 0) {
		if (validEvent(this, timeLimit)) {
			return this.num;
		} else {
			return 0;
		}
	}
}
export class Event_Range {
	minTick: number;
	maxTick: number;
	constructor(minTick: number, maxTick: number) {
		this.minTick = minTick;
		this.maxTick = maxTick;
	}
}
/**
 *  have a `pos` member attribute
 */
export class Event_Pos extends Event_C {
	pos: Pos;
	constructor(pos: Pos) {
		super();
		this.pos = new Pos_C(pos);
	}
	get x() {
		if (this.pos)
			return this.pos.x
		else
			return 0
	}
	get y() {
		if (this.pos)
			return this.pos.y
		else
			return 0
	}
}
/**
 *  judge if this `Event` is overdue,if the `e.tick`==1 ,`permitTime`=3 and `getTicks()` is 5
 *  that this function will return false.
 *  if `getTicks()` is 4 ,that this function will return true
 * @param permitTime the time that allow an Event valid
 */
export function validEvent(e: Event | undefined, permitTime: number): boolean {
	if (e)
		return getTicks() <= e.invokeTick + permitTime;
	else
		return false;
}
