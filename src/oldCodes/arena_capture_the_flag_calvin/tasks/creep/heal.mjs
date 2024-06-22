import { constants } from 'game';
import { Creep } from 'game/prototypes';
import { TargetingTask } from "./targetingTask.mjs"
import { TaskState } from "../task.mjs";
import { isAlive } from "../../utils/creepUtility.mjs"

export class Heal extends TargetingTask
{
	/**
	 * @param {Creep} target
	 */
	constructor(target)
	{
		super(target);
	}

	/**
	 * @param {Creep} creep
	 */
	getTaskState(creep)
	{
		if(!isAlive(this.target) || (this.target.hits >= this.target.hitsMax))
		{
			return TaskState.Completed;
		}
		return TaskState.WorkInProgress;
	}

	/**
	 * @param {Creep} creep
	 * @returns {constants.CreepActionReturnCode}
	 */
	taskAction(creep)
	{
		return creep.heal(this.target);
	}
}
