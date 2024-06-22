import { utils, constants } from 'game';
import { Creep, GameObject } from 'game/prototypes';
import { Task, TaskState } from "../task.mjs";

export class TargetingMove extends Task
{
	/**
	 * @type {GameObject}
	 */
	destination;

	/**
	 * @param {GameObject} destination
	 */
	constructor(destination)
	{
		if(!("x" in destination)
			|| !("y"in destination))
		{
			throw new Error("自变量错误！请传递具有以x,y为属性的对象！");
		}

		super();
		this.destination = destination;
	}

	/**
	 * @param {Creep} creep
	*/
	getTaskState(creep)
	{
		if(utils.getRange(creep, this.destination) <= 0)
		{
			return TaskState.Completed;
		}
		return TaskState.WorkInProgress;
	}

	/**
	 * @param {Creep} creep
	 */
	 actionInternal(creep)
	 {
		 if(creep.fatigue > 0)
		 {
			 return;
		 }

		 const taskResult = creep.moveTo(this.destination);
		 switch(taskResult)
		 {
			 case constants.OK:
				 break;
			 default:
				 throw new Error("执行失败！错误代码：", taskResult);
		 }
	 }
}
