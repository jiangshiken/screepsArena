/**
 Module: main(for SAS)
 Author: 820491047
 CreateDate:   2022.5.27
 UpDateDate:   2023.1.10
 version 0.0.0
*/

import { firstInit, loopEnd, loopStart } from "./loop";
import { set_setMoveMapAvoidFarOn } from "./maps";
import { set_harvesterNotFleeAtStart } from "./roles/harvester";
import { useArmedBuilderStrategy } from "./strategies/armedBuilderStrategy";
import { set_snakePartsTotalNum, useSnakeRushStrategy } from "./strategies/snakeRush";
import { useStandardStrategy } from "./strategies/standard";
import { spawnStartHarvester } from "./strategies/strategyTool";
import { useTurtleStrategy } from "./strategies/turtle";
import { useTest } from "./testMode";
import { ct, lowCPUMode, pt } from "./util_CPU";
import { displayPos } from "./util_attackable";
import { P, tick } from "./util_game";
import { Dooms, Kerob, Tigga, getGuessPlayer, identifyOpponent, startWaitTick } from "./util_player";
import { SA } from "./util_visual";
import { showHealthBars } from "./util_visual_Cre";

//overall variable
let useMod: string;
// const string
const testMod: string = "testMod";
const standardStrategy: string = "standardStrategy";
const turtleStrategy: string = "turtleStrategy";
const snakeRushStrategy: string = "snakeRushStrategy";
const armedBuilderStrategy: string = "armedBuilderStrategy";
const tailStrategy: string = "tailStrategy";
//functions
/**the loop function*/
export function loop(): void {
	P("loop start !!");
	//first init
	firstInit();
	//loop start
	const st0 = ct();
	loopStart();
	pt("loopStart", st0);
	//show health bars
	const st1 = ct();
	if (!lowCPUMode)
		showHealthBars();
	//identify opponent
	identifyOpponent()
	//set useMode
	const lockMode = false
	if (tick <= startWaitTick) {
		useMod = "";
		spawnStartHarvester(1, true)
	} else if (lockMode) {
		// useMod = spawnBlockStrategy;
		// useMod = trapStrategy;
		// useMod = redBallRushStrategy;
		// useMod = testMod;
		// useMod = armedBuilderStrategy;
		// useMod = snakeRushStrategy;
		// useMod = turtleStrategy;
	} else {
		const gp = getGuessPlayer()
		if (gp === Tigga) {
			useMod=turtleStrategy
			// set_snakePartsTotalNum(7)
			// useMod = snakeRushStrategy
			// set_spawnDps(30000)
		} else if (gp === Kerob) {
			set_snakePartsTotalNum(7)

			// set_HealerMode(true)
			useMod = snakeRushStrategy
			// useMod = standardStrategy
		} else if (gp === Dooms) {
			let antiDoomsMode = 1
			// const antiDoomsMode=ran(3)
			if (antiDoomsMode === 0) {
				//use turtle
				set_harvesterNotFleeAtStart(true)
				set_setMoveMapAvoidFarOn(true)
				useMod = turtleStrategy
			} else if (antiDoomsMode === 1) {
				//use snake
				// set_harvesterNotFleeAtStart(true)
				set_snakePartsTotalNum(7)
				useMod = snakeRushStrategy
			} else {
				//use standard
				useMod = standardStrategy
			}
		} else {
			set_snakePartsTotalNum(7)
			useMod = snakeRushStrategy
		}
	}
	pt("loop rest", st1);

	//main strategy
	const st = ct();
	// useMod=testMod
	if (useMod == standardStrategy) {
		useStandardStrategy();
	} else if (useMod === testMod) {
		useTest();
	} else if (useMod === turtleStrategy) {
		useTurtleStrategy()
	} else if (useMod === snakeRushStrategy) {
		useSnakeRushStrategy()
	} else if (useMod === armedBuilderStrategy) {
		useArmedBuilderStrategy()
	} else if(useMod===tailStrategy){
		useTailStrategy();
	}else{
		SA(displayPos(), "no mode")
	}
	pt("mainStrategy", st);
	//loop end
	loopEnd();
}
