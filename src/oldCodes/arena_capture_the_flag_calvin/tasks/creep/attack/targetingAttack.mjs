import { Creep } from 'game/prototypes';
import { TaskState } from "../../task.mjs";
import { TargetingTask } from '../targetingTask.mjs';
import { isAlive } from "../../../utils/creepUtility.mjs"

/**
 * @override TargetingTask.taskAction
 */
export class TargetingAttack extends TargetingTask
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
		if(!isAlive(this.target))
		{
			return TaskState.Completed;
		}
		return TaskState.WorkInProgress;
	}
}
