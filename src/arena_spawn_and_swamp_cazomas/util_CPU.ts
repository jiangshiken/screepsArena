import { arenaInfo } from "game";
import { getCpuTime } from "game/utils";
import { Event_C, Event_Number } from "./util_event";
import { tick } from "./util_game";
import { KNumber } from "./util_JS";
import { PS } from "./util_visual";

export let cpuRateHistory = 0
export function recordEmergencyHistory(cpuUsed: number) {
	const totalCPU = arenaInfo.cpuTimeLimit
	const cpuRate = cpuUsed / totalCPU
	const rate = 1 * cpuRate
	cpuRateHistory = 0.9 * cpuRateHistory + 0.1 * rate
}
export function getCPUEmergency(): number {
	const cpuRate = 0.5 * getCPUPercent() + 0.5 * cpuRateHistory
	const remainCPU = 1 - cpuRate
	return 1 / (remainCPU + 0.05)
}
// export let emergencyCurrent=0
let sampleTrigEvent: Event_C | undefined

/** The action that has more hunger will more likely to be called.
 The action that has more emergency will more likely to be called.
 When cpu competitionRate is high,the action that has low call Rate
	will be passed and may be called afterward.
 */
function sampleFunction() {
	const hungerRate = sampleTrigEvent ? 1 * (tick - sampleTrigEvent.invokeTick) : 100
	const actionNeedRate = 1
	const emergency = getCPUEmergency()
	const bias = 4 * emergency
	const trigRate = hungerRate * actionNeedRate - bias
	if (trigRate > 0) {
		sampleTrigEvent = new Event_C()
		//do action
	} else {
		//being passed
	}
}
/**
 * used to calculate the CPU time
 */
export function et(t: number) {
	return ct() - t;
}
/**
 * used to print the CPU time
 */
export function pt(s: string, t: number) {
	let tt = et(t);
	PS(s + " " + KNumber(tt) + " cpu");
}
/**
 * used to print the CPU time
 */
export function ptSum(s: string, t: number) {
	PS(s + " " + KNumber(t) + " cpu");
}
/**
 * used to calculate the CPU time
 */
export function ct() {
	return getCpuTime();
}
export function calSumCPU(e: Event_Number, st: number) {
	e.increase(et(st))
}
export function getCPUK(): number {
	let cpu = getCpuTime();
	let cpuK = Math.floor(cpu / 1000);
	return cpuK;
}
export function getCPUPercent(): number {
	let cpu = getCpuTime();
	let maxCpu = arenaInfo.cpuTimeLimit;
	return cpu / maxCpu;
}
export let lowCPUMode: boolean = false;
export function setLowCPUMode(b: boolean) {
	lowCPUMode = b;
}
export let switchCPUModeOn: boolean = true
export function set_switchCPUModeOn(b: boolean) {
	switchCPUModeOn = b;
}
