import { ATTACK, BOTTOM, BOTTOM_LEFT, BOTTOM_RIGHT, CARRY, HEAL, LEFT, MOVE, RANGED_ATTACK, RESOURCE_ENERGY, RIGHT, TERRAIN_SWAMP, TERRAIN_WALL, TOP, TOP_LEFT, TOP_RIGHT, WORK } from '/game/constants';
import { CostMatrix, searchPath } from '/game/path-finder';
import { ConstructionSite, Creep, OwnedStructure, Resource, Structure, StructureContainer, StructureExtension, StructureRampart, StructureSpawn, StructureTower, StructureWall } from '/game/prototypes';
import { createConstructionSite, findClosestByRange, findInRange, getObjectsByPrototype, getRange, getTerrainAt, getTicks } from '/game/utils';
import { Visual } from '/game/visual';

let library =
{
    init()
    {
        this.spawnIsRight = getObjectsByPrototype(StructureSpawn).find((spawn) => spawn.my).x >= 50;
        this.baseMatrixs = new Array();
        this.swamps = new Array();
        for(let i = 0; i < 100; ++i)for(let j = 0; j < 100; ++j)
            if(getTerrainAt({x: i, y: j}) == TERRAIN_SWAMP)this.swamps.push({x: i, y: j});
        let cost = 0;
        for(let i = 0; i < 5; ++i)this.baseMatrixs.push(new CostMatrix());
        for(let i = 0; i < 4; ++i)
        {
            cost = (i + 1) << 1;
            for(let j = 0; j < this.swamps.length; ++j)
                this.baseMatrixs[i].set(this.swamps[j].x, this.swamps[j].y, cost);
        };
    },

    posEqual(p1, p2)
    {
        return p1 && p2 && p1.x == p2.x && p1.y == p2.y;
    },

    spawnSameSideAs(gameObject)
    {
        return this.spawnIsRight? gameObject.x >= 50 : gameObject.x < 50;
    },

    dir:
    {
        right(){return library.spawnIsRight? LEFT : RIGHT;},
        left(){return library.spawnIsRight? RIGHT : LEFT;},
        top_right(){return library.spawnIsRight? TOP_LEFT : TOP_RIGHT;},
        top_left(){return library.spawnIsRight? TOP_RIGHT : TOP_LEFT;},
        bottom_right(){return library.spawnIsRight? BOTTOM_LEFT : BOTTOM_RIGHT;},
        bottom_left(){return library.spawnIsRight? BOTTOM_RIGHT : BOTTOM_LEFT;},
        top(){return TOP;},
        bottom(){return BOTTOM;}
    },

    calcSwampCost(creep)
    {
        let weight = Math.floor((creep.store.getUsedCapacity() + 49) / 50.0), moveAmount = 0;
        for(let i = 0; i < creep.body.length; ++i)
        {
            let bodypart = creep.body[i];
            if(bodypart.type == CARRY)continue;
            if(bodypart.hits)
            {
                if(bodypart.type == MOVE)
                {
                    ++moveAmount;
                    continue;
                }
                ++weight;
            }
        }
        if(!weight)return 2;
        if(!moveAmount)return 10;
        return Math.min(Math.ceil(weight * 5 / moveAmount) * 2, 10);
    },

    dirConst: [
        {pos: {x: 0, y: -1}, movement: TOP},
        {pos: {x: -1, y: -1}, movement: TOP_LEFT},
        {pos: {x: -1, y: 0}, movement: LEFT},
        {pos: {x: -1, y: 1}, movement: BOTTOM_LEFT},
        {pos: {x: 0, y: 1}, movement: BOTTOM},
        {pos: {x: 1, y: 1}, movement: BOTTOM_RIGHT},
        {pos: {x: 1, y: 0}, movement: RIGHT},
        {pos: {x: 1, y: -1}, movement: TOP_RIGHT}
    ],

    toDirection(from, to)
    {
        let dir = {x: to.x - from.x, y: to.y - from.y};
        for(let i = 0; i < 8; ++i)if(this.posEqual(this.dirConst[i].pos, dir))return this.dirConst[i].movement;
        console.log(`有bug`);
    },

    renewMatrix()
    {
        if(!this.matrixMarks)this.matrixMarks = new Array(0);
        else while(this.matrixMarks.length)
        {
            let pos = this.matrixMarks.pop();
            for(let i = 0; i < 5; ++i)this.baseMatrixs[i].set(pos.x, pos.y,
                getTerrainAt(pos) == TERRAIN_SWAMP? (i + 1) << 1 : 0);
        }
        for(let i = 0; i < 5; ++i)
        {
            for(let j = 0; j < gameResource.obstacles.length; ++j)
            {
                let obs = gameResource.obstacles[j];
                this.baseMatrixs[i].set(obs.x, obs.y, 255);
                this.matrixMarks.push({x: obs.x, y: obs.y});
            }
            for(let j = 0; j < gameResource.myCreeps.length; ++j)
            {
                let creep = gameResource.myCreeps[j];
                this.baseMatrixs[i].set(creep.x, creep.y, 255);
                this.matrixMarks.push({x: creep.x, y: creep.y});
            }
            for(let j = 0; j < gameResource.myConstructionSites.length; ++j)
            {
                let site = gameResource.myConstructionSites[j];
                this.baseMatrixs[i].set(site.x, site.y, 254);
                this.matrixMarks.push({x: site.x, y: site.y});
            }
        }
        this.lastRefreshTick = getTicks();
    },

    posValid(pos)
    {
        if(!pos || !pos.x || !pos.y || pos.x < 0 || pos.x > 99 || pos.y < 0 || pos.y > 99)return false;
        return true;
    },

    getMatrix(creep)
    {
        if(!this.lastRefreshTick || this.lastRefreshTick < getTicks())this.renewMatrix();
        switch(creep.role)
        {
            case `stealer`:
            {
                let matrix = this.baseMatrixs[0].clone();
                for(let p = 0; p < gameResource.enemyCreeps.length; ++p)
                {
                    let enemy = gameResource.enemyCreeps[p];
                    let tmp = false;
                    for(let i = 0; i < gameResource.enemySpawns.length; ++i)
                        if(library.posEqual(enemy, gameResource.enemySpawns[i]))tmp = true;
                    if(tmp)continue;
                    if(this.getType(enemy) & this.ATTACKER)for(let i = -2; i < 3; ++i)for(let j = -2; j < 3; ++j)
                        if(this.posValid({x: enemy.x + i, y: enemy.y + j}))matrix.set(enemy.x + i, enemy.y + j,
                            matrix.get(enemy.x + i, enemy.y + j) + Math.min(255 / (Math.max(Math.abs(i), 
                            Math.abs(j)) + 1), 254 - matrix.get(enemy.x + i, enemy.y + j))),
                            this.matrixMarks.push({x: enemy.x + i, y: enemy.y + j});
                    if(this.getType(enemy) & this.SHOOTER)for(let i = -4; i < 5; ++i)for(let j = -4; j < 5; ++j)
                        if(this.posValid({x: enemy.x + i, y: enemy.y + j}))matrix.set(enemy.x + i, enemy.y + j,
                            matrix.get(enemy.x + i, enemy.y + j) + Math.min(255 / (Math.max(Math.abs(i), 
                            Math.abs(j)) + 1), 254 - matrix.get(enemy.x + i, enemy.y + j))),
                            this.matrixMarks.push({x: enemy.x + i, y: enemy.y + j});
                }
                for(let i = -3; i < 4; ++i)for(let j = -3; j < 4; ++j)
                    if(this.posValid({x: creep.x + i, y: creep.y + j}))
                        gameResource.vis.text(matrix.get(creep.x + i, creep.y + j).toString(),
                            {x: creep.x + i, y: creep.y + j}, {font: 0.5});
                return matrix;
            }
        }
        return this.baseMatrixs[(this.calcSwampCost(creep) >> 1) - 1];
    },

    ATTACKER: 0x0001, SHOOTER: 0x0002, HEALER: 0x0004, WORKER: 0x0008,
    getType(creep)
    {
        if(!(creep instanceof Creep))return 0;
        if(creep.getTypeRet !== undefined)return creep.getTypeRet;
        creep.getTypeRet = 0;
        if(creep.body.find((bodypart) => bodypart.type == ATTACK))creep.getTypeRet |= this.ATTACKER;
        if(creep.body.find((bodypart) => bodypart.type == RANGED_ATTACK))creep.getTypeRet |= this.SHOOTER;
        if(creep.body.find((bodypart) => bodypart.type == HEAL))creep.getTypeRet |= this.HEALER;
        if(creep.body.find((bodypart) => bodypart.type == WORK || bodypart.type == CARRY))creep.getTypeRet |=
            this.WORKER;
        return creep.getTypeRet;
    },

    isEmpty(pos)
    {
        return this.posValid(pos) && getTerrainAt(pos) != TERRAIN_WALL && !gameResource.obstacles.find((obs) => 
            this.posEqual(obs, pos));
    },

    placeExtSite(resource)
    {
        let cnt = 0, not = 0;
        for(let i = -1; i < 2; ++i)for(let j = -1; j < 2; ++j)if(i || j)
        {
            if(this.isEmpty({x: resource.x + i, y: resource.y + j}))++cnt;
            else ++not;
        }
        const extAmount = Math.min(Math.floor(resource.amount / 350), 7 - not);
        if(cnt >= extAmount)
        {
            cnt = extAmount;
            for(let i = -1; i < 2; ++i)for(let j = -1; j < 2 && cnt; ++j)
            {
                if(!(i || j)){++cnt; continue;}
                let pos = {x: resource.x + i, y: resource.y + j};
                if(this.isEmpty(pos))createConstructionSite(pos, StructureExtension), --cnt;
            }
            return true;
        }
        return false;
    }
};

let gameResource =
{
    vis: new Visual(1, true),

    setup()
    {
        library.init();
        this.startSpawn = getObjectsByPrototype(StructureSpawn).find((spawn) => spawn.my);
        this.nearSources = getObjectsByPrototype(StructureContainer).filter((container) =>
            library.spawnSameSideAs(container));
        this.isSet = true;
    },

    loop()
    {
        this.vis.clear();
        this.containers = getObjectsByPrototype(StructureContainer);
        this.availableContainers = this.containers.filter((container) => container.store[RESOURCE_ENERGY]);
        this.spawns = getObjectsByPrototype(StructureSpawn);
        this.mySpawns = this.spawns.filter((spawn) => spawn.my);
        this.enemySpawns = this.spawns.filter((spawn) => !spawn.my);
        this.creeps = getObjectsByPrototype(Creep);
        this.myCreeps = this.creeps.filter((creep) => creep.my);
        this.enemyCreeps = this.creeps.filter((creep) => !creep.my);
        this.constructionSites = getObjectsByPrototype(ConstructionSite);
        this.myConstructionSites = this.constructionSites.filter((site) => site.my);
        this.enemyConstructionSites = this.constructionSites.filter((site) => !site.my);
        this.structures = getObjectsByPrototype(Structure);
        this.ownedStructures = getObjectsByPrototype(OwnedStructure);
        this.myStructures = this.ownedStructures.filter((struct) => struct.my);
        this.enemyStructures = this.ownedStructures.filter((struct) => !struct.my);
        this.myExtensions = this.myStructures.filter((struct) => struct instanceof StructureExtension);
        this.obstacles = this.structures.filter((struct) => struct instanceof StructureSpawn ||
        struct instanceof StructureTower || struct instanceof StructureExtension ||
        struct instanceof StructureWall || struct instanceof StructureRampart && !struct.my);
        this.nearEnemies = findInRange(this.mySpawns[0], gameResource.enemyCreeps, 10);
        this.droppedResources = getObjectsByPrototype(Resource);
        this.goodResources = this.droppedResources.filter((res) => res.amount > 350);
    }
};

Creep.prototype.goTo = function(target)
{
    return this.moveTo(target, {costMatrix: library.getMatrix(this)});
}

Creep.prototype.fleeFrom = function(target, len)
{
    let path = searchPath(this, {pos: target, range: len}, {costMatrix: library.getMatrix(this), flee: true});
    if(!path.incomplete && path.path[0])return this.move(library.toDirection(this, path.path[0]));
    return -1;
}

let common =
{
    moverlen: 1,
    bigMoverlen: 0,
    pickerlen: 1,
    builderlen: 1,

    fastStart(spawn)
    {
        this.moverSteps = [
            undefined,
            undefined,
            undefined,
            undefined,
            library.dir.bottom_left(),
            undefined,
            undefined,
            library.dir.left(),
            library.dir.left(),
            library.dir.right(),
            library.dir.right(),
            library.dir.left(),
            undefined,
            library.dir.left()
        ],
        this.pickerSteps = [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            library.dir.bottom_left(),
            library.dir.left(),
            library.dir.left(),
            library.dir.right(),
            library.dir.right(),
            undefined,
            library.dir.left()
        ];
        if(getTicks() == 1)createConstructionSite(spawn, StructureRampart);
        let availableSource = gameResource.nearSources.find((container) => container.store[RESOURCE_ENERGY]);
        if(!spawn.spawning)
        {
            if(!this.spawnedMover)
            {
                let body = [MOVE];
                let mover = spawn.spawnCreep(body);
                if(mover.object)
                {
                    this.mover = mover.object;
                    this.spawnedMover = true;
                    spawn.spawning = {object: mover.object, time: body.length * 3};
                    this.mover.number = 0;
                }
            }
            else if(!this.spawnedPicker)
            {
                let body = [CARRY];
                let picker = spawn.spawnCreep(body);
                if(picker.object)
                {
                    this.picker = picker.object;
                    this.spawnedPicker = true;
                    spawn.spawning = {object: picker.object, time: body.length * 3};
                    this.picker.number = 0;
                }
            }
            else if(!this.spawnedBuilder)
            {
                let body = [WORK, CARRY];
                let builder = spawn.spawnCreep(body);
                if(builder.object)
                {
                    this.builder = builder.object;
                    this.spawnedBuilder = true;
                    spawn.spawning = {object: builder.object, time: body.length * 3};
                    this.builder.number = 0;
                }
            }
        }
        if(this.mover)
        {
            if(getTicks() < 14)
            {
                this.mover.move(this.moverSteps[getTicks()]);
                if(getTicks() > 6)this.mover.pull(this.picker);
            }
            else if(availableSource)
            {
                if(getTicks() & 1)this.mover.move(library.dir.left());
                else this.mover.move(library.dir.right());
                this.mover.pull(this.picker);
            }
            else this.mover.role = `mover`, this.mover = undefined;
        }
        if(this.picker)
        {
            if(availableSource)
            {
                if(getTicks() < 14)
                {
                    this.picker.move(this.pickerSteps[getTicks()]);
                    if(getTicks() == 10)this.picker.withdraw(availableSource, RESOURCE_ENERGY);
                    if(getTicks() == 12)this.picker.transfer(spawn, RESOURCE_ENERGY);
                    if(getTicks() == 13)this.picker.pull(this.builder);
                }
                else if(getTicks() & 1)
                {
                    this.picker.withdraw(availableSource, RESOURCE_ENERGY);
                    this.picker.move(library.dir.right());
                }
                else
                {
                    this.picker.transfer(this.builder, RESOURCE_ENERGY);
                    this.picker.move(library.dir.left());
                }
            }
            else this.picker.role = `picker`, this.picker = undefined;
        }
        if(this.builder)
        {
            if(getTicks() == 13)this.builder.move(library.dir.bottom_left());
            if(availableSource)
            {
                this.builder.transfer(spawn, RESOURCE_ENERGY, 45);
                this.builder.build(findClosestByRange(this.builder,
                    findInRange(this.builder, gameResource.myConstructionSites, 3)));
            }
            else this.builder.role = `builder`, this.builder = undefined;
        }
    },

    run()
    {
        let spawn = gameResource.startSpawn;
        /*生产兵力*/
        /*快速开局*/
        this.fastStart(spawn);
        /*正常生产*/
        let attackers = gameResource.myCreeps.filter((creep) => creep.role == `attacker`);
        let shooters = gameResource.myCreeps.filter((creep) => creep.role == `shooter`);
        let stealers = gameResource.myCreeps.filter((creep) => creep.role == `stealer`);
        let movers = gameResource.myCreeps.filter((creep) => creep.role == `mover`);
        let pickers = gameResource.myCreeps.filter((creep) => creep.role == `picker`);
        let bigMovers = gameResource.myCreeps.filter((creep) => creep.role == `bigmover`);
        let builders = gameResource.myCreeps.filter((creep) => creep.role == `builder`);
        if(!spawn.spawning)
        {
            if(!gameResource.nearSources.find((source) => source.store[RESOURCE_ENERGY]))
            {
                if(movers.length < 2)
                {
                    let body = [MOVE];
                    let mover = spawn.spawnCreep(body);
                    if(mover.object)
                    {
                        mover.object.role = `mover`;
                        spawn.spawning = {object: mover.object, time: body.length * 3};
                        mover.object.number = this.moverlen++;
                    }
                }
                else if(pickers.length < 2)
                {
                    let body = [CARRY];
                    let picker = spawn.spawnCreep(body);
                    if(picker.object)
                    {
                        picker.object.role = `picker`;
                        spawn.spawning = {object: picker.object, time: body.length * 3};
                        picker.object.number = this.pickerlen++;
                    }
                }
                else if(bigMovers.length < 2)
                {
                    let body = [MOVE, MOVE, MOVE, MOVE, MOVE];
                    let mover = spawn.spawnCreep(body);
                    if(mover.object)
                    {
                        mover.object.role = `bigmover`;
                        spawn.spawning = {object: mover.object, time: body.length * 3};
                        mover.object.number = this.bigMoverlen++;
                    }
                }
                else if(builders.length < 2)
                {
                    let body = [WORK, CARRY];
                    let builder = spawn.spawnCreep(body);
                    if(builder.object)
                    {
                        builder.object.role = `builder`;
                        spawn.spawning = {object: builder.object, time: body.length * 3};
                        builder.object.number = this.builderlen++;
                    }
                }
            }
            if(!spawn.spawning)
            {
                if(shooters.length < 5 && shooters.length <= stealers.length)
                {
                    let body = [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
                        RANGED_ATTACK, RANGED_ATTACK];
                    let shooter = spawn.spawnCreep(body);
                    if(shooter.object)
                    {
                        shooter.object.role = `shooter`;
                        spawn.spawning = {object: shooter.object, time: body.length * 3};
                    }
                }
                else if(attackers.length < 5 && attackers.length <= stealers.length)
                {
                    let body = [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK,
                        ATTACK, ATTACK, ATTACK];
                    let attacker = spawn.spawnCreep(body);
                    if(attacker.object)
                    {
                        attacker.object.role = `attacker`;
                        spawn.spawning = {object: attacker.object, time: body.length * 3};
                    }
                }
                else if(stealers.length < 5)
                {
                    let body = [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
                        MOVE, ATTACK, ATTACK, ATTACK];
                    let stealer = spawn.spawnCreep(body);
                    if(stealer.object)
                    {
                        stealer.object.role = `stealer`;
                        spawn.spawning = {object: stealer.object, time: body.length * 3};
                    }
                }
            }
        }
        if(shooters.length + attackers.length > 3 && (!spawn.spawning || spawn.spawning.time == 1))
            this.attacking = true;
        for(let i = 0; i < shooters.length; ++i)
        {
            let shooter = shooters[i];
            if(shooter && (!spawn.spawning || spawn.spawning.object != shooter))
            {
                if(this.attacking)
                {
                    let target = findClosestByRange(shooter, gameResource.enemyCreeps);
                    let range = 100;
                    if(target)range = getRange(shooter, target);
                    let closestSpawn = findClosestByRange(shooter, gameResource.enemySpawns);
                    if(!target || range >= 10 || closestSpawn && range >= getRange(shooter, closestSpawn))
                        target = closestSpawn, range = getRange(shooter, target);
                    if(target)
                    {
                        if(library.getType(target) & library.ATTACKER)
                        {
                            if(range > 3)shooter.goTo(target);
                            if(range < 3)shooter.fleeFrom(target, 10);
                            shooter.rangedAttack(target);
                        }
                        else
                        {
                            if(range > 2)shooter.goTo(target);
                            if(range == 1)shooter.rangedMassAttack();
                            else shooter.rangedAttack(target);
                        }
                    }
                }
                else
                {
                    let enemy = findClosestByRange(shooter, gameResource.nearEnemies);
                    if(enemy)shooter.goTo(enemy), shooter.rangedAttack(enemy);
                }
            }
        }
        for(let i = 0; i < attackers.length; ++i)
        {
            let attacker = attackers[i];
            if(attacker && (!spawn.spawning || spawn.spawning.object != attacker))
            {
                if(this.attacking)
                {
                    let target = findClosestByRange(attacker, gameResource.enemyCreeps);
                    let closestSpawn = findClosestByRange(attacker, gameResource.enemySpawns);
                    if(!target || getRange(attacker, target) >= 10 || (closestSpawn &&
                        getRange(attacker, target) >= getRange(attacker, closestSpawn)))target = closestSpawn;
                    if(target)attacker.goTo(target), attacker.attack(target);
                }
                else
                {
                    let enemy = findClosestByRange(attacker, gameResource.nearEnemies);
                    if(enemy)attacker.goTo(enemy), attacker.attack(enemy);
                }
            }
        }
        for(let i = 0; i < stealers.length; ++i)
        {
            let stealer = stealers[i];
            if(stealer && (!spawn.spawning || spawn.spawning.object != stealer))
            {
                let closestSpawn = findClosestByRange(stealer, gameResource.enemySpawns);
                if(closestSpawn)stealer.goTo(closestSpawn), stealer.attack(closestSpawn);
            }
        }
        for(let i = 0; i < movers.length; ++i)
        {
            let mover = movers[i];
            if(mover)
            {
                let friend = pickers[mover.number];
                if(friend)
                {
                    if(getRange(mover, friend) == 1)
                    {
                        let target = findClosestByRange(mover, gameResource.availableContainers);
                        if(target)mover.goTo(target), mover.pull(friend);
                    }
                    else mover.goTo(friend);
                }
                else mover.goTo(spawn);
            }
        }
        for(let i = 0; i < pickers.length; ++i)
        {
            let picker = pickers[i];
            if(picker)
            {
                let target = findInRange(picker, gameResource.availableContainers, 1)[0];
                picker.working = target && getRange(picker, target) < 2;
                if(picker.store[RESOURCE_ENERGY])picker.drop(RESOURCE_ENERGY);
                if(picker.working)picker.withdraw(target, RESOURCE_ENERGY);
                let helper = movers[picker.number];
                if(helper && !picker.working)picker.move(library.toDirection(picker, helper));
            }
        }
        for(let i = 0; i < bigMovers.length; ++i)
        {
            let mover = bigMovers[i];
            if(mover)
            {
                let friend = builders[mover.number];
                if(friend)
                {
                    if(!friend.working)
                        if(getRange(mover, friend) == 1)
                        {
                            let target = findClosestByRange(mover, gameResource.goodResources);
                            if(target)
                                if(getRange(mover, target))
                                {
                                    if(!mover.stop)mover.goTo(target);
                                    else mover.stop = false;
                                    mover.pull(friend);
                                }
                                else mover.move(library.toDirection(mover, friend)),
                                    mover.pull(friend), mover.stop = true;
                        }
                        else mover.goTo(friend);
                    else mover.fleeFrom(friend, 2);
                }
            }
        }
        for(let i = 0; i < builders.length; ++i)
        {
            let builder = builders[i];
            if(builder)
            {
                let target = gameResource.goodResources.find((res) => library.posEqual(res, builder));
                if(!target)target = findInRange(builder, gameResource.goodResources.filter((resource) =>
                    !resource.notAvailable), 1)[0];
                if(!builder.working && target && !getRange(builder, target))builder.working = true;
                let res = gameResource.droppedResources.find((res) => library.posEqual(res, builder));
                if(builder.working && (!findInRange(builder, gameResource.myConstructionSites, 1).length &&
                    !findInRange(builder, gameResource.myExtensions, 1).find((ext) =>
                    ext.store.getFreeCapacity(RESOURCE_ENERGY)) || !res))builder.working = false;
                if(!builder.working && builder.store[RESOURCE_ENERGY])builder.drop(RESOURCE_ENERGY);
                if(target && !target.placedExtSite)
                {
                    if(library.placeExtSite(target))target.placedExtSite = true;
                    else target.notAvailable = true;
                }
                if(builder.working)
                {
                    let ext = findInRange(builder, gameResource.myExtensions, 1).find((ext) =>
                        ext.store.getFreeCapacity(RESOURCE_ENERGY));
                    if(ext)builder.transfer(ext, RESOURCE_ENERGY,
                        Math.min(45, ext.store.getFreeCapacity(RESOURCE_ENERGY)));
                    builder.build(findClosestByRange(builder, gameResource.myConstructionSites));
                    builder.pickup(res);
                }
                let helper = findInRange(builder, bigMovers, 1)[0];
                if(helper && !builder.working)builder.move(library.toDirection(builder, helper)),
                    builder.friend = helper;
            }
        }
        if(spawn.spawning && !--spawn.spawning.time)spawn.spawning = undefined;
    }
};

let strategies =
{
    run()
    {
        if(!gameResource.isSet)gameResource.setup();
        gameResource.loop();
        this.common();
    },

    common()
    {
        common.run();
    }
};

export function loop()
{
    strategies.run();
}
