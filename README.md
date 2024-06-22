# Cazomas Screeps Arena

### 前置条件

- [Node.JS](https://nodejs.org/en/download) (10.x || 12.x || 16.x)
- 包管理器 ([Yarn](https://yarnpkg.com/en/docs/getting-started) or [npm](https://docs.npmjs.com/getting-started/installing-node))
- Rollup CLI (可选, 通过该指令安装 `npm install -g rollup`)

### 初始化

```bash
# npm
npm i
# yarn
yarn
```

### 如何使用

- 在 src/ 路径下建立对应模式的文件夹：如 src/arena_alpha_spawn_and_swamp
- 在该路径下编写typescript代码
- 通过下方指令编译，编译后文件会在 dist/arena_alpha_spawn_and_swamp 路径下
- 修改游戏内代码路径到上述路径即可

```bash
# 一次编译
npm run build
# 检测到变更后自动编译
npm run watch
```

### 注意事项

screeps-arena 类型定义在 node_modules/@types/screeps-arena 文件夹下，由玩家手动维护，如果出现与文档不符合的情况，直接修改定义文件即可，该文件夹被包含在git中，如有改动请记得一并提交。

### 插件相关
推荐使用 vsc-organize-imports，并禁用 eslint, prettier
