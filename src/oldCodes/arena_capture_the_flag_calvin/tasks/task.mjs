
export const TaskState = Object.freeze({
	WorkInProgress:0,
	Completed:1,
	PostPone:2,
});

export class Task
{
	/**
	 * @param {Object} object
	 * @returns
	*/
	getTaskState(object)
	{
		return TaskState.Completed;
	}

	/**
	 * @param {Object} object
	 */
	actionInternal(object)
	{
	}

	/**
	 * @param {Object} object
	 * @returns
	 */
	action(object)
	{
		this.actionInternal(object);
		return this.getTaskState();
	}
}
