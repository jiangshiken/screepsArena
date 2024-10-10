import { ATTACK, WORK } from "game/constants";
import { StructureExtension, StructureSpawn } from "game/prototypes";
import { getTicks } from "game/utils";
import { PullTarsTask } from "../pullTasks";
import { builderStandard } from "../roles/builder";
import { jamer } from "../roles/jamer";
import { spawn, spawnCleared, spawnCreep } from "../spawn";
import { inRampart } from "../util_attackable";
import { TB } from "../util_autoBodys";
import { Cre, enemies, friends, oppoUnits, Role } from "../util_Cre";
import { ranBool, sum } from "../util_JS";
import { getGuessPlayer, Tigga } from "../util_player";
import { Adj, MGR } from "../util_pos";
import { SA } from "../util_visual";
import { best } from "../util_WT";
const group1:Cre[]=[]
class TailInfo{
    group:number
    index:number
    constructor(group:number
        ,index:number){
        this.group=group
        this.index=index
    }
}
export function useTailStrategy(){
    if(getTicks()===50){
        //400
        spawnCreep(TB('5MCW'),builderStandard)
        for (let g = 0; g < 3; g++) {
            if(g===0){
                //50+900+50
                spawnCreep(TB('M6RM'),tailMelee,new TailInfo(g,0))
            }else{
                spawnCreep(TB('3M10AM'),tailMelee,new TailInfo(g,0))
            }
            spawnCreep(TB('4M3HM'),tailHealer,new TailInfo(g,1))
            for (let i = 0; i < 12; i++) {
                spawnCreep(TB('M'),tailPart,new TailInfo(g,2+i))
            }
        }
    }
    if(getTicks()>50){
        if(spawnCleared(spawn)){
            spawnCreep(TB('M'),jamer)
        }
    }
    command()
}
export const tailHealer: Role = new Role('tailHealer', tailHealerJob);
export const tailShoter: Role = new Role('tailShoter', tailShoterJob);
export const tailMelee: Role = new Role('tailShoter', tailMeleeJob);
export const tailPart: Role = new Role('tailPart', tailPartJob);
function tailHealerJob(cre:Cre){
    SA(cre,"tailHealerJob")
    cre.fight();
}
function getGroup(n:number):Cre[]{
    return friends.filter(i=>tailGroup(i)===n)
}
function tailIndex(cre:Cre):number{
    const ie:any=cre.extraMessage()
    if(ie && ie instanceof TailInfo){
        return ie.index
    }else{
        return -1
    }
}
function tailGroup(cre:Cre):number{
    const ie:any=cre.extraMessage()
    if(ie && ie instanceof TailInfo){
        return ie.group
    }else{
        return -1
    }
}
function tailMeleeJob(cre:Cre){
    SA(cre,"tailMeleeJob")
    cre.fight();
    const targets=oppoUnits.filter(i =>
        i instanceof Cre
        || i instanceof StructureExtension
        || i instanceof StructureSpawn
    )
    const target=best(targets,i=>{
        return -MGR(i,cre)
    })
    if(target){
        const myGroupNum=tailGroup(cre)
        const myGroup=getGroup(myGroupNum)
        SA(cre,'mg='+myGroupNum+' mgl='+myGroup.length)
        const tail = best(myGroup, i => tailIndex(i))
        const second= myGroup.find(i=>tailIndex(i)===1)
        const head = best(myGroup, i => -tailIndex(i))
        const dis=MGR(target,cre)
        if(tail && head && second){
            //clear pull tars task
            myGroup.filter(i=>i.role===tailPart).forEach(tp=>
                tp.tasks.find(i => i instanceof PullTarsTask)?.end()
            )
            second.tasks.find(i => i instanceof PullTarsTask)?.end()
            //
            const tarDistance = target ? MGR(head, target) : 1
			const hasMelee = enemies.find(i => i.getBodiesNum(ATTACK) >= 3 && MGR(i, head) <= 5) !== undefined
			const pureRangedBias = getGuessPlayer() === Tigga ? 500 : (
				head.upgrade.isPush === true ? 600 : 0)
			const damaged = sum([head,second], i => i.hitsMax - i.hits) >= 36 * (tarDistance + 2)
				+ (hasMelee ? 0 : pureRangedBias)
            if (!Adj(second,head)){
				head.tasks.find(i => i instanceof PullTarsTask)?.end()
				const followers = myGroup.filter(i => i !== head && i!==second);
				const sortedFollowers = followers.sort((a, b) => tailIndex(a) - tailIndex(b))
				new PullTarsTask(second, sortedFollowers, head, undefined, false);
			}else if(damaged){
                fleeAction(cre,myGroup,head,tail,second)
            }else{
                SA(cre,'push')
                let ifChase:boolean
                if(target instanceof Cre && target.getBodiesNum(ATTACK)===0){
                    ifChase=true
                }else if(target instanceof Cre && target.getBodiesNum(WORK)>0 && inRampart(target)){
                    ifChase=false
                }else if(target instanceof Cre && target.getBodiesNum(WORK)>0 && !inRampart(target)){
                    ifChase=true
                }else{
                    ifChase=false
                }
                if(Adj(head,target) && !ifChase){
                    head.stop()
                    head.tasks.find(i => i instanceof PullTarsTask)?.end()
                }else if(head.getBodiesNum(ATTACK)===0){
                    const hasMeleeEnemy=enemies.find(i=>MGR(i,cre)<=4
                        && i.getBodiesNum(ATTACK)>=2)!==undefined
                    if(dis<=2){
                        if(hasMeleeEnemy){
                            fleeAction(cre,myGroup,head,tail,second)
                        }else{
                            cre.stop()
                            head.tasks.find(i => i instanceof PullTarsTask)?.end()
                        }
                    }else if(dis===3){
                        if(hasMeleeEnemy){
                            if(ranBool(0.9)){
                                fleeAction(cre,myGroup,head,tail,second)
                            }else{
                                cre.stop()
                                head.tasks.find(i => i instanceof PullTarsTask)?.end()
                            }
                        }else{
                            if(ranBool(0.9)){
                                pushAction(cre,target,myGroup,head,tail,second)
                            }else{
                                cre.stop()
                                head.tasks.find(i => i instanceof PullTarsTask)?.end()
                            }
                        }
                    }else if(dis===4){
                        if(hasMeleeEnemy){
                            if(ranBool(0.9)){
                                cre.stop()
                                head.tasks.find(i => i instanceof PullTarsTask)?.end()
                            }else{
                                pushAction(cre,target,myGroup,head,tail,second)
                            }
                        }else{
                            pushAction(cre,target,myGroup,head,tail,second)
                        }
                    }else{
                        pushAction(cre,target,myGroup,head,tail,second)
                    }
                }else{
                    pushAction(cre,target,myGroup,head,tail,second)
                }
            }
        }else{
            SA(cre,'NO TAIL HEAD')
        }
    }else{
        SA(cre,'NO TARGET')
    }
}
function pushAction(cre:Cre,target:Cre | StructureSpawn | StructureExtension,
    myGroup:Cre[],head:Cre,tail:Cre,second:Cre){
    const followers=myGroup.filter(i=>i!==head)
    const sortedFollowers = followers.sort((a, b) => tailIndex(a) - tailIndex(b))
    tail.tasks.find(i => i instanceof PullTarsTask)?.end()
    new PullTarsTask(cre,sortedFollowers,target)
}
function fleeAction(cre:Cre,myGroup:Cre[],head:Cre,tail:Cre,second:Cre){
    SA(cre,'flee')
    const fatigueHolder=best(
        myGroup.filter(i=>i.role===tailPart
            && i.master.fatigue===0)
            ,i=>-tailIndex(i));
    head.tasks.find(i => i instanceof PullTarsTask)?.end()
    if(fatigueHolder){
        const followers=myGroup.filter(i=>tailIndex(i)<tailIndex(fatigueHolder))
        const sortedFollowers = followers.sort((a, b) => tailIndex(b) - tailIndex(a))
        const fatigueHolderNext=myGroup.find(i=>tailIndex(i)===tailIndex(fatigueHolder)+1)
        if(fatigueHolderNext){
            new PullTarsTask(fatigueHolder,sortedFollowers,fatigueHolderNext)
            const followers2=myGroup.filter(i=>tailIndex(i)>tailIndex(fatigueHolder))
            const sortedFollowers2 = followers2.sort((a, b) => tailIndex(b) - tailIndex(a))
            new PullTarsTask(tail,sortedFollowers2,spawn)
        }else{
            new PullTarsTask(fatigueHolder,sortedFollowers,spawn)
        }
    }else{
        new PullTarsTask(second,[head],spawn)
    }
}
function tailShoterJob(cre:Cre){
    SA(cre,"tailShoterJob")
    const targets=oppoUnits.filter(i =>
        i instanceof Cre
        || i instanceof StructureExtension
        || i instanceof StructureSpawn
    )
    const target=best(targets,i=>{
        return -MGR(i,cre)
    })
    if(target){
        const dis=MGR(target,cre)
        if(dis<=2){
            SA(cre,'FLEE')
        }else if(dis===3){
            if(ranBool(0.9)){
                SA(cre,'STOP')
                //TODO
            }
        }
        //TODO
    }
}
function tailPartJob(cre:Cre){
    SA(cre,"tailPartJob")

}
function command() {

}

