import { Creep } from 'game/prototypes';
import { Visual } from 'game/visual';
import { Task, TaskState } from "../task.mjs";
import { isAlive } from "../../utils/creepUtility.mjs"
import { VisualLayer } from "../../visualLayer.mjs";
import { TaskedObject } from './taskedObject.mjs';

/** Creep的任务执行类*/
export class TaskedCreep extends TaskedObject
{
	/**
	 * 操作对象
	 * @type {Creep}
	 */
	creep;

	hitsVisual = new Visual(VisualLayer.Hits, true);

	/**
	 * @param {Creep} creep
	 */
	constructor(creep)
	{
		if(!(creep instanceof Creep))
		{
			throw new Error("ERR!自变量错误！不是Creep的对象", creep)
		}
		if(!creep.my)
		{
			throw new Error("ERR!自变量错误！无法传递敌方Creep信息！");
		}

		super();
		this.creep = creep;
	}

	identify()
	{
		return this.creep;
	}

	isAlive()
	{
		return isAlive(this.creep);
	}

	/**
	 * @returns {Creep} 作为参数传递给任务的信息
	 */
	getTaskActionArgument()
	{
		return this.creep;
	}

	draw()
	{
		this.hitsVisual.clear().text(
			this.creep.hits,
			{ x: this.creep.x, y: this.creep.y - 0.5 }, // above the creep
			{
				font: '0.5',
				opacity: 0.7,
				backgroundColor: '#808080',
				backgroundPadding: '0.03'
			});
	}
}
