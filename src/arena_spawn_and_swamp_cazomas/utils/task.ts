import { getTicks } from "game/utils";

import { arrayCopy, remove } from "./JS";

export function findTask<E extends Task>(
  ht: HasTasks,
  type: any
): E | undefined {
  return <E>ht.tasks.find(i => i instanceof type);
}
/**
 * things that has task list
 */
export interface HasTasks {
  tasks: Task[];
}
export function useTasks(hasTasks: HasTasks) {
  const tasks: Task[] = hasTasks.tasks;
  const tasksNeedLoop = arrayCopy(tasks);
  for (let i = 0; i < tasksNeedLoop.length; i++) {
    const task: Task = tasksNeedLoop[i];
    if (task.pause) continue;
    task.loop_task();
  }
}
/**
 * Task,cre has a TaskList ,every `Task` in {@link Cre.tasks}(the TaskList of Cre) will be trig
 * one time in every loop.if the task is not pause.
 * when the `Task` end ,it will be remove from the {@link Cre.tasks}
 */
export class Task {
  /** if task completed */
  complete: boolean = false;
  /** master of task*/
  readonly master: HasTasks;
  /** the birth tick of task*/
  readonly invokeTick: number;
  /** if task paused*/
  pause: boolean = false;
  constructor(master: HasTasks) {
    this.master = master;
    this.master.tasks.push(this);
    this.invokeTick = getTicks();
  }
  /** will be call every tick*/
  loop_task(): void {}
  /** if you want to cancel the task or the task already finished ,call this function
   * to remove it from {@link HasTasks.tasks} ,and set complete true
   */
  end(): void {
    this.complete = true;
    remove(this.master.tasks, this);
  }
}
