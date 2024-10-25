
import { inRange_int } from "./JS";
import { Pos, pos00 } from "./pos";
import { P } from "./visual";

/**
 * a map that represent the map tiles
 */
export class MyMap<T> extends Array<Array<T>> {
	/** the start pos*/
	startPos: Pos;
	/**
	 * the width of map, if scale is not 1 ,you can still use width=100 to represent the whole map
	 */
	width: number;
	/**
	 * the height of map, if scale is not 1 ,you can still use height=100 to represent the whole map
	 */
	height: number;
	/**
	 * the scale of map ,default is 1,if `scale`>1 ,it represent a mini map of the game tiles.
	 * if `scale` is 4 ,`width`=100 ,`height`=100,that will be an 25*25 map.
	 */
	scale: number;
	/**
	 * default value
	 */
	defaultValue: T;
	/**
	 * border value
	 */
	borderValue: T;
	width_mini: number
	height_mini: number
	constructor(
		width: number,
		height: number,
		defaultValue: T,
		borderValue: T,
		startPos: Pos = pos00,
		scale: number = 1
	) {
		super(Math.ceil(width / scale));
		this.startPos = startPos;
		this.width = width;
		this.height = height;
		this.scale = scale;
		this.defaultValue = defaultValue;
		this.borderValue = borderValue;
		this.width_mini = this.getMiniNumber(this.width);
		this.height_mini = this.getMiniNumber(this.height);
		this.init(this.width_mini, this.height_mini);
		this.setByLambda(pos => defaultValue);
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
		const miniPos = this.realToMini(pos);
		return this.get_realIndex(miniPos.x, miniPos.y);
	}
	/**
	 * set the value of the specific position
	 */
	set(pos: Pos, value: T): void {
		const miniPos = this.realToMini(pos);
		this.set_realIndex(miniPos.x, miniPos.y, value);
	}
	/**
	 * return a value that shrinked by the `scale`
	 */
	getMiniNumber(n: number): number {
		return Math.ceil(n / this.scale);
	}
	/**
	 * return a value that shrinked by the `scale`
	 */
	getMiniCoo(n: number): number {
		return Math.ceil(n / this.scale);
	}
	/**
	 * trans mini to real
	 */
	miniToReal(miniX: number, miniY: number): Pos {
		return {
			x: this.startPos.x + this.scale * miniX + Math.floor(this.scale / 2),
			y: this.startPos.y + this.scale * miniY + Math.floor(this.scale / 2),
		};
	}
	/**
	 * trans real to mini
	 */
	realToMini(pos: Pos): Pos {
		return {
			x: this.getMiniNumber(pos.x - this.startPos.x),
			y: this.getMiniNumber(pos.y - this.startPos.y),
		};
	}
	realToMini_bias(pos: Pos, xBias: number, yBias: number): Pos {
		return {
			x: this.getMiniNumber(pos.x - this.startPos.x) + xBias,
			y: this.getMiniNumber(pos.y - this.startPos.y) + yBias,
		};
	}

	/**
	 * get the value by real index
	 */
	get_realIndex(x: number, y: number): T {
		if (
			inRange_int(x, 0, this.width_mini) &&
			inRange_int(y, 0, this.height_mini)
		) {
			return this[x][y];
		} else {
			return this.defaultValue;
		}
	}
	/**
	 * get the value by real index
	 */
	set_realIndex(x: number, y: number, value: T): void {
		// set_realIndex(pos: Pos, value: T): void {
		if (
			inRange_int(x, 0, this.width_mini) &&
			inRange_int(y, 0, this.height_mini)
		) {
			this[x][y] = value;
		}
	}
	/**
	 * set the value by lambda function
	 */
	setByLambda(l: (pos: Pos) => T): void {
		this.setByLambda_realIndex((x, y) => {
			const realPos = this.miniToReal(x, y);
			return l(realPos);
		});
	}
	/**
	 * for lambda function
	 */
	forLambda(l: (pos: Pos) => void): void {
		this.forLambda_realIndex(pos => {
			const realPos = this.miniToReal(pos.x, pos.y);
			l(realPos);
		});
	}
	/**
	 * set the value by lambda function and the pos in specific area
	 * @param pos1 the left top corner of area rectangle
	 * @param pos2 the right bottom corner of area rectangle
	 */
	setByLambda_area(l: (pos: Pos) => T, pos1: Pos, pos2: Pos): void {
		this.setByLambda_realIndex_area(
			(x, y) => {
				const realPos = this.miniToReal(x, y);
				return l(realPos);
			},
			this.realToMini(pos1),
			this.realToMini_bias(pos2, 1, 1)
		);
	}
	/**
	 * set the value by lambda function and the real index
	 */
	setByLambda_realIndex(l: (x: number, y: number) => T): void {
		let count = 0
		for (let i = 0; i < this.width_mini; i++) {
			for (let j = 0; j < this.height_mini; j++) {
				count++
				const d: T = l(i, j);
				this.set_realIndex(i, j, d);
			}
		}
		P("count=" + count)
	}
	/**
	 * iter the lambda function and the real index
	 */
	forLambda_realIndex(l: (pos: Pos) => void): void {
		for (let i = 0; i < this.width_mini; i++) {
			for (let j = 0; j < this.height_mini; j++) {
				l({ x: i, y: j });
			}
		}
	}
	/**
	 * set the value by lambda function and the real index in specific area
	 * @param pos1 the left top corner of area rectangle
	 * @param pos2 the right bottom corner of area rectangle
	 */
	setByLambda_realIndex_area(l: (x: number, y: number) => T, pos1: Pos, pos2: Pos): void {
		// setByLambda_realIndex_area(l: (pos: Pos) => T, pos1: Pos, pos2: Pos): void {
		for (let i = pos1.x; i < pos2.x; i++) {
			for (let j = pos1.y; j < pos2.y; j++) {
				// const pos = { x: i, y: j }
				const d: T = l(i, j);
				this.set_realIndex(i, j, d);
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
			{ x: this.startPos.x, y: this.startPos.y },
			this.scale
		);
		rtn.setByLambda_realIndex((x, y) => this[x][y]);
		// rtn.setByLambda_realIndex(pos => this[pos.x][pos.y]);
		return rtn;
	}
}
