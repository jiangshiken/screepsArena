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
export function printError<E>(o: E): E {
  PL(new Error().stack);
  return o;
}
