import { TaskedCreep } from "./objects/taskedCreep.mjs";
import { TaskedObject } from "./objects/taskedObject.mjs";
import { TaskedSquad } from "./objects/taskedSquad.mjs";

export const taskedObjectTypes = Object.freeze({
	TaskedObject: TaskedObject,
	TaskedCreep: TaskedCreep,
	TaskedSquad: TaskedSquad,
});
