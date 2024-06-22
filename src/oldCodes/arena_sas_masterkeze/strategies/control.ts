import { ConstructionSite, Creep, RoomPosition } from "game/prototypes";

import { DataHelper } from "../dataHelper";
import { Strategy, StrategyContent } from "../strategy";

/**
 * 控制策略
 * 分析对手的能量使用情况，针对设定战术
 * 能量用途：1.保留，2.出兵，3.修建筑
 * 能量统计：spawn+ext+潜在的container
 *
 * 战术counter
 * 1. 外矿采集：work,carry,move单兵或组合在地图中腹活动，修建ram,ext等
 * 假设: 体型2w10m1c 移动到地图中央 80t, 建造ram 20t, 建造ext 20t * 4 = 180tick，之后每次找到新的矿并工作 20t + 20t + 20t * 4 = 120tick
 * -------zom---------
 * (一般造2C1W5M,把Work部件分开造，同时采不同的矿，更快，而且2W的话1c是不够的，要算上弃能量的时间)
 * （300tick回本差不多吧）
 * -------------------
 * 成本 750
 * 300 tick 回本
 * counter方式：1ra5m，1a5m 满速单位进行骚扰，可以大幅降低采集效率。便宜，被打了损失也不大，反制成本高
 * 1-2. 只运 drop+move 往返一次240tick 一次回本
 * 假设：体型1m10c 收获 500-80 = 420
 *      体型1m18c 收获 900-80 = 820
 * drop之后可以满速跑，血也多
 * 2. 红球抱团一波流
 * 假设：红部件总数上限不超过40(一半的能量)
 * counter方式：修ram守家，按1/3红部件数量出防守爬，5 ram = 1000en 防守爬 < 1500 en
 * 3. 蓝绿抱团一波流
 * counter方式：修ram守家, 4ra4m、5ra5m 对射，打残之后，补一个奶追出去
 * 4. 红球蓝球混合抱团一波流
 * counter方式：上两种的混合，红球防贴脸，蓝球防白嫖，蓝球破防优先
 * 5. 单兵类型
 * counter方式1：相同类型，大一号的体型，1v1没道理打不过
 * counter方式2：类型克制，快速红->低速蓝，快速蓝->低速红
 */

interface ControlContent extends StrategyContent {

}

export class ControlStrategy implements Strategy<ControlContent>{
  builder?: Creep;
  harvesters: Creep[];
  exts: RoomPosition[];
  cons: RoomPosition[];
  rams: RoomPosition[];
  walls: RoomPosition[];
  roads: RoomPosition[];
  sites: ConstructionSite[];
  /**
   *
   */
  constructor(content: ControlContent) {
    this.content = content;
    this.harvesters = [];
    this.exts = [];
    this.cons = [];
    this.rams = [];
    this.walls = [];
    this.roads = [];
    this.sites = [];
  }
  content: ControlContent;
  run(): void {
    this.builder = DataHelper.exists(this.builder) ? this.builder! : undefined;
    this.harvesters = this.harvesters.filter(c => DataHelper.exists(c));
    if (this.builder) {

    }
    if (this.harvesters.length > 0) {

    }
  }
  scaleUp(): Boolean {
    return false;
  }
  /**
   * 前哨站选址
   * 根据地形建造前哨站，只在地形有利时使用，地形不好不使用
   *
   * 1. 选址
   * 查看内矩形靠近己侧的边的上下延长线上，是否形成窄口（宽度 <= n) n = 5 参数可调
   * w = wall p = plain
   * w w w w w w w
   * w w w w w w w
   * w w p p p p p
   * w w p p p p p
   * w w p p p w p
   * w w p p p w w
   * w w p p p w w
   *           ^
   *       宽度 = 2 算作窄口
   * 上下都有窄口时，按照以下条件排序
   * 空间足够放ext > 地形平地为主 > 窄口宽度小
   * 2. 在窄口位置修建屏障： 少量ram + 足量wall 即可封锁这一侧的通道
   * 3. 在ram下修建container，在屏障后修建ext
   * ext 选址
   * 1. 在该方向上做一次 swampCost:1, plainCost:1 的寻路，记忆路线
   * 2. 在container靠近己方的一侧，6格范围内，寻找距离路线 range = 2的位置放置ext
   */
  pickSite() {

  }
}
