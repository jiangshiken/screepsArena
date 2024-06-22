import { constants } from 'game';
import { Creep } from 'game/prototypes';
import { TargetingAttack } from "./targetingAttack.mjs"

export class RangedAttack extends TargetingAttack
{
	/**
	 * @param {Creep} target
	 */
	constructor(target)
	{
		super(target);
	}

	/**
	 * @param {Creep} creep
	 * @returns {constants.CreepActionReturnCode}
	 */
	 taskAction(creep)
	 {
		 return creep.rangedAttack(this.target);
	 }
}
