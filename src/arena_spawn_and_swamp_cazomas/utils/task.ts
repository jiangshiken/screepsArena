import { getTicks } from "game/utils";

import { Event_ori } from "./Event";
import { remove } from "./JS";

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
function taskLooped(task: Task) {
  return task.looped !== undefined && task.looped.validEvent();
}
export function useTasks(hasTasks: HasTasks) {
  const tasks: Task[] = hasTasks.tasks;
  const notAllLooped = tasks.find(i => !taskLooped(i)) !== undefined;
  while (notAllLooped) {
    const taskNeedLoop = tasks.find(i => !taskLooped(i));
    if (taskNeedLoop !== undefined) {
      if (!taskNeedLoop.pause) {
        taskNeedLoop.loop_task();
      }
      taskNeedLoop.looped = new Event_ori();
    } else {
      break;
    }
  }
}
/**
 * Task,cre has a TaskList ,every `Task` in tasks (the TaskList of Cre) will be trig
 * one time in every loop.if the task is not pause.
 * when the `Task` end ,it will be remove from the tasks
 */
export class Task {
  /** if task completed */
  complete: boolean = false;
  looped: Event_ori | undefined;
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
   * to remove it from tasks ,and set complete true
   */
  end(): void {
    this.complete = true;
    remove(this.master.tasks, this);
  }
  cancelOldTask(type: any): void {
    const oldTask = this.master.tasks.find(
      t => t instanceof type && t !== this
    );
    if (oldTask) oldTask.end();
  }
}
