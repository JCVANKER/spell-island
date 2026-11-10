// Child-safety filter for anything an LLM says to a child.
import { isUnsafe, asksPersonalInfo } from './text';

const PERSONAL_QUESTIONS = /\b(what('?s| is) your (full name|address|school|phone|number|age)|where do you live|which school|how old are you|send (me )?(a )?(photo|picture)|your (mom|dad)'?s (name|phone))\b/i;
const OFF_LIMITS = /\b(weapon|knife|gun|kill|blood|die|death|scary monster|drug|alcohol|beer|wine|cigarette|sexy|kiss|boyfriend|girlfriend|buy now|download|website|link|http)\b/i;

export function safeForChild(line: string): boolean {
  if (!line) return false;
  if (isUnsafe(line)) return false;
  if (asksPersonalInfo(line) || PERSONAL_QUESTIONS.test(line)) return false;
  if (OFF_LIMITS.test(line)) return false;
  return true;
}

export function childSaidSomethingUnsafe(text: string): boolean {
  return isUnsafe(text);
}
