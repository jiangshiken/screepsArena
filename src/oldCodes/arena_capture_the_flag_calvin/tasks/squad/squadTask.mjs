import { Creep } from 'game/prototypes';
import { Task } from "../task.mjs";
import { TaskedCreep } from '../objects/taskedCreep.mjs';

/**
 * @override initialize, Task.getTaskState, Task.actionInternal
 */
 export class SquadTask extends Task
 {

	isInitialized = false;
	/**
	 * @type {function}
	 */
	phaseProcess = null;

	phaseData = null;
	/**
	 * @param {TaskedCreep[]} members
	 * @description
	 */
	initialize(members)
	{
		this.isInitialized = true;
	}
	/**
	 * @param {TaskedCreep[]} members
	 */
	actionInternal(members)
	{
		if(!this.isInitialized)
		{
			this.initialize(members);
		}
	}
	/**
	 * @param {function} processFunction
	 */
	changePhase(processFunction)
	{
		this.phaseProcess = processFunction;
		this.phaseData = new Object();
	}
 }
