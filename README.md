# 岁语 (ElderLog) MVP

岁语 (ElderLog) 是一个连接长辈与子女的温情纽带应用。本应用包含两个主要端：老人端（聊天互动与服药提醒）与子女端（长辈状态数据看板）。

## 技术栈与框架

- **前端框架:** React 19 + Vite + React Router
- **构建工具:** Vite
- **UI 组件库:** Tailwind CSS, shadcn/ui, Lucide React (图标)
- **字体:** Noto Serif SC, Noto Sans SC (Google Fonts)
- **后端框架:** Express.js (使用 `tsx` 运行 TypeScript)
- **数据库 ORM:** Prisma
- **数据库:** SQLite (`dev.db`)
- **AI 引擎:** Google Gemini API (`@google/genai`)

## 目录结构

```text
/
├── prisma/
│   └── schema.prisma        # 数据库模型定义文件
├── src/
│   ├── components/ui/       # shadcn/ui 基础组件
│   ├── lib/                 # 辅助函数库 (例如 cn 工具)
│   ├── pages/               # 页面路由组件
│   │   ├── Chat.tsx         # 老人端：聊天与服药提醒页
│   │   ├── Dashboard.tsx    # 子女端：数据看板页
│   │   └── Home.tsx         # 首页入口
│   ├── App.tsx              # 主路由应用文件
│   ├── main.tsx             # 前端入口文件
│   └── index.css            # 全局样式与 Tailwind Theme 配置
├── server.ts                # Express 后端服务与 API 路由中心
├── .env.example             # 环境变量参考文件
├── package.json             # 依赖和脚本配置
├── vite.config.ts           # Vite 配置文件
└── tsconfig.*.json          # TypeScript 配置文件集
```

## 环境配置

运行此应用需要设置环境变量。请参考项目根目录的 `.env.example` 文件。

### 必要环境变量

1. **`GEMINI_API_KEY`**: 
   应用核心的 AI 聊天与数据提取依赖于 Gemini。需要在运行环境中设置此 API 密钥。在 Google AI Studio 中，这会通过平台 Secret 选项自动注入。

### 数据库初始化

项目使用 SQLite 作为轻量级本地数据库。
初次运行或修改 schema 后，请执行以下命令来同步开发数据库和重新生成 Prisma Client：

```bash
npx prisma db push
npx prisma generate
```

### 开发环境运行

项目使用 Vite middleware 深度集成到了 Express 后端中，前后端在同一端口上提供服务。

运行完整服务（结合前端与 API 后端）：

```bash
npm run dev
```
此命令会启动由 `server.ts` 监听的 3000 端口服务，并处理前端热更新（如果未被 AI Studio 禁用）和 API 路由逻辑。

### 生产环境构建

构建前端代码并编译后端 TypeScript 为生产就绪：

```bash
npm run build
```
执行后会在 `dist` 和 `dist/server` 目录生成文件。可以利用 `npm run start` 运行编译后的全栈应用服务。

## API 路由说明

- `GET /api/init`: 初始化操作，如果没有默认用户会创建一个，同时为其创建一些演示的服药定时数据。
- `POST /api/log`: 保存对话日志以及 AI 分析出的结构化数据（服药情况、情绪、身体症状等）。（说明：出于架构限制，对 Gemini 的 API 调用位于前端浏览器中发起，并将结果日志保存回此接口）。
- `GET /api/dashboard`: 获取子女端需要的最新的聊天和日志统计。
- `GET /api/meds` 与 `GET /api/dashboard/meds`: 获取老人今日的安排的服药计划以及服药执行状态。
- `POST /api/meds/take`: 记录老人某一计划药物的具体服药时间戳。
