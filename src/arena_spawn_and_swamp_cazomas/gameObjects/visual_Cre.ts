import { Visual } from "game/visual";
import { valid } from "../utils/JS";
import { Pos_free_C } from "../utils/Pos";
import { drawLineComplex, drawRangeComplex, P } from "../utils/visual";
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
 * show a 1 tile long HP bar with changing color
 */
export function showHealthBar(obj: Cre | Stru) {
  if (valid(obj) && valid(obj.master.hits)) {
    const visbase = new Visual(VISUAL_LAYER, false);
    //base color
    visbase.line(
      { x: obj.x - 0.5, y: obj.y - 0.5 },
      { x: obj.x + 0.5, y: obj.y - 0.5 },
      { color: "#727272", opacity: 0.4 }
    );
    //ratio
    const ratio = obj.master.hits / obj.master.hitsMax;
    //color
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
    //display color
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
export function drawFatigue() {
  friends.forEach(fri => {
    // SA(fri, "DrawFtgLine");
    const length = 0.03 * fri.master.fatigue;
    const startPos = new Pos_free_C(fri.x - 0.5, fri.y + 0.5);
    const endPos = new Pos_free_C(fri.x - 0.5, fri.y + 0.5 - length);
    drawLineComplex(startPos, endPos, 1, "#111144");
  });
}
