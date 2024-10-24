
import { getTicks } from "game/utils";

import { Event, Event_C, validEvent } from "./util_event";
import { invalid, remove, valid } from "./util_JS";

export function findTask<E extends Task>(
	ht: HasTasks,
	type: any
): E | undefined {
	return <E>ht.tasks.find(i => i instanceof type);
}
export function findTaskByFilter(
	ht: HasTasks,
	l: (t: Task) => boolean
): Task | undefined {
	return ht.tasks.find(l);
}
/**
 * Task,cre has a TaskList ,every `Task` in {@link Cre.tasks}(the TaskList of Cre) will be trig
 * one time in every loop.if the task is not pause.
 * when the `Task` end ,it will be remove from the {@link Cre.tasks}
 */
export interface Task extends Event {
	looped: Event | undefined;
	complete: boolean;
	master: HasTasks;
	pause: boolean;
	loop_task(): void; //if not complete ,run loop_task
	end(): void;
}
/**
 * things that has task list
 */
export interface HasTasks {
	tasks: Task[];
}
export function useTasks(hasTasks: HasTasks) {
	// P("useTasks " + S(hasTasks))
	if (hasTasks.tasks) {
		// SA(cre,"doing tasks")
		const tasks: Task[] = hasTasks.tasks;
		// SA(cre,"tasks="+S(tasks))
		let current: Task;
		for (let i = 0; i < tasks.length; i++) {
			let task: Task = tasks[i];
			// P("task " + S(hasTasks) + " " + S(task))
			current = task;
			if (task.pause)
				continue;
			task.loop_task();
			task.looped = new Event_C();
			//if some tasks has been removed at loop_task()
			if (current != tasks[i]) {
				//find the current position of list
				let naturalFinish: boolean = true;
				for (let j = i; j >= 0; j--) {
					let taskJ: Task | undefined = tasks[j];
					//if have been looped of taskJ
					if (valid(taskJ) && validEvent(taskJ.looped, 0)) {
						//start use loop_task() at position j
						i = j;
						naturalFinish = false;
						break;
					}
				}
				//if naturalFinished
				if (naturalFinish) {
					i = -1;
				}
			}
		}
	}
}
/** the class of {@link Task} */
export class Task_C implements Task {
	/** if looped in every tick*/
	looped: Event | undefined;
	/** if task completed */
	complete: boolean = false;
	/** master of task*/
	master: HasTasks;
	/** the birth tick of task*/
	invokeTick: number;
	/** if task paused*/
	pause: boolean = false;
	constructor(master: HasTasks) {
		this.master = master;
		this.master.tasks.push(this);
		this.invokeTick = getTicks();
	}
	/** will be call every tick*/
	loop_task(): void { }
	/** if you want to cancel the task or the task already finished ,call this function
	 * to remove it from {@link HasTasks.tasks} ,and set complete true
	 */
	end(): void {
		this.complete = true;
		remove(this.master.tasks, this);
	}
}

/** do Tasks as sequence */
export class MultiTask<T extends Task> extends Task_C {
	taskLambda: () => T;
	currentTask: T;
	constructor(master: HasTasks, taskLambda: () => T) {
		super(master);
		this.taskLambda = taskLambda;
		this.currentTask = this.taskLambda();
	}
	loop_task() {
		if (this.currentTask.complete) {
			this.currentTask = this.taskLambda();
			if (invalid(this.currentTask)) {
				this.end()
			}
		}
	}
	end() {
		super.end();
	}
}
