import { ATTACK, RANGED_ATTACK, WORK } from "game/constants";
import { StructureExtension, StructureSpawn } from "game/prototypes";
import { getTicks } from "game/utils";
import { set_moveCostForceRate, setMoveMapSetRate } from "../maps";
import { PullTarsTask } from "../pullTasks";
import { builderStandard } from "../roles/builder";
import { stdShoter } from "../roles/fighters_std";
import { enemySpawn, spawn, spawnCleared, spawnCreep } from "../spawn";
import { inRampart } from "../util_attackable";
import { TB } from "../util_autoBodys";
import { Cre, enemies, friends, getDamagedRate, getTaunt, hasThreat, oppoUnits, Role, Unit } from "../util_Cre";
import { ranBool, sum } from "../util_JS";
import { Dooms, getGuessPlayer, Tigga } from "../util_player";
import { Adj, MGR, X_axisDistance } from "../util_pos";
import { drawLineComplex, SA } from "../util_visual";
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
    set_moveCostForceRate(0.1)
    setMoveMapSetRate(0.04);
    if(getTicks()===50){
        //400
        spawnCreep(TB('5MCW'),builderStandard)
        for (let g = 0; g < 3; g++) {
            // for (let i = 0; i < 2; i++) {
            //     spawnCreep(TB('M'),jamer)
            // }
            if(g<=1){
                //50+900+50
                spawnCreep(TB('M6RM'),tailMelee,new TailInfo(g,0))
            }else{
                spawnCreep(TB('3M10AM'),tailMelee,new TailInfo(g,0))
            }
            spawnCreep(TB('4M3HM'),tailHealer,new TailInfo(g,1))
            spawnCreep(TB('2M'),tailPart,new TailInfo(g,2))
            for (let i = 0; i < 12; i++) {
                spawnCreep(TB('M'),tailPart,new TailInfo(g,3+i))
            }
        }
    }
    if(getTicks()>50){
        if(spawnCleared(spawn)){
            // if(friends.filter(i=>i.role===jamer).length<=8){
            //     spawnCreep(TB('M'),jamer)
            // }else{
                spawnCreep(TB('5MR'),stdShoter)
            // }
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
    const target = best(targets, tar => {
        let typeBonus: number = 0
        if (tar instanceof Cre) {
            if (tar.getBodiesNum(WORK) > 0) {
                typeBonus = 1
            }else if(MGR(tar,enemySpawn)<=7 && tar.getBodiesNum(ATTACK)>=2){
                typeBonus= 0.3
            } else if (tar.getBodiesNum(ATTACK) + tar.getBodiesNum(RANGED_ATTACK) <= 1) {
                typeBonus = 0.01
            } else {
                typeBonus = 3
            }
        } else if (tar instanceof StructureExtension) {
            if (getGuessPlayer() === Tigga) {
                typeBonus = 1
            } else if (getGuessPlayer() === Dooms) {
                typeBonus = 2
            }  else {
                typeBonus = 0.15
            }
            // typeExtra = 0.15
        } else if (tar instanceof StructureSpawn) {
            if (getGuessPlayer() === Tigga) {
                typeBonus = 10
            } else if (getGuessPlayer() === Dooms) {
                typeBonus = 10
            }  else {
                typeBonus = 1
            }
            // typeExtra = getTicks() <= 630 ? 100 : 0.5
        }
        const X_axisDistanceBonus=1+0.05*X_axisDistance(tar,enemySpawn)
        const damageRate=getDamagedRate(cre)
        const disBonus = 1 / (1 + (0.1+4*damageRate) * MGR(tar, cre))
        const sameBonus = cre.upgrade.currentTarget === tar ? 2 : 1
        const otherLeaders=friends.filter(i=>i.role===tailMelee && i!==cre)
        const linkBonus=1+otherLeaders.filter(i=>i.upgrade.currentTarget === tar).length
        const tauntBonus = 1 + 0.1*getTaunt(tar).value
        const final = disBonus * sameBonus*linkBonus * typeBonus * tauntBonus*X_axisDistanceBonus
        SA(tar, 'T=' +final+ " lkb="+linkBonus+" tyb="+typeBonus+" disb="+disBonus+" ttb="+tauntBonus+' xb='+X_axisDistanceBonus)
        return final
    })
    if(target){
        drawLineComplex(cre,target,1,"#ee3333","dashed")
        cre.upgrade.currentTarget = target
        const myGroupNum=tailGroup(cre)
        const myGroup=getGroup(myGroupNum)
        SA(cre,'mg='+myGroupNum+' mgl='+myGroup.length)
        const myTailParts=myGroup.filter(i=>i.role===tailPart)
        const tail = best(myGroup, i => tailIndex(i))
        const second= myGroup.find(i=>tailIndex(i)===1)
        const head = best(myGroup, i => -tailIndex(i))
        const enemyThreats=enemies.filter(i=>hasThreat(cre)&& MGR(cre,i)<=16)
        const enemyMelees=enemyThreats.filter(i=>i.getBodiesNum(ATTACK)>=2)
        const closestThreat=best(enemyThreats,i=>-MGR(i,cre))
        const closestThreatDis=closestThreat?MGR(closestThreat,cre):50
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
            const tailsHasThreat = myTailParts.find(mem =>
                enemyThreats.find(i => Adj(i, mem))!==undefined
            )!==undefined
            const frontHasThreat=enemyMelees.find(i=>Adj(i,head))!==undefined
            ||enemyMelees.find(i=>Adj(i,second))!==undefined
            if (!Adj(second,head)){
                SA(cre,'linkHead')
				head.tasks.find(i => i instanceof PullTarsTask)?.end()
				const followers = myGroup.filter(i => i !== head && i!==second);
				const sortedFollowers = followers.sort((a, b) => tailIndex(a) - tailIndex(b))
				new PullTarsTask(second, sortedFollowers, head);
			}else if(damaged||tailsHasThreat||frontHasThreat){
                fleeAction(cre,myGroup,head,tail,second)
            }else{
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
                    if(closestThreatDis<=2){
                        if(hasMeleeEnemy){
                            fleeAction(cre,myGroup,head,tail,second)
                        }else{
                            cre.stop()
                            head.tasks.find(i => i instanceof PullTarsTask)?.end()
                        }
                    }else if(closestThreatDis===3){
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
                    }else if(closestThreatDis===4){
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
function pushAction(cre:Cre,target:Unit,
    myGroup:Cre[],head:Cre,tail:Cre,second:Cre){
    SA(cre,'push')
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

