import { Structure } from "game/prototypes"

export class Stru {
	master: Structure
	constructor(stru:Structure){
		this.master=stru
	}
}
export class OwnedStru extends Stru{

}
