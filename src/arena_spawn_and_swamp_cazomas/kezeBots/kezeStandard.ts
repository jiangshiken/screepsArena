// import { getTicks } from "game/utils";

// import { initialGameObjectsAtLoopStart } from "../util_gameObjectInitialize";
// import { KezeStandardData } from "./kezeStandardData";

// /**
//  Module: kezeStardard
//  Author: masterkeze
//  CreateDate:   2023.1.18
//  UpdateDate:   2023.1.18
//  version 0.0.0
//  description:keze标准战术
// */

// interface Strategy {
// 	name: string;
// 	firstInit(): void;
// 	loopStart(): void;
// 	loop(): void;
// 	loopEnd(): void;
// }

// let data: KezeStandardData;

// export const kezeStandardStrategy: Strategy = {
// 	name: "kezeStandard",
// 	firstInit() {
// 		if (getTicks() == 1) {
// 			data = new KezeStandardData();
// 		}
// 	},
// 	loopStart() {
// 		initialGameObjectsAtLoopStart();
// 	},
// 	loop() {

// 	},
// 	loopEnd() {
// 		data.refreshSnapshot();
// 	}
// }
