import { utils } from 'game';
import { Creep } from 'game/prototypes';
import { Flag } from 'arena/prototypes';
import { TaskedCreep } from "./tasks/objects/taskedCreep.mjs";
import { taskTypes } from "./tasks/taskTypes.mjs"

/**
 * @type {boolean}
 * @type {TaskedCreep[]}
 * @type {Flag[]}
 */
let isInitialized = false;
const taskedCreeps = new Array();
let enemyFlags;

export function loop() {
	if (!isInitialized) {
		initialize();
	}

	const terminated = new Array();
	for (let creep of taskedCreeps) {
		if (!creep.isAlive()) {
			console.log("terminated:", creep);
			terminated.push(creep);
			continue;
		}

		creep.update();
		creep.draw();
	}

	for (let creep of terminated) {
		let index = taskedCreeps.indexOf(creep);
		taskedCreeps.splice(creep, 1);
	}
}

function initialize() {
	const myCreeps = utils.getObjectsByPrototype(Creep).filter(object => object.my);
	enemyFlags = utils.getObjectsByPrototype(Flag).filter(object => !object.my);

	for (let creep of myCreeps) {
		let taskedCreep = new TaskedCreep(creep);
		taskedCreep.pushTask(new taskTypes.creep.CaptureFlag(enemyFlags[0]));
		taskedCreeps.push(taskedCreep);
	}

	isInitialized = true;
}

function defaultLoop() {
	var enemyFlag = utils.getObjectsByPrototype(Flag).find(object => !object.my);
	var myCreeps = utils.getObjectsByPrototype(Creep).filter(object => object.my);
	for (var creep of myCreeps) {
		creep.moveTo(enemyFlag);
	}
}
