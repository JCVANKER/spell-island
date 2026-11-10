# 咒语岛 Vibe Deploy

单个 Node.js 22+ 服务；`npm start` 启动，读取 `PORT`（默认 5000），监听 `0.0.0.0`。
健康检查 `/api/health`；网站 `/`；语音 WebSocket `/ws/asr`，入口代理须支持 Upgrade 和长连接。
服务直接提供游戏资源，不依赖公司内部 CDN。麦克风需要 HTTPS。

发布包通过 `node tools/build-vibe.mjs` 在源项目生成，包含已构建的网页、后端和依赖、内容数据。
无需安装依赖或在云端构建；不包含桌面/安卓壳、本地 `.env` 或其他密钥。
自动更新仅用于安装包，云端运行时关闭。

## 服务端环境变量

| 名称 | 值/配置方式 |
| --- | --- |
| NODE_ENV | production |
| PORT | 5000 |
| HOST | 0.0.0.0 |
| LLM_PROVIDER | doubao |
| ARK_MODEL | doubao-seed-2-1-pro-260915 |
| ARK_BASE_URL | https://ark.cn-beijing.volces.com/api/v3 |
| ARK_API_KEY | Secret，使用方舟 Key |
| DOUBAO_SPEECH_API_KEY | Secret，使用豆包语音 Key |
| DOUBAO_ASR_RESOURCE_ID | volc.seedasr.sauc.duration |
| DOUBAO_TTS_RESOURCE_ID | seed-tts-2.0 |
| BRAIN_MODE | hybrid |
| LLM_TIMEOUT_MS | 2500 |

Secret 必须使用平台 KMS 配置，不放入 ZIP 或普通变量。
若方舟 Key 限制出口 IP，需将云端实际出口加入白名单；本机出口不代表云端出口。
容器须能够访问 `ark.cn-beijing.volces.com:443` 和 `openspeech.bytedance.com:443`。

## 存储与访问

语音缓存写入临时目录，可丢弃，不申请 PVC。进度保存在玩家浏览器，不跨设备同步。
公网试玩需要平台审批公网访问权限；公司内网链接不能作为公众试玩链接交付。
API 调用消耗账号额度，当前无玩家账号或统一跨实例额度控制，适用于受控的小范围试玩。

## 验证

启动独立部署包后，核对 `/api/health`、首页、JS/CSS、模型 manifest 和 WebSocket 握手。
健康接口的 asr/tts/llm 字段只代表已加载配置，不代表实际语音或大模型调用成功。

## 2026-11-10 申请记录

- 应用名与子域名前缀：`spell-island`；新应用申请 ID：`181`。
- ZIP 已上传，216404135 字节，SHA256：`1b82bd79c351cad7debcdbb56f90af7fbde6380fa3ce235bcc468752e6b2c0a8`。
- 已按用户确认加入主入口 PV/UV 统计，未发现 `.codemao.cn` 业务直连接口。
- 独立部署包 HTTP 页面、JS/CSS、模型 manifest 和 WebSocket 握手检查通过；密钥扫描零命中。
- 申请已审核创建，正式应用 ID 为 `160`。目前尚无已部署版本；已保存配置修订号 `1`，含 10 个普通变量和 2 个 Secret 引用；最近查询 `external_access_enabled=false`。
- 用户已确认变量预览与配置风险，已保存并回读；`requires_redeploy=true`。两个 Secret 的 `configured=true` 仅表示引用已创建，`kms_ready=false`，尚不能部署。
- ACK Secret 只提交变量名和 `is_secret=true`，不提交明文值；平台生成 KMS 引用后由管理员填充两类 Key。

KMS 预览要求（2026-11-10）：`vibe-coding/spell-island/ark-api-key` 和 `vibe-coding/spell-island/doubao-speech-api-key`，版本 `ACSCurrent`。平台返回 `kms_setup_required=true`，确认就绪前禁止部署。

后续核查：两个 KMS Secret 均已 `kms_ready=true`，配置修订号仍为 1，尚无部署版本。首次发布无回滚版本，平台公网开关最近仍为 false。部署前需确认验证性部署范围及兼容性风险。

首次部署已获用户确认；已创建上传会话 2600（幂等键 `spell-island-deploy-20261110-01`），上传中。预检：统计已完整接入，直连业务接口 0；当前指南 SHA256 `96032d6883745fb0a821f2df3aa9940506420c3bb466e7e2f22b886272859407`。

上传成功：任务 `2852`，版本 `2745`，初始状态 `queued`。继续查询该任务，勿重复上传。

首次任务 2852 / 版本2745 构建失败：平台要求根目录 package-lock.json。已修复打包器，同时补充 build.mjs 生产文件检查；新包 SHA256 `2d5e5efde5dc2a7adf9bc0b947ac04b7560e659001de068b821f0635357ed0e5`，上传会话 2601（幂等键 spell-island-deploy-20261110-02）。

第二次发布：任务 `2853`，版本 `2746`（prod_2），失败于平台构建缓存导出。npm ci、生产文件检查、npm prune、应用镜像构建及推送均成功；应用镜像 `spell-island:prod_2` digest `sha256:19550fe3f5bef6e14c235f432d8770a584316dde7a55381bcb3f960ed60a8293`。BuildKit 向 `vibe-coding-internal/cache/spell-island:buildkit` 导出缓存时返回 `404 Not Found / unknown: blob upload invalid`，容器尚未 rollout。需运维修复缓存仓库/上传或在平台侧使缓存导出失败不阻断发布。不要为该平台故障修改应用变量或密钥。

线上验收（运维修复后）：当前运行 prod_3，版本 ID 2749，配置修订1已生效，两个 KMS 均就绪。HTTPS首页、健康接口、模型manifest均正常；线上 JS/CSS SHA256与本地包一致；WSS /ws/asr 握手通过。验收记录 deployment/artifacts/online-verification.json。当前平台 external_access_enabled=false，仅确认当前网络可访问，尚未验证公众外网和真实麦克风/上游模型调用。
