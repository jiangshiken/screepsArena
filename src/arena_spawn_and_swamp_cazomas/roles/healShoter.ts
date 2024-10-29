import { findFitOppoUnit } from "../gameObjects/army";
import {
  Cre,
  enemies,
  getDecideSearchRtnNoArea,
  getRangePosArr,
  hasThreat,
  Role,
} from "../gameObjects/Cre";
import { tick } from "../utils/game";
import { COO, GR } from "../utils/Pos";
import { SA } from "../utils/visual";

/**do heal and shot and the same time*/
export const healShoter: Role = new Role("healShoter", healShoterControl);
/**control of healShoter*/
export function healShoterControl(cre: Cre) {
  cre.fight();
  if (tick < 100) {
    return;
  }
  let enemiesThreat = enemies.filter(i => hasThreat(i));
  let enemiesRanged = enemiesThreat.filter(i => GR(i, cre) <= 2);
  let enemiesRanged3 = enemiesThreat.filter(i => GR(i, cre) == 3);
  if (enemiesRanged.length > 0) {
    SA(cre, "enemiesRanged.length=" + enemiesRanged.length);
    let tarOOA = getRangePosArr(enemiesRanged, 11);
    let sRtn = getDecideSearchRtnNoArea(cre, tarOOA, { flee: true });
    let path = sRtn.path;
    if (path != null && path.length > 0) {
      cre.moveToNormal(path[0]);
    }
  } else if (enemiesRanged3.length > 0) {
    cre.stop();
  } else {
    let en = findFitOppoUnit(cre).maxFitEn;
    SA(cre, "en=" + COO(en));
    if (en) cre.MTJ(en);
  }
}
