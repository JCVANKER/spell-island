import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '../../..');
loadEnv({ path: process.env.LUMI_ENV_FILE || path.join(ROOT, '.env') });

export const CONFIG = {
  port: Number(process.env.PORT || 8787),
  host: process.env.HOST || '0.0.0.0',
  speechKey: process.env.DOUBAO_SPEECH_API_KEY || '',
  asrResource: process.env.DOUBAO_ASR_RESOURCE_ID || 'volc.seedasr.sauc.duration',
  asrUrl: process.env.DOUBAO_ASR_URL || 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async',
  ttsResource: process.env.DOUBAO_TTS_RESOURCE_ID || 'seed-tts-2.0',
  ttsUrl: process.env.DOUBAO_TTS_URL || 'https://openspeech.bytedance.com/api/v3/tts/unidirectional',
  llmProvider: (process.env.LLM_PROVIDER || 'auto').toLowerCase(),
  deepseekKey: process.env.DEEPSEEK_API_KEY || '',
  deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  deepseekBase: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  arkKey: process.env.ARK_API_KEY || '',
  arkModel: process.env.ARK_MODEL || '',
  arkBase: process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
  brainMode: (process.env.BRAIN_MODE || 'hybrid').toLowerCase() as 'hybrid' | 'llm' | 'rules',
  llmTimeoutMs: Number(process.env.LLM_TIMEOUT_MS || 2500),
  ttsCacheDir: process.env.LUMI_CACHE_DIR || path.join(ROOT, 'apps/server/.cache/tts'),
  pregenDir: process.env.LUMI_PREGEN_DIR || path.join(ROOT, 'apps/web/public/voice'),
  webDist: process.env.LUMI_WEB_DIST || path.join(ROOT, 'apps/web/dist'),
  contentDir: path.join(ROOT, 'content'),
};

fs.mkdirSync(CONFIG.ttsCacheDir, { recursive: true });
