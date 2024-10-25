

import { ATTACK, RANGED_ATTACK, WORK } from "game/constants";
import { getRange } from "game/utils";

import { getCPUPercent, lowCPUMode } from "../utils/CPU";
import { blocked, calculateForce, Cre, damaged, exist, friends, getDamagedRate, getEarning, getEnergy, getFriendArmies, getOtherFriends, getTaunt, hasEnemyThreatAround, is5MA, isMyTick, moveToRandomEmptyAround, oppoUnits, Unit } from "../utils/Cre";
import { myRamparts, resources } from "../utils/gameObjectInitialize";
import { divide0, divideReduce, goInRange, ranGet, sum } from "../utils/JS";
import { currentGuessPlayer, Dooms } from "../utils/player";
import { atPos, COO, getRangePoss, getRangePossByStep, GR, Pos } from "../utils/pos";
import { drawLineComplex, SA, SAN } from "../utils/visual";
import { getEnemyForceMapValue, getForceMapValue, getFriendForceMapValue } from "./maps";

/**find the position that can get protect nearby*/
export function findProtectPos(cre: Cre): { pos: Pos; rate: number } {
	//find the min force*cost pos
	const ranPoss1 = getRangePoss(cre, 2);
	const ranPoss2 = getRangePossByStep(cre, 35, 5);
	const rams = myRamparts.filter(i => !blocked(i));
	const scanFriends = getFriendArmies();
	const ranPoss = ranPoss1.concat(ranPoss2, rams, scanFriends);
	let bestWorth = -Infinity;
	let bestPos: Pos = cre;
	for (let pos of ranPoss) {
		const force = getForceMapValue(pos);
		const cost = GR(cre, pos);
		const thisWorth = 0.5 * force * divideReduce(cost, 15)
		if (thisWorth > bestWorth) {
			bestWorth = thisWorth;
			bestPos = pos;
		}
	}
	SA(bestPos, "best protect pos here " + bestWorth);
	return { pos: bestPos, rate: bestWorth };
}
export function getRoundFightAndAvoidNum(cre: Cre, scanFilter: (cre: Cre) => boolean, scanRange: number = 8) {
	const roundOtherAttackers = getOtherFriends(cre).filter((i) => GR(cre, i) <= scanRange && scanFilter(cre));
	const fightNum = sum(roundOtherAttackers, i =>
		i.upgrade.fight === true ?
			(0.5 + i.getSpeed_general())
			* divideReduce(GR(i, cre), scanRange / 2)
			* calculateForce(i)
			: 0
	)
	const avoidNum = sum(roundOtherAttackers, i =>
		i.upgrade.fight === false ?
			(0.5 + i.getSpeed_general())
			* divideReduce(GR(i, cre), scanRange / 2)
			* calculateForce(i)
			: 0
	)
	return { fightNum: fightNum, avoidNum: avoidNum }
}
/**get the rate if need to protect it self */
export function getForceTarAndPosRate(cre: Cre, target: Pos) {
	const forceAtPos = getForceMapValue(cre);
	const forceAtTarget = getForceMapValue(target);
	SA(cre, "target=" + COO(target));
	//force of this cre
	// const forceCre = calculateForce(cre);
	// SAN(cre, "forceCre", forceCre);
	//if force is too high that this number is high too
	// const forceRateAtPos = forceAtPos / forceCre; //20,5 = 1;
	// const forceRateAtTarget = forceAtTarget / forceCre; //20,5 = 1;
	const range = GR(cre, target);
	const targetRate = 2 * divideReduce(range, 10)
	const posRate = 1
	const totalRate = posRate + targetRate
	const posExtra = forceAtPos * divide0(posRate, totalRate)
	const targetExtra = forceAtTarget * divide0(targetRate, totalRate)
	const rtn = posExtra + targetExtra
	SAN(cre, "posExtra", posExtra);
	SAN(cre, "targetExtra", targetExtra);
	return rtn;
}
/** try protect self */
export function protectSelf(cre: Cre): boolean {
	let protectPos = findProtectPos(cre).pos;
	if (!atPos(protectPos, cre)) {
		cre.MTJ(protectPos);
		return true;
	} else {
		return false;
	}
}
/**move to a place that has no resource*/
export function moveToNoResourcePlace(cre: Cre, needCloseArr: Pos[]) {
	//find pos have no resource
	let rangePos = getRangePoss(cre, 1);
	if (getEnergy(cre) > 0) {
		rangePos = rangePos.filter((i) => !atPos(i, cre));
	}
	let possHaveNotResource = rangePos.filter((pos) => {
		let resource = resources.find((i) => atPos(pos, i));
		if (resource) {
			//if have resource at pos
			return false;
		} else {
			return true;
		}
	});
	let closeToNeedClosePos = possHaveNotResource.filter((i) => {
		for (let cPos of needCloseArr) {
			if (getRange(cPos, i) <= 1) {
				return true;
			}
		}
		return false;
	});
	let tarPos: Pos | undefined;
	if (closeToNeedClosePos.length > 0) {
		tarPos = ranGet(closeToNeedClosePos);
	} else {
		tarPos = ranGet(possHaveNotResource);
	}
	if (tarPos) {
		cre.MTJ(tarPos);
	}
}
/** give position to important firend*/
export function givePositionToImpartantFriend(cre: Cre): boolean {
	SA(cre, "givePositionToImpartantFriend")
	const myForce = calculateForce(cre)
	const importantFriend = friends.find(i =>
		GR(i, cre) <= 1
		&& i.canMove()
		&& calculateForce(i) > myForce)
	if (importantFriend) {
		SA(cre, "give pos to important")
		moveToRandomEmptyAround(cre)
		return true
	} else
		return false
}
/** give position to important firend*/
export function exchangePositionWithImpartantFriend(cre: Cre): boolean {
	return false
}
/**used on normal role ,judge if cpu over used.If it is ,return true*/
export function cpuBreakJudge(cre: Cre): boolean {
	if (getCPUPercent() > 0.8 || lowCPUMode) {
		if (isMyTick(cre, 20)) {
			SA(cre, "my turn")
		} else {
			SA(cre, "cpu break")
			return true;
		}
	}
	return false
}
/**flee from every threated enemy*/
export function fleeWeakComplex(cre: Cre) {
	if (cre.battle.flee_weak(3, 8)) {
		SA(cre, "flee")
		return true
	} else if (cre.battle.flee_weak(5, 13)) {
		SA(cre, "flee2")
		return true
	} else {
		return false
	}
}
/**find a fit target of damaged friend*/
export function findFitDamagedFriend(cre: Cre): { maxFitEn: Unit; maxFitRate: number } {
	const ifSelf = damaged(cre) ? friends : getOtherFriends(cre)
	const targets = ifSelf.filter(i => damaged(i))
	return findFitUnits(cre, targets, true, 8 * cre.getMoveTime());
}
/**find a fit target of opponent unit*/
export function findFitOppoUnit(
	cre: Cre,
	delay: number = 8 * cre.getMoveTime(),
	range: number = 100,
	extraBonus?: (tar: Unit) => number
): { maxFitEn: Unit; maxFitRate: number } {
	const tars = oppoUnits.filter(i => GR(i, cre) <= range);
	return findFitUnits(cre, tars, false, delay, extraBonus);
}
/**get the fit rate of a target*/
export function getFitRate(cre: Cre, unit: Unit, isHealer: boolean, extraBonus?: (tar: Unit) => number): number {
	const range = GR(unit, cre);
	//calculate taunt
	const scanValueRange = 35
	let taunt: number
	if (range >= scanValueRange) {
		taunt = getTaunt(unit, true);
	} else if (friends.filter(i => GR(i, cre) <= scanValueRange && hasEnemyThreatAround(i, 8)).length === 0) {
		taunt = getTaunt(unit, true);
	} else {
		taunt = getTaunt(unit);
	}
	//dooms high taunt
	if (currentGuessPlayer === Dooms && unit instanceof Cre && unit.getBodiesNum(WORK) >= 2) {
		SA(unit, "dooms high taunt!!")
		taunt *= 6
	}
	//is 5MA
	if (is5MA(cre) && unit instanceof Cre) {
		if (unit.battle.tauntBonus.find(i =>
			i.name === "protectSelf"
			&& i.from instanceof Cre
			&& i.from.getBodiesNum(WORK) > 0) !== undefined) {
			SA(unit, "protect self extra taunt")
			taunt *= 3
		}
	}
	//calculate earn
	const friendForce = getFriendForceMapValue(cre) + getFriendForceMapValue(unit)
	const enemyForce = getEnemyForceMapValue(cre) + getEnemyForceMapValue(unit)
	const earn = isHealer ? 0 : getEarning(friendForce, enemyForce)
	//calculate cost
	let cost;
	if (range > 20) {
		cost = 3 * range;
	} else {
		//get the searchRtnCost
		const searchRtn = cre.getDecideSearchRtnByCre(unit);
		cost = searchRtn.cost;
	}
	//other parameter
	const friendForceExtra = 0.1 * getFriendForceMapValue(unit)
	const costConst = 30;
	const extraBonusRate: number = extraBonus ? extraBonus(unit) : 1
	const damagedBonus = 1 + 5 * getDamagedRate(unit);
	const attackBodyPartBonus = unit instanceof Cre ? 1 + 0.5 * unit.getBodiesNum(ATTACK) : 1
	const healerBonus = isHealer ? damagedBonus * attackBodyPartBonus : 1
	const speedEnoughBonus = unit instanceof Cre ?
		(cre.getSpeed_general() > unit.getSpeed_general() ? 1 : 0.5)
		: 1
	const quickRangerBonus = speedEnoughBonus < 1 && unit instanceof Cre && unit.getBodiesNum(RANGED_ATTACK) > 0 ?
		0.5 : 1
	//final cal
	const tauntExtra = 0.4 * taunt
	const earnExtra = 0.4 * earn
	const basicFit = tauntExtra + earnExtra + friendForceExtra
	// const fitRate = extraBonusRate * healerBonus * taunt * divideReduce(cost, costConst)
	const fitRate = quickRangerBonus * speedEnoughBonus * extraBonusRate * healerBonus * basicFit
		* divideReduce(cost, costConst)
	//print
	SA(unit, "friend=" + COO(cre))
	SAN(unit, "cost", cost)
	SAN(unit, "tauntExtra", tauntExtra)
	SAN(unit, "earnExtra", earnExtra)
	SAN(unit, "friendForceExtra", friendForceExtra)
	if (extraBonusRate !== 1) {
		SAN(unit, "extraBonusRate", extraBonusRate)
	}
	if (speedEnoughBonus === 0.5) {
		SAN(unit, "speedEnoughBonus", speedEnoughBonus)
	}
	if (quickRangerBonus === 0.5) {
		SAN(unit, "quickRangerBonus", quickRangerBonus)
	}
	SAN(unit, "FIT RATE", fitRate)
	if (fitRate > 0.05) {
		drawLineComplex(cre, unit, fitRate, "#2299bb", "dashed")
	}
	return fitRate;
}
/** find a fit target at this tick, if is healer want to find a damaged friend
 * set `isHealer` true.
 */
export function findFitUnits(
	cre: Cre,
	units: Unit[],
	isHealer: boolean,
	delay: number,
	extraBonus?: (tar: Unit) => number
): { maxFitEn: Unit; maxFitRate: number } {
	//if current target invalid or at tick delay
	if (
		units.length >= 1 &&
		(!exist(cre.targetAttackable) || isMyTick(cre, delay))
	) {
		let maxFitRate: number = -1;
		let maxFitEn: Unit = units[0];
		for (let u of units) {
			const fitRate = getFitRate(cre, u, isHealer, extraBonus);
			const op = goInRange(0.2 * fitRate, 0, 1)
			drawLineComplex(cre, u, op, "#ee8800")
			//record max fit rate
			if (fitRate > maxFitRate) {
				maxFitRate = fitRate;
				maxFitEn = u;
			}
		}
		//return new target
		cre.targetAttackable = <any>maxFitEn;
		SAN(cre, "maxFitRate", maxFitRate);
		return { maxFitEn: maxFitEn, maxFitRate: maxFitRate };
	} else {
		const tarEn = <Unit>cre.targetAttackable;
		if (tarEn) {
			const fitRate = getFitRate(cre, tarEn, isHealer);
			return { maxFitEn: tarEn, maxFitRate: fitRate };
		} else return { maxFitEn: tarEn, maxFitRate: 1 };
	}
}
