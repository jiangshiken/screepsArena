### 整体结构

主模块 >> 战术模块 >> 任务

#### 主模块

主模块负责

1. 战术模块的创建，终止，执行
    >zom:
    >
    >>已在使用中的方案：[Task](util_task.ts)<br>具有开始，终止（可中途终止），暂停，继续等功能
2. 资源释放与再分配
3. 孵化优先级排序
    >zom:
    >
    >>已在使用中的方案：[spawnTypeList](spawnTypeList.ts)<br>为每个SpawnType标记一个价值，每当有能量足够时，生产价值最高（当前最需要的）那个Creep

##### 资源释放与再分配

有些模块在完成特定目标后不需要再执行，比如开局模块执行完成之后，主模块可以将开局模块控制的建筑工转移给野矿采集模块。
>zom:
>>已在使用中的方案：将采集者的任务设定为采集所有的Resource 或 Container，距离近的优先度高，在300tick过后再制造额外的采集者。
>
>>考虑中的方案：将野矿采集和主矿采集分离，主矿采集完毕后，通过改变Creep的roleFunc来将开局的采集者的任务变为野矿采集者

##### 孵化优先级排序

每个战术模块需要提供一个scaleUp方法来进行扩容，这个方法会返回一个Boolean，如果为true，则会阻断优先级比他低的模块处理scaleUp方法，如果为false，则允许优先级更低的模块处理他们的scaleUp方法。
>zom:
>
>>已在使用中的方案：等价于现在的Task暂停继续，但必须手动写

举个例子，假如主模块中计算得出的孵化优先级为

1. 维护模块
2. 反rush模块
3. 野矿模块

维护模块的scaleUp返回了false，则继续执行反rush模块的scaleUp方法。反rush模块返回了true，执行终止，野矿模块的scaleUp方法不会被执行。

#### 战术模块

战术模块是一个**独立**的执行分区，它控制一部分资源（爬或其他对象），并将这些资源组织成任务。它会暴露两个方法：run():void 和 scaleUp():boolean，供主模块调用。战术模块之间分工合作，相互独立，不互相调用方法，也不应当争夺对象的控制权。
>zom:
>>已在使用中的方案：当前版本中没有战术模块，但Creep之间会感知互相的存在来判断战力，组织进退
战术模块负责

1. 任务的创建，终止，校验，执行
2. 管理的爬、其他对象的状态刷新
3. 模块内资源释放与再分配
4. 扩容

##### 状态刷新

判断管理的资源是否可用，比如：判断管理的爬是否还存活，想要采集的矿是否还存在等等
>zom:
>
>>已在使用中的方案：在代码中写上`if(exist(x))`
##### 扩容

在scaleUp中请求孵化爬，并将孵化出来的爬纳入自己的管理。当模块有扩容的需求时，不管当前能否孵化，scaleUp方法都应该返回true，以阻断低优先级模块的扩容请求。这么做的原因是，当高优先级的模块想要孵化一个较大的爬，而能量暂时不足时，需要阻断其他孵化请求，等待装填。如果任由低优先级模块扩容，可能导致高优先级模块的扩容请求永远得不到满足。

#### 任务

任务是最小的执行单元，它包含了最小化的仅用于执行的对象及资源，这些内容全都由它的创建者——战术模块提供。它仅仅提供一个 run():void 方法供战术模块调用。
>zom:
>
>>已在使用中的方案：相当于[Task](util_task.ts)

### 设计思路

1. 层级清晰，每个层级决定管理的资源的执行优先级，而不决定自己被执行的优先级
2. 资源独立可控，一个爬只能归属于一个任务，一个模块
3. 模块之间解耦合，任务之间解耦合，方便编写调试
>zom:
>>提问：相同体型的Creep为何需要同时用到两个战术模块 ？而不是同一时间只运行一种，比方说主站模块（争夺资源点，推家守家等），大概意思是把每个功能做成一个战术模块？
>>* 推家
>>* 守家
>>* 守资源点
>>* 夺资源点
>
>masterkeze:
>>解答：调用链条是自上而下的：主模块->战术模块.run()->任务.run()->creep.move() 
>>战术模块只能通过扩容请求和主模块的资源再分配，来取得creep的控制权，战术模块只能操作他控制的爬，不允许操作其他模块控制的爬。
>>你的理解可能是：一个模块执行时，在所有的爬中按照特定条件（体型，能量等）过滤出他的目标爬，再操作这些爬。这会使得模块之间产生较强的耦合性，在开发一个模块的时候，还需要注意和其他模块可能产生的冲突。
>>这套层级结构目的就是为了解决这种冲突，战术模块本身只负责运作自己的资源，以及请求新的资源，资源的分配有更高层级的主模块进行。

### 



: ) 欢迎讨论
