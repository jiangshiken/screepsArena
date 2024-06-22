import { constants } from 'game';
import { Creep, Flag } from 'game/prototypes';
import { Task, TaskState } from "../task.mjs";

export class CaptureFlag extends Task
{
	/**
	* @type {Flag}
	 */
	flag;

	/**
	 * @param {Flag} flag
	 */
	constructor(flag)
	{
		if(!(flag instanceof Flag))
		{
			throw new Error("自变量错误！请传入Flag参数！");
		}

		super();
		this.flag = flag;
	}

	/**
	 * @param {Creep} creep
	*/
	getTaskState(creep)
	{
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

		const taskResult = creep.moveTo(this.flag);
		switch(taskResult)
		{
			case constants.OK:
				break;
			default:
				throw new Error("执行失败，错误代码：", taskResult);
		}
	}
}
