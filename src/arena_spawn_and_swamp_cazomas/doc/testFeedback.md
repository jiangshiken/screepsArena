# 测试反馈

## 测试结果

输赢55开

## 出现的问题

在测试中，主要出现如下两种问题

### 寻路优化

在寻路（寻找container）时，常出现因更新路径而引起的多余步骤，这往往使得我方Creep落后1~
> zom : 可能是以为用的是getRange 不是path，如果是反复横跳，修改后应该会改善

2tick。我们是否可以选择局部较优解（弱化的蚁群算法或模拟退火）以减少这种影响？
此外，在特定creep锁定目标容器后是否需要及时更新也可做适当考虑。在众多失败对局中，部分为此原因所致。

### 回防时间

另一方面，Cazomas似乎不能很好地处理风筝问题，在大部分兵力集火对面时，往往很难顾及对面偷家的兵种。
例如在与D_魔鬼的对决中，对面仅用简单的兵力就牵制了我方大部队，导致我方无法及时回防对面的偷家小队，直接被偷家。
> zom : 大概是躲地堡的码出了问题
而在与Marvin的对决中，我方因为无暇顾及对面多队进攻小队而被耗死，最终被逐一击破，全军覆没。
> zom : 大概是判断进退出了问题
这可能是Cazomas目前最明显的不足，也可能导致顺风开局最终惜败对手。
这里提出我的小小的建议：进行优先级判断，在大于某特定值时（例如距离），可动态分配敌方spawn与creep的权重，进而做出后续判断。
> zom : orz，会改进的

