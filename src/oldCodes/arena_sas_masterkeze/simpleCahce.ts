import { getTicks } from "game/utils";

const cache: {
  [key: string]: {
    created: number;
    expiration: number;
    value: Object;
  };
} = {};
export const SimpleCache = {
  Get(key: string) {
    if (!cache[key]) return undefined;
    const { created, expiration, value } = cache[key];
    const tick = getTicks();
    if (tick > created + expiration) {
      delete cache[key];
      return undefined;
    } else {
      return value;
    }
  },
  Set(key: string, value: Object, expiration: number) {
    const tick = getTicks();
    cache[key] = {
      created: tick,
      expiration,
      value,
    };
  },
};

(global as any).SimpleCache = SimpleCache;
