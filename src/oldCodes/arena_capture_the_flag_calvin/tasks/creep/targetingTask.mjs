import { constants } from 'game';
import { Creep, Structure } from 'game/prototypes';
import { Task } from "../task.mjs";
import { getTypeNameOf } from '../../utils/systemUtility.mjs';

/**
 * @override Task.getTaskState, taskAction
 */
export class TargetingTask extends Task
{
	/**
	 * @type {Creep}
	 */
	target;

	/**
	 * @param {Creep} target
	 */
	constructor(target)
	{
		if(!(target instanceof Creep)
			&& !(target instanceof Structure))
		{
			throw new Error("自变量错误！请传入Creep或Structure！。");
		}
		if(target.my)
		{
			throw new Error("自变量错误！你误伤友军对象了！");
		}

		super();
		this.target = target;
	}

	/**
	 * @param {Creep} creep
	 */
	actionInternal(creep)
	{
		const taskResult = this.taskAction(creep);
		switch(taskResult)
		{
			case constants.OK:
				break;
			case constants.ERR_NOT_IN_RANGE:
				target.moveTo(this.target);
				break;
			default:
				throw new Error("任务执行失败！[", getTypeNameOf(this), "] 代码错误：", taskResult);
		}
	}

	/**
	 * @param {Creep} creep
	 * @returns {constants.CreepActionReturnCode}
	 */
	taskAction(creep)
	{
		return constants.OK;
	}
}
