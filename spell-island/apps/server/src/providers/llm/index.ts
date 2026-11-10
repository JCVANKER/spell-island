// Pluggable LLM providers. Both DeepSeek and Doubao (Volcengine Ark) speak the OpenAI chat API.
import { CONFIG } from '../../config';

export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

export interface LlmProvider {
  name: string;
  chatJson(messages: ChatMessage[], opts?: { timeoutMs?: number; maxTokens?: number }): Promise<any>;
}

class OpenAICompatible implements LlmProvider {
  constructor(public name: string, private base: string, private key: string, private model: string) {}

  async chatJson(messages: ChatMessage[], opts: { timeoutMs?: number; maxTokens?: number } = {}): Promise<any> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? CONFIG.llmTimeoutMs);
    try {
      const res = await fetch(`${this.base.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.key}` },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.6,
          max_tokens: opts.maxTokens ?? 350,
          response_format: { type: 'json_object' },
          stream: false,
          ...(this.name === 'doubao' ? { thinking: { type: 'disabled' } } : {}),
        }),
      });
      if (!res.ok) throw new Error(`${this.name} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const j: any = await res.json();
      const content = j?.choices?.[0]?.message?.content || '';
      const m = content.match(/\{[\s\S]*\}/);
      return JSON.parse(m ? m[0] : content);
    } finally {
      clearTimeout(timer);
    }
  }
}

export function getLlm(): LlmProvider | null {
  const p = CONFIG.llmProvider;
  if ((p === 'deepseek' || p === 'auto') && CONFIG.deepseekKey) return new OpenAICompatible('deepseek', CONFIG.deepseekBase, CONFIG.deepseekKey, CONFIG.deepseekModel);
  if ((p === 'doubao' || p === 'auto') && CONFIG.arkKey && CONFIG.arkModel) return new OpenAICompatible('doubao', CONFIG.arkBase, CONFIG.arkKey, CONFIG.arkModel);
  return null;
}
