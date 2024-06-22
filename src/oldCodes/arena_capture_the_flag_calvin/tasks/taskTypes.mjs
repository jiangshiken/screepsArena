import { Task } from "./task.mjs";
import { creepTaskTypes } from "./creep/creepTaskTypes.mjs";

export const taskTypes = Object.freeze({
	Task: Task,
	creep: creepTaskTypes,
});
