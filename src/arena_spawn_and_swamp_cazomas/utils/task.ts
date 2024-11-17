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
        if (!taskNeedLoop.checkExpire()) {
          taskNeedLoop.loop_task();
        }
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
  readonly birthEvent: Event_ori;
  /** if task paused*/
  pause: boolean = false;
  readonly expireTime: number;
  constructor(master: HasTasks, expireTime: number) {
    this.master = master;
    this.master.tasks.push(this);
    this.birthEvent = new Event_ori();
    this.expireTime = expireTime;
  }
  /** will be call every tick*/
  loop_task(): void {}
  checkExpire(): boolean {
    if (!this.birthEvent.validEvent(this.expireTime)) {
      this.end();
      return true;
    } else {
      return false;
    }
  }
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
