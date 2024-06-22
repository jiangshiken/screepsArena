import { Task, TaskState } from "../task.mjs";

export class TaskedObject
{
	/**
	 * @type {Task[]}
	 */
	tasks = new Array();

	identify()
	{
		return "unknown identify";
	}

	isAlive()
	{
		return false;
	}

	/**
	 * @returns {boolean} true :存在任务
	 */
	hasTask()
	{
		return this.tasks.length != 0;
	}

	/**
	 * @returns {object} 作为参数传递给任务的信息
	 */
	getTaskActionArgument()
	{
		return null;
	}

	update()
	{
		if(!this.hasTask())
		{
			console.log("摸鱼中", this.identify);
			return;
		}

		let task = this.getCurrentTask();
		switch(task.action(this.getTaskActionArgument()))
		{
			case TaskState.Completed:
				killTask(task);
				break;
		}
	}

	/**
	 * @param {Task} task
	 */
	pushTask(task)
	{
		if(!(task instanceof Task))
		{
			throw new Error("ERR!无法添加Task外的工作");
		}
		this.tasks.push(task);
	}

	/**
	 * @param {Task} task
	 */
	killTask(task)
	{
		let index = this.tasks.indexOf(task);
		if(!index || ((index < 0) || (index >= this.tasks.length)))
		{
			throw new Error("索引结果无效，请检查任务及内容！");
		}

		this.tasks.splice(index, 1);
	}

	killCompleted()
	{
		for (let i = 0; i < this.tasks.length; ++i)
		{
			if (this.tasks[i].getTaskState(this.creep) != TaskState.Completed)
			{
				continue;
			}
			this.tasks.splice(i, 1);
			if (i > 0) {--i;}
		}
	}

	/**
	 * @returns {Task} 最优先的任务
	 */
	getCurrentTask()
	{
		for (let i = 0; i < this.tasks.length; ++i)
		{
			if(this.tasks[i].getTaskState(this.creep) != TaskState.WorkInProgress)
			{
				continue;
			}
			return this.tasks[i];
		}
		return null;
	}
}
