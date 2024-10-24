import { ATTACK, RANGED_ATTACK, WORK } from "game/constants";
import { StructureExtension, StructureSpawn } from "game/prototypes";
import { getTicks } from "game/utils";
import { stdShoter } from "../roles/fighters_std";
import { jamer } from "../roles/jamer";
import { PullTarsTask, set_pullIgnoreSwamp } from "../units/pullTasks";
import { enemySpawn, spawn, spawnCleared, spawnCreep } from "../units/spawn";
import { best } from "../util_WT";
import { displayPos, inRampart } from "../utils/util_attackable";
import { TB } from "../utils/util_autoBodys";
import { Cre, enemies, friends, getDamagedRate, getTaunt, hasThreat, MoveTask, oppoUnits, Role, Unit } from "../utils/util_Cre";
import { d2, first, goInRange, ranBool, sum } from "../utils/util_JS";
import { Dooms, getGuessPlayer, Tigga } from "../utils/util_player";
import { Adj, atPos, getDirectionByPos, GR, Pos, X_axisDistance, Y_axisDistance } from "../utils/util_pos";
import { drawLineComplex, SA } from "../utils/util_visual";
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
    set_pullIgnoreSwamp(true)
    // set_moveCostForceRate(0.001)
    // setMoveMapSetRate(0.0004);
    if(getTicks()===50){
        //400
        // spawnCreep(TB('5MCW'),builderStandard)
        // spawnCreep(TB('4CM'),harvester)
        for (let i = 0; i < 8; i++) {
            spawnCreep(TB('M'),jamer)
        }
        for (let g = 0; g < 3; g++) {
            if(g<=0){
                //750+160+50
                spawnCreep(TB('5R2AM'),tailMelee,new TailInfo(g,0))
                spawnCreep(TB('4M2HM'),tailHealer,new TailInfo(g,1))
                const tailLen=5
                for (let i = 0; i < tailLen; i++) {
                    spawnCreep(TB('M'),tailPart,new TailInfo(g,2+i))
                }
                spawnCreep(TB('11M'),tailPart,new TailInfo(g,2+tailLen))
            }else{
                spawnCreep(TB('3M10AM'),tailMelee,new TailInfo(g,0))
                spawnCreep(TB('4M3HM'),tailHealer,new TailInfo(g,1))
                const tailLen=3
                for (let i = 0; i < tailLen; i++) {
                    spawnCreep(TB('M'),tailPart,new TailInfo(g,2+i))
                }
                spawnCreep(TB('9M'),tailPart,new TailInfo(g,2+tailLen))
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
function ESDGreaterThan(a:Pos,b:Pos){
    return ESDCompare(a,b)>0
}
function ESDCompare(a:Pos,b:Pos):number{
    const ESD_a=enemySpawnDistance(a)
    const ESD_b=enemySpawnDistance(b)
    if(ESD_a<50 && ESD_b<50){
        const disA=a.y-enemySpawn.y
        const disB=b.y-enemySpawn.y
        if(disA*disB<0){
            return -50
        }else{
            return enemySpawnDistance(a)-enemySpawnDistance(b)
        }
    }else{
        return enemySpawnDistance(a)-enemySpawnDistance(b)
    }
}
function enemySpawnDistance(pos:Pos):number{
    if(X_axisDistance(pos,enemySpawn)<=10){
        return Y_axisDistance(pos,enemySpawn)
    }else{
        return 50+X_axisDistance(pos,enemySpawn)
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
    SA(displayPos(),"oppoUnits.len"+oppoUnits.length)
    SA(displayPos(),"targets.len"+targets.length)
    const targetAndWorth:{unit:Unit,num:number}[]=targets.map(tar=>{
        SA(cre,"C")
        let typeBonus: number = 0
        if (tar instanceof Cre) {
            if (tar.getBodiesNum(WORK) > 0) {
                typeBonus = 0.2
            }else if(GR(tar,enemySpawn)<=7 && tar.getBodiesNum(ATTACK)>=2){
                typeBonus= 0.5
            } else if (tar.getBodiesNum(ATTACK) + tar.getBodiesNum(RANGED_ATTACK) <= 1) {
                typeBonus = 1.5
            } else if(tar.getBodiesNum(ATTACK) + tar.getBodiesNum(RANGED_ATTACK) > 1){
                typeBonus = 3
            }else{
                typeBonus = 0.01
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
                typeBonus = 1
            }  else {
                typeBonus = 1
            }
            // typeExtra = getTicks() <= 630 ? 100 : 0.5
        }

        const enSpawnBonus=1+0.5*goInRange(10+ESDCompare(tar,cre),0,10)
        const damageRate=getDamagedRate(cre)
        const disBonus = 1 / (1 + (0.4+4*damageRate) * GR(tar, cre))
        const sameBonus = cre.upgrade.currentTarget === tar ? 2 : 1
        const otherLeaders=friends.filter(i=>i.role===tailMelee && i!==cre)
        const linkBonus=1+3*otherLeaders.filter(i=>i.upgrade.currentTarget === tar).length
        const tauntBonus = 1 + 0.02*getTaunt(tar).value
        const final = disBonus * sameBonus*linkBonus * typeBonus * tauntBonus*enSpawnBonus
        SA(tar, 'T=' +d2(final)+ " lkb="+d2(linkBonus)+" tyb="+d2(typeBonus)
            +" disb="+d2(disBonus) +" ttb="+d2(tauntBonus)+' xb='+d2(enSpawnBonus))
        return {unit:tar,num:final}
    })
    const target = best(targetAndWorth, tar => tar.num)?.unit
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
        const enemyThreats=enemies.filter(i=>hasThreat(cre)&& GR(cre,i)<=25)
        const enemyMelees=enemyThreats.filter(i=>i.getBodiesNum(ATTACK)>=2)
        const closestThreat=best(enemyThreats,i=>-GR(i,cre))
        const closestThreatDis=closestThreat?GR(closestThreat,cre):50
        if(tail && head && second){
            //clear pull tars task
            myGroup.filter(i=>i.role===tailPart).forEach(tp=>
                tp.tasks.find(i => i instanceof PullTarsTask)?.end()
            )
            second.tasks.find(i => i instanceof PullTarsTask)?.end()
            head.tasks.find(i => i instanceof PullTarsTask)?.end()
            //
            const tarDistance = target ? GR(head, target) : 1
			const hasMelee = enemies.find(i => i.getBodiesNum(ATTACK) >= 3 && GR(i, head) <= 5) !== undefined
			const pureRangedBias = getGuessPlayer() === Tigga ? 500 : (
				head.upgrade.isPush === true ? 600 : 0)
			const damaged = sum([head,second], i => i.hitsMax - i.hits) >= 36 * (tarDistance + 2)
				+ (hasMelee ? 0 : pureRangedBias)
            const tailHasThreat = enemyThreats.find(i => GR(i, tail)<myGroup.length-3)!==undefined
            SA(cre,"tailHasThreat="+tailHasThreat)
            const frontHasThreat=enemyMelees.find(i=>Adj(i,head))!==undefined
            ||enemyMelees.find(i=>Adj(i,second))!==undefined
            SA(cre,"ESD="+enemySpawnDistance(cre))
            const XAxisThreat=enemyThreats.filter(i=>{
                SA(i,"ESD="+enemySpawnDistance(i))
                return ESDGreaterThan(i,cre)
            }).length>0
            SA(cre,"XAxisThreat="+XAxisThreat)
            if (!Adj(second,head)){
                SA(cre,'linkHead')
				head.tasks.find(i => i instanceof PullTarsTask)?.end()
				const followers = myGroup.filter(i => i !== head && i!==second);
				const sortedFollowers = followers.sort((a, b) => tailIndex(a) - tailIndex(b))
				new PullTarsTask(second, sortedFollowers, head);
			}else if(damaged||tailHasThreat||frontHasThreat){
                fleeAction(cre,myGroup,head,tail,second)
            }else if(XAxisThreat){
                SA(cre,'XAxisTt')
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
                    stopAction(cre,head,myGroup)
                }else if(head.getBodiesNum(RANGED_ATTACK)>=3){
                    const hasMeleeEnemy=enemies.find(i=>GR(i,cre)<=4
                        && i.getBodiesNum(ATTACK)>=2)!==undefined
                    SA(cre,'hasMelee='+hasMeleeEnemy)
                    SA(cre,'closestThreatDis='+closestThreatDis)
                    if(closestThreatDis<=2){
                        if(hasMeleeEnemy){
                            fleeAction(cre,myGroup,head,tail,second)
                        }else{
                            stopAction(cre,head,myGroup)
                        }
                    }else if(closestThreatDis===3){
                        if(hasMeleeEnemy){
                            if(ranBool(0.6)){
                                fleeAction(cre,myGroup,head,tail,second)
                            }else{
                                stopAction(cre,head,myGroup)
                            }
                        }else{
                            pushAction(cre,target,myGroup,head,tail,second)
                        }
                    }else if(closestThreatDis===4){
                        if(hasMeleeEnemy){
                            if(ranBool(0.6)){
                                stopAction(cre,head,myGroup)
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
                    //melee push
                    // if(MGR(cre,enemySpawn)<=8
                    //     && enemyThreats.filter(i=>MGR(i,enemySpawn)<=8).length>=3){
                    //     SA(cre,"Wait")
                    //     stopAction(cre,head,myGroup)
                    // }else{
                        pushAction(cre,target,myGroup,head,tail,second)
                    // }
                }
            }
        }else{
            SA(cre,'NO TAIL HEAD')
        }
    }else{
        SA(cre,'NO TARGET')
    }
}
function stopAction(cre:Cre,head:Cre,group:Cre[]){
    SA(cre,'STOP')
    cre.stop()
    group.forEach(mem=>
        mem.tasks.find(i => i instanceof PullTarsTask)?.end()
    )
}
function pushAction(cre:Cre,target:Unit,
    myGroup:Cre[],head:Cre,tail:Cre,second:Cre){
    SA(cre,'push')
    const followers=myGroup.filter(i=>i!==head)
    const sortedFollowers = followers.sort((a, b) => tailIndex(a) - tailIndex(b))
    tail.tasks.find(i => i instanceof PullTarsTask)?.end()
    new PullTarsTask(cre,sortedFollowers,target)
    const moveTask=cre.tasks.find(i=>i instanceof MoveTask)
    if(moveTask && moveTask instanceof MoveTask){
        const tempTar=first(moveTask.path)
        if(tempTar){
            drawLineComplex(cre,tempTar,0.8,"#ff22ff")
            if(friends.find(i=>atPos(i,tempTar))!==undefined){
                SA(cre,"CONFLICT")
                cre.tasks.find(i => i instanceof PullTarsTask)?.end()
                fleeAction(cre,myGroup,head,tail,second)
            }
        }
    }
}
function fleeAction(cre:Cre,myGroup:Cre[],head:Cre,tail:Cre,second:Cre){
    SA(cre,'flee')
    const fatigueHolder=best(
        myGroup.filter(i=>i.role===tailPart
            && i.master.fatigue===0)
            ,i=>-tailIndex(i));
    head.tasks.find(i => i instanceof PullTarsTask)?.end()
    if(fatigueHolder){
        SA(fatigueHolder,"fatigueHolder")
        const followers=myGroup.filter(i=>tailIndex(i)<tailIndex(fatigueHolder))
        const sortedFollowers = followers.sort((a, b) => tailIndex(b) - tailIndex(a))
        const fatigueHolderNext=myGroup.find(i=>tailIndex(i)===tailIndex(fatigueHolder)+1)
        if(fatigueHolderNext){
            SA(fatigueHolderNext,"fatigueHolderNext")
            SA(fatigueHolder,"SFL="+sortedFollowers.length)
            const ptt=new PullTarsTask(fatigueHolder,sortedFollowers,fatigueHolderNext,undefined,true,true)
            const direct=getDirectionByPos(fatigueHolder,fatigueHolderNext)
            SA(fatigueHolder,'direct='+direct)
            fatigueHolder.stop()
            fatigueHolder.master.move(direct)
            // fatigueHolder.master.moveTo(fatigueHolderNext,{})
            const followers2=myGroup.filter(i=>
                i!==tail
                && tailIndex(i)>tailIndex(fatigueHolder))
            const sortedFollowers2 = followers2.sort((a, b) => tailIndex(b) - tailIndex(a))
            SA(tail,"Tail="+sortedFollowers2.length)
            if(sortedFollowers2.length===0){
                tail.MTJ(spawn)
            }else{
                new PullTarsTask(tail,sortedFollowers2,spawn)
            }
        }else{
            new PullTarsTask(fatigueHolder,sortedFollowers,spawn)
        }
    }else{
        SA(cre,"no fatigueHolder")
        const followers=myGroup.filter(i=>i!==tail)
        const sortedFollowers = followers.sort((a, b) => tailIndex(b) - tailIndex(a))
        new PullTarsTask(tail,sortedFollowers,spawn)
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
        return -GR(i,cre)
    })
    if(target){
        const dis=GR(target,cre)
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
    // SA(cre,"tailPartJob")

}
function command() {

}

