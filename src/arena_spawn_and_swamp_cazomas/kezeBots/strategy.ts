export interface StrategyContent { }
export interface Strategy<T extends StrategyContent> {
  content: T;
  run(): void;
  scaleUp(): Boolean;
}
export interface Task<T> {
  content: T;
  run(): void;
}
