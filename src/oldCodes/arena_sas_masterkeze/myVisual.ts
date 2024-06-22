import { RoomPosition } from "game/prototypes";
import { Visual } from "game/visual";
export const MyVisual = {
  square(center: RoomPosition, range: number, style = null, v?: Visual) {
    let visual = v !== undefined ? v! : new Visual();
    let w = range * 2 + 1;
    let h = range * 2 + 1;
    let pos = {
      x: center.x - 0.5 - range,
      y: center.y - 0.5 - range,
    };
    if (style) {
      return visual.rect(pos, w, h, style);
    } else {
      return visual.rect(pos, w, h);
    }
  },
  text(pos: RoomPosition, text: string, corner = 1, color = "#00ff00", v?: Visual) {
    let visual = v !== undefined ? v! : new Visual();
    switch (corner) {
      case 1:
        visual.text(
          text,
          { x: pos.x - 0.25, y: pos.y - 0.1 },
          {
            font: 0.3,
            opacity: 0.5,
            color: color,
          }
        );
        break;
      case 2:
        visual.text(
          text,
          { x: pos.x + 0.25, y: pos.y - 0.1 },
          {
            font: 0.3,
            opacity: 0.5,
            color: color,
          }
        );
        break;
      case 3:
        visual.text(
          text,
          { x: pos.x - 0.25, y: pos.y + 0.4 },
          {
            font: 0.3,
            opacity: 0.5,
            color: color,
          }
        );
        break;
      default:
        visual.text(
          text,
          { x: pos.x + 0.25, y: pos.y + 0.4 },
          {
            font: 0.3,
            opacity: 0.5,
            color: color,
          }
        );
        break;
    }
  },
  textGroup(
    group: {
      x: number;
      y: number;
      text: string;
    }[],
    corner = 1,
    color = "#00ff00",
    v?: Visual
  ) {
    let visual = v !== undefined ? v! : new Visual();
    for (const obj of group) {
      this.text(obj, obj.text, corner, color, visual);
    }
  },
};

(global as any).MyVisual = MyVisual;
