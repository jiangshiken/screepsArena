
import { ATTACK, BodyPartConstant, CARRY, HEAL, MOVE, RANGED_ATTACK, TOUGH, WORK } from "game/constants"
/**
 Module: util_autoBodys
 Author: 820491047
 CreateDate:   2023.1.10
 UpDateDate:   2023.1.10
 version 0.0.0
*/
// //success samples
// const str = "4MA12T"
// const str2 = "4MA012T"
// //error samples
// const str3 = "-4MA12T"
// const str4 = "4MA12EFG"
// console.log(TB(str))
// console.log(TB(str2))
// console.log(TB(str3))
// console.log(TB(str4))

/**transform bodyparts.
 * use string to get Bodys,like
 * "2AM"->[ATTACK,ATTACK,MOVE]
 * "3A2M"->[ATTACK,ATTACK,ATTACK,MOVE,MOVE]
 * */
export function TB(str: string): BodyPartConstant[] {
	const wrongRtn = str.match(/[^0-9ARHMCWTarhmcwt]/g)
	if (wrongRtn) {
		console.log("ERR:" + wrongRtn)
		return []
	}
	const matchRtn = str.match(/[0-9]*[ARHMCWTarhmcwt]/g)
	let rtn: BodyPartConstant[] = []
	if (matchRtn)
		for (let bodys of matchRtn) {
			const matchRtnNum = bodys.match(/[0-9]*/g)
			const num = matchRtnNum ? matchRtnNum[0] : '0'
			const matchRtnType = bodys.match(/[ARHMCWTarhmcwt]/g)
			const type = matchRtnType ? matchRtnType[0] : ''
			const realType = transType(type.toUpperCase())
			let numInt: number
			if (num === '')
				numInt = 1
			else
				numInt = parseInt(num)
			for (let i = 0; i < numInt; i++) {
				rtn.push(realType)
			}
		}
	return rtn
}
function transType(str: string): BodyPartConstant {
	switch (str) {
		case 'A':
			return ATTACK
		case 'R':
			return RANGED_ATTACK
		case 'H':
			return HEAL
		case 'M':
			return MOVE
		case 'C':
			return CARRY
		case 'W':
			return WORK
		case 'T':
			return TOUGH
		default:
			console.log("ERR")
			return TOUGH
	}
}
