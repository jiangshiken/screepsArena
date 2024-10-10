import { StructureExtension, StructureSpawn } from "game/prototypes";
import { PullTarsTask } from "../pullTasks";
import { spawn, spawnCreep } from "../spawn";
import { TB } from "../util_autoBodys";
import { Cre, damaged, friends, oppoUnits, Role } from "../util_Cre";
import { ranBool } from "../util_JS";
import { MGR } from "../util_pos";
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
    spawnCreep(TB('3M10AM'),tailMelee,new TailInfo(0,0))
    //50+900+50
    // spawnCreep(TB('M6RM'),tailShoter)
    spawnCreep(TB('4M3HM'),tailHealer,new TailInfo(0,1))
    for (let i = 0; i < 10; i++) {
        spawnCreep(TB('M'),tailPart,new TailInfo(0,2+i))
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
    return friends.filter(i=>{
        const ie:any=i.extraMessage
        if(ie && ie instanceof TailInfo){
            if(ie.group===n){
                return true
            }
        }
        return false
    })
}
function tailIndex(cre:Cre):number{
    const ie:any=cre.extraMessage
    if(ie && ie instanceof TailInfo){
        return ie.index
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
        const myGroup=getGroup(0)
        const tail = best(myGroup, i => tailIndex(i))
        const head = best(myGroup, i => -tailIndex(i))
        const dis=MGR(target,cre)
        if(tail && head){
            if(damaged(cre)){
                SA(cre,'flee')
                const followers=myGroup.filter(i=>i!==tail)
                const sortedFollowers = followers.sort((a, b) => tailIndex(b) - tailIndex(a))
                head.tasks.find(i => i instanceof PullTarsTask)?.end()
                new PullTarsTask(cre,sortedFollowers,spawn)
            }else{
                SA(cre,'push')
                const followers=myGroup.filter(i=>i!==head)
                const sortedFollowers = followers.sort((a, b) => tailIndex(a) - tailIndex(b))
                tail.tasks.find(i => i instanceof PullTarsTask)?.end()
                new PullTarsTask(cre,sortedFollowers,target)
            }
        }
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

