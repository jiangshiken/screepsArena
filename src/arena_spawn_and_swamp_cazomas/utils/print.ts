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
export function ERR_rtn<E>(o: E, s: string): E {
  PL(new Error(s));
  return o;
}
