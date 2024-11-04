import { arenaInfo } from "game";
import { getCpuTime } from "game/utils";
import { Event_Number } from "./Event";
import { KNumber } from "./JS";
import { PL } from "./print";
import { P } from "./visual";
/**cpu rate history that get an average cpu rate of previous ticks */
export let cpuRateHistory = 0;
export function recordEmergencyHistory(cpuUsed: number) {
  const totalCPU = arenaInfo.cpuTimeLimit;
  const cpuRate = cpuUsed / totalCPU;
  const rate = 1 * cpuRate;
  cpuRateHistory = 0.9 * cpuRateHistory + 0.1 * rate;
}
/**
 * end calculate time and get the time period
 */
export function et(t: number) {
  return ct() - t;
}
/**
 * used to print the CPU time
 */
export function pt(s: string, t: number) {
  const printedTime = et(t);
  P(s + " " + KNumber(printedTime) + " cpu");
}
/**
 * used to print the CPU time
 */
export function ptL(s: string, t: number) {
  const printedTime = et(t);
  PL(s + " " + KNumber(printedTime) + " cpu");
}
/**
 * used to print the CPU time
 */
export function ptSum(s: string, t: number) {
  P(s + " " + KNumber(t) + " cpu");
}
/**
 * used to calculate the CPU time
 */
export function ct() {
  return getCpuTime();
}
export function calSumCPU(e: Event_Number, st: number) {
  e.num += et(st);
}
export function getCPUK(): number {
  const cpu = getCpuTime();
  return Math.floor(cpu / 1000);
}
export function getCPUPercent(): number {
  const cpu = getCpuTime();
  const maxCpu = arenaInfo.cpuTimeLimit;
  return cpu / maxCpu;
}
