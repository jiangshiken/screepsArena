import { RESOURCE_ENERGY } from "game/constants";
import { Creep, GameObject, RoomPosition, StructureExtension, StructureRampart, StructureSpawn, StructureWall } from "game/prototypes";
import { getObjectsByPrototype } from "game/utils";
import { SimpleCache } from "./simpleCahce";

export const DataHelper = {
  getRampartAt(pos: RoomPosition) {
    return getObjectsByPrototype(StructureRampart).find((e) => this.exists(e) && e.getRangeTo(pos) === 0 && e.hits);
  },
  getCreepAt(pos: RoomPosition) {
    return this.creeps.find((e) => this.exists(e) && e.getRangeTo(pos) === 0);
  },
  exists(obj: GameObject | undefined) {
    return obj && obj.exists === true;
  },
  isSpawning(creep: Creep) {
    if (!this.exists(creep)) return false;
    return creep.spawning;
  },
  get mapSize() {
    return 100;
  },
  get maxTick() {
    return 10000;
  },
  get hostileCreeps() {
    const key = `hostileCreeps`;
    const value = SimpleCache.Get(key);
    if (value) return value as Creep[];
    const creeps = getObjectsByPrototype(Creep).filter((c) => this.exists(c) && c.my === false);
    SimpleCache.Set(key, creeps, 0);
    return creeps;
  },
  get hostileSpawningCreeps() {
    const key = `hostileSpawningCreep`;
    const value = SimpleCache.Get(key);
    if (value) return value as Creep[];
    const creeps = getObjectsByPrototype(Creep).filter((c) => c.my === false && this.isSpawning(c));
    SimpleCache.Set(key, creeps, 0);
    return creeps;
  },
  get mySpawning() {
    return this.mySpawn.spawning;
  },
  get hostileSpawning() {
    return this.hostileSpawn.spawning;
  },
  get creeps() {
    const key = `creeps`;
    const value = SimpleCache.Get(key);
    if (value) return value as Creep[];
    const creeps = getObjectsByPrototype(Creep).filter((c) => this.exists(c));
    SimpleCache.Set(key, creeps, 0);
    return creeps;
  },
  get myCreeps() {
    const key = `myCreeps`;
    const value = SimpleCache.Get(key);
    if (value) return value as Creep[];
    const creeps = getObjectsByPrototype(Creep).filter((c) => this.exists(c) && c.my === true);
    SimpleCache.Set(key, creeps, 0);
    return creeps;
  },
  get mySpawns() {
    const key = `mySpawns`;
    const value = SimpleCache.Get(key);
    if (value) return value as StructureSpawn[];
    const spawns = getObjectsByPrototype(StructureSpawn).filter((c) => this.exists(c) && c.my === true);
    SimpleCache.Set(key, spawns, 0);
    return spawns;
  },
  get spawnVector(): { x: number; y: number } {
    const key = `spawnVector`;
    const value = SimpleCache.Get(key);
    if (value) return value as { x: number; y: number };
    const mySpawn = this.mySpawns[0];
    let result = {
      x: 1,
      y: 0,
    };
    if (mySpawn.x < 25) {
      result.x = -1;
    }
    SimpleCache.Set(key, result, this.maxTick);
    return result;
  },
  get myExtensions() {
    const key = `myExtensions`;
    const value = SimpleCache.Get(key);
    if (value) return value as StructureExtension[];
    const extensions = getObjectsByPrototype(StructureExtension).filter((e) => this.exists(e) && e.my === true);
    SimpleCache.Set(key, extensions, 0);
    return extensions;
  },
  get hostileExtensions() {
    const key = `hostileExtensions`;
    const value = SimpleCache.Get(key);
    if (value) return value as StructureExtension[];
    const extensions = getObjectsByPrototype(StructureExtension).filter((e) => this.exists(e) && e.my === false);
    SimpleCache.Set(key, extensions, 0);
    return extensions;
  },
  get walls() {
    const key = `walls`;
    const value = SimpleCache.Get(key);
    if (value) return value as StructureWall[];
    const walls = getObjectsByPrototype(StructureWall).filter((e) => this.exists(e) && e.hits);
    SimpleCache.Set(key, walls, 0);
    return walls;
  },
  get myRamparts() {
    const key = `myRamparts`;
    const value = SimpleCache.Get(key);
    if (value) return value as StructureRampart[];
    const ramparts = getObjectsByPrototype(StructureRampart).filter((e) => this.exists(e) && e.my === true && e.hits);
    SimpleCache.Set(key, ramparts, 0);
    return ramparts;
  },
  get hostileRamparts() {
    const key = `hostileRamparts`;
    const value = SimpleCache.Get(key);
    if (value) return value as StructureRampart[];
    const ramparts = getObjectsByPrototype(StructureRampart).filter((e) => this.exists(e) && e.my === false && e.hits);
    SimpleCache.Set(key, ramparts, 0);
    return ramparts;
  },
  get hostileSpawns() {
    const key = `hostileSpawns`;
    const value = SimpleCache.Get(key);
    if (value) return value as StructureSpawn[];
    const spawns = getObjectsByPrototype(StructureSpawn).filter((c) => this.exists(c) && c.my === false);
    SimpleCache.Set(key, spawns, 0);
    return spawns;
  },
  get spawns() {
    const key = `spawns`;
    const value = SimpleCache.Get(key);
    if (value) return value as StructureSpawn[];
    const spawns = getObjectsByPrototype(StructureSpawn).filter((c) => this.exists(c));
    SimpleCache.Set(key, spawns, 0);
    return spawns;
  },
  get mySpawn() {
    return this.mySpawns[0];
  },
  get hostileSpawn() {
    return this.hostileSpawns[0];
  },
  get totalEnergy() {
    const key = `totalEnergy`;
    const value = SimpleCache.Get(key);
    if (value !== undefined) return value as number;
    const spawnEnergy = this.mySpawns.reduce((prev, curr) => {
      return prev + curr.store.energy;
    }, 0);
    const extensionEnergy = this.myExtensions.reduce((prev, curr) => {
      return prev + curr.store.energy;
    }, 0);
    const totalEnergy = spawnEnergy + extensionEnergy;
    SimpleCache.Set(key, totalEnergy, 0);
    return totalEnergy;
  },
  get totalCapacity() {
    const key = `totalCapacity`;
    const value = SimpleCache.Get(key);
    if (value !== undefined) return value as number;
    const spawnCapacity = this.mySpawns.reduce((prev, curr) => {
      return prev + curr.store.getCapacity(RESOURCE_ENERGY)!;
    }, 0);
    const extensionCapacity = this.myExtensions.reduce((prev, curr) => {
      return prev + curr.store.getCapacity(RESOURCE_ENERGY)!;
    }, 0);
    const totalCapacity = spawnCapacity + extensionCapacity;
    SimpleCache.Set(key, totalCapacity, 0);
    return totalCapacity;
  },
};

(global as any).DataHelper = DataHelper;
