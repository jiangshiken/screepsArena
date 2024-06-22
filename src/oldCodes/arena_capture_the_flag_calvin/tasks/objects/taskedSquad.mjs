import { Creep } from 'game/prototypes';
import { TaskedObject } from './taskedObject.mjs';

export class TaskedSquad extends TaskedObject
{
	/**
	 * @type {String}
	 */
	name;

	/**
	 * @type {TaskedCreep[]}
	 */
	members = new Array();

	/**
	 * @param {String} name
	 * @param {Creep[]} members
	 */
	constructor(name, members)
	{
		super();
		this.name = name;
		for(let member of members)
		{
			this.members.push(new TaskedCreep(member));
		}
	}

	identify()
	{
		return "squad[" + this.name + "]";
	}


	isAlive()
	{
		for(let member of this.members)
		{
			if(member.isAlive()) return true;
		}
		return false;
	}

	/**
	 * @returns {TaskedCreep[]}
	 */
	getTaskActionArgument()
	{
		return this.members;
	}

	update()
	{
		this.rollCall();
		super.update();
		for(let member of this.members)
		{
			member.update();
			member.draw();
		}
	}

	rollCall()
	{
		for (let i = 0; i < this.members.length; ++i)
		{
			if (this.members[i].isAlive())
			{
				continue;
			}
			console.log("terminated:", this.members[i]);
			this.members.splice(i, 1);
			if (i > 0) {--i;}
		}
	}
}
