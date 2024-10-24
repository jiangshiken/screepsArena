/**
 Module: SASVariables
 Author: 820491047
 CreateDate:   2023.1.10
 UpDateDate:   2023.1.10
 version 0.0.0
*/
import { inRange_int } from "./utils/util_JS";
import { invalidPos, Pos } from "./utils/util_pos";
import { drawLineComplex } from "./utils/util_visual";

/** the variables of game mod Spawn and Swamp */
export let sasVariables: SASVariables;
export function setSasVariables(sas: SASVariables) {
	sasVariables = sas
}
/**
 * the variables of the game mod Spawn and Swamp
 */
export class SASVariables {
	/** the startGate top or bottom ,true is top,will decide the area search*/
	startGateUp: boolean = false;
	/** you are at the left or the right of the game map*/
	left: boolean;
	topY: number = 10;
	bottomY: number = 89;
	leftBorder1 = 13;
	rightBorder1 = 85;
	leftBorder2 = 14;
	rightBorder2 = 86;
	midBorder = 50;
	constructor(left: boolean) {
		this.left = left;
	}
	leftRate(): number {
		return this.left ? -1 : 1;
	}
	leftVector(): Pos {
		if (this.left) {
			return { x: -1, y: 0 };
		} else {
			return { x: 1, y: 0 };
		}
	}
	/** you are at the area that will gene container*/
	inResourceArea(pos: Pos): boolean {
		if (invalidPos(pos))
			return false;
		else
			return inRange_int(pos.x, 13, 87) && inRange_int(pos.y, 2, 98);
	}
	/** is outside */
	isOutside(o: Pos): boolean {
		return o.x >= 15 && o.x <= 85;
	}
	/** get the area by pos and other parameter*/
	getArea(
		pos: Pos,
		leftBorder: number,
		rightBorder: number,
		midBorder: number
	): string {
		if (pos.x <= leftBorder) return "left";
		else if (pos.x >= rightBorder) return "right";
		else if (pos.y < midBorder) return "top";
		else return "bottom";
	}
	/**
	 * get the step target from cre to tar,if cre is your spawn and tar is enemy's spawn
	 * that it will search path to the first gate ,then the next gate ,and then search to
	 * the enemy spawn
	 */
	getNewTarByArea(cre: Pos, tar: Pos) {
		let newTar = tar;

		if (invalidPos(cre) || invalidPos(tar)) {
			return tar;
		}
		let creArea = this.getArea(cre, this.leftBorder1, this.rightBorder2, this.midBorder);
		let tarArea = this.getArea(tar, this.leftBorder1, this.rightBorder2, this.midBorder);
		//
		let top = this.topY;
		let bottom = this.bottomY;
		if (creArea === "left" && tarArea === "right") {
			//go left top
			if (this.startGateUp) newTar = { x: this.leftBorder2, y: top };
			else newTar = { x: this.leftBorder2, y: bottom };
		} else if (creArea === "right" && tarArea === "left") {
			//go right bottom
			if (this.startGateUp) newTar = { x: this.rightBorder1, y: top };
			else newTar = { x: this.rightBorder1, y: bottom };
		} else if (creArea === "left" && tarArea === "top")
			newTar = { x: this.leftBorder2, y: top };
		else if (creArea === "top" && tarArea === "left")
			newTar = { x: this.leftBorder1, y: top };
		else if (creArea === "left" && tarArea === "bottom")
			newTar = { x: this.leftBorder2, y: bottom };
		else if (creArea === "bottom" && tarArea === "left")
			newTar = { x: this.leftBorder1, y: bottom };
		else if (creArea === "right" && tarArea === "bottom")
			newTar = { x: this.rightBorder1, y: bottom };
		else if (creArea === "bottom" && tarArea === "right")
			newTar = { x: this.rightBorder2, y: bottom };
		else if (creArea === "right" && tarArea === "top")
			newTar = { x: this.rightBorder1, y: top };
		else if (creArea === "top" && tarArea === "right")
			newTar = { x: this.rightBorder2, y: top };
		drawLineComplex(cre, newTar, 0.25, "#222222");
		return newTar;
	}
}
