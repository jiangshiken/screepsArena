import { Visual } from "game/visual";
import { valid } from "../utils/JS";
import { drawRangeComplex, P } from "../utils/visual";
import { calculateForce } from "./battle";
import { Cre } from "./Cre";
import { cres, enemies, friends, units } from "./GameObjectInitialize";
import { damaged } from "./HasHits";
import { Stru } from "./Stru";

const VISUAL_LAYER = 6;
/**
 * draw hp
 */
export function showHits() {
  try {
    const useHPVisual = units.filter(i => damaged(i));
    for (const UHPV of useHPVisual) {
      new Visual(8, false).text(
        "" + UHPV.hits,
        { x: UHPV.x, y: UHPV.y - 0.5 },
        {
          font: "0.25",
          opacity: 0.4,
          backgroundColor: "#808080",
          backgroundPadding: 0.1,
        }
      );
    }
  } catch (ex) {
    P(ex);
  }
}

/**
 * 在creep头上显示一个血条，长度为一格，支持不同根据血量切换颜色
 * @param {import("game/prototypes").Creep} obj
 * @author UndefinedCpp
 * @version 1.0
 */
export function showHealthBar(obj: Cre | Stru) {
  if (valid(obj) && valid(obj.master.hits)) {
    const visbase = new Visual(VISUAL_LAYER, false);
    // 打底色
    visbase.line(
      { x: obj.x - 0.5, y: obj.y - 0.5 },
      { x: obj.x + 0.5, y: obj.y - 0.5 },
      { color: "#727272", opacity: 0.4 }
    );
    // 算比例
    const ratio = obj.master.hits / obj.master.hitsMax;
    // 撸颜色
    const colorScheme = {
      low: "#ff0000",
      mid: "#ffff00",
      high: "#00ff00",
    };
    const colorCode =
      ratio >= 0.8
        ? colorScheme.high
        : ratio >= 0.3
        ? colorScheme.mid
        : colorScheme.low;
    // 打颜色
    const vis = new Visual(VISUAL_LAYER + 1, false);
    vis.line(
      { x: obj.x - 0.5, y: obj.y - 0.5 },
      { x: obj.x - 0.5 + ratio, y: obj.y - 0.5 },
      { color: colorCode, opacity: 0.8 }
    );
  }
}
export function showHealthBars() {
  for (let c of cres) {
    if (c.hits < c.hitsMax) {
      showHealthBar(c);
    }
  }
}

/**
 * show the position of the enemies
 */
export function showEnemies() {
  for (let en of enemies) {
    const f = calculateForce(en);
    const rad = 0.75 * Math.sqrt(f);
    drawRangeComplex(en, rad, 0.75, "#ff0000");
  }
  for (let fr of friends) {
    const f = calculateForce(fr);
    const rad = 0.75 * Math.sqrt(f);
    drawRangeComplex(fr, rad, 0.75, "#00ff55");
  }
}
