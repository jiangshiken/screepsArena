/**
 Module: pipe
 Author: 820491047
 CreateDate:   2023.1.10
 UpDateDate:   2023.1.10
 version 0.0.0
*/
import { Cre, Task_Role } from "../util_Cre";
import { Pos } from "../util_pos";
import { Task_C } from "../util_task";

/**can not move.Used to transport energy like a pipe*/
export class PipeTask extends Task_Role {
	pipeDirection: any;
	pipeWorking: Event | undefined;
}
export class PullPipesLinkTask extends Task_C {
	tarPipes: Cre[];
	tarPos0: Pos;
	tarPos1: Pos;
	constructor(master: Cre, tarPipes: Cre[], tarPos0: Pos, tarPos1: Pos) {
		super(master);
		this.tarPipes = tarPipes;
		this.tarPos0 = tarPos0;
		this.tarPos1 = tarPos1;
	}
	loop_task(): void {
		// TODO
	}
}
