// import { CARRY, MOVE, WORK } from "game/constants";
// import { Creep, StructureSpawn } from "game/prototypes";

// import { Strategy, StrategyContent } from "./strategy";

// interface RamDefendContent extends StrategyContent {
//   getMySpawn: () => StructureSpawn;
//   getSrategyTick: () => number;
//   harvesters: Creep[];
//   builder: Creep | undefined;
// }

// export class RamDefendStrategy implements Strategy<RamDefendContent>{
//   content: RamDefendContent;
//   get mySpawn() {
//     return this.content.getMySpawn();
//   }
//   get harvesters() {
//     return this.content.harvesters;
//   }
//   set harvesters(val) {
//     this.content.harvesters = val;
//   }
//   get builder() {
//     return this.content.builder;
//   }
//   set builder(val) {
//     this.content.builder = val;
//   }
//   get st() {
//     return this.content.getSrategyTick();
//   }
//   /**
//    *
//    */
//   constructor(content: RamDefendContent) {
//     this.content = content;
//   }
//   run(): void {
//     throw new Error("Method not implemented.");
//   }
//   scaleUp(): Boolean {
//     const harvesterBody = [CARRY, MOVE];
//     const builderBody = [CARRY, CARRY, WORK, MOVE, MOVE, MOVE];
//     if (this.st <= 300) {
//       if (this.harvesters.length < 2) {
//         const creep = this.mySpawn.spawnCreep(harvesterBody).object;
//         if (creep) {
//           this.harvesters.push(creep);
//         }
//         return true;
//       } else if (!this.builder) {
//         const creep = this.mySpawn.spawnCreep(builderBody).object;
//         if (creep) {
//           this.builder = creep;
//         }
//         return true;
//       }
//     }
//     return false;
//   }

// }
