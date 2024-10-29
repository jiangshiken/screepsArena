// /**
//  Module: plan
//  Author: masterkeze
//  CreateDate:   2023.2.2
//  UpdateDate:   2023.2.2
//  version 0.0.0
//  description:
// */

// // 抽象的操作
// enum Operation {
// 	// 摧毁
// 	Destory = 1,
// 	// 骚扰（优先生存）
// 	Harass = 2,
// 	// 防守
// 	Defend = 3,
// 	// 采集
// 	Collect = 4,

// }

// // 计划，针对特定目的生成计划实例
// interface Plan {
// 	operation: Operation
// 	generatePlanInstance(target: any): PlanInstance
// }

// enum PlanInstanceRunReturn {
// 	Complete = 1,
// 	Fail = 2,
// 	Continue = 3
// }

// // 计划实例，可以执行的
// interface PlanInstance {
// 	// 生成实例的计划的Id，根据执行结果调整计划的权重
// 	planId: string
// 	// 全局唯一
// 	instanceId: string
// 	// 计划执行成功的信心
// 	confidence: number
// 	run(): PlanInstanceRunReturn
// }
