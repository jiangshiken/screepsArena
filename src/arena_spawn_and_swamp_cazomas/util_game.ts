export function printError<E>(o:E):E{
	PL(new Error().stack)
	return o
}
/**tick inside strategy to make sure every strategy worked even if time out */
export let strategyTick: number = 0;
export function setStrategyTick(n: number): void {
	strategyTick = n;
}
export function addStrategyTick(): number {
	PL("strategyTick=" + strategyTick);
	setStrategyTick(strategyTick + 1);
	return strategyTick;
}
/** the tick,the same as getTicks()*/
export let tick: number;
export function setTick(t: number) {
	tick = t
}
/**
 * print to the log
 */
export function PL(s: any) {
	console.log(s);
}
/**
 * print a series of error message
 */
export function ERR(s: string) {
	PL(new Error(s));
}
