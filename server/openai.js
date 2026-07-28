import { ApiError } from './http.js';
import { consumeAiUsage, refundAiUsage } from './supabase.js';

const TOOL_INSTRUCTIONS = {
  workoutGenerator: 'You are a careful fitness coach inside the Shadow Ascent fantasy RPG app. Provide practical text only, no markdown tables, no medical diagnosis. Respect every limitation supplied by the user.',
  mealPlanner: 'You are a practical nutrition planner inside the Shadow Ascent fantasy RPG app. Provide general educational meal planning only, not medical advice. Respect allergies and exclusions.',
  mealScanner: 'You are a careful nutrition image assistant inside Shadow Ascent. Provide estimates and clearly state uncertainty. Do not claim medical certainty.',
};

function extractResponseText(data) {
  if (typeof data?.output_text === 'string') {
    return data?.output_text;
  }

  const output = Array.isArray(data?.output) ? data?.output : [];
  const parts = output
    ?.flatMap((item) => (Array.isArray(item?.content) ? item?.content : []))
    ?.map((content) => content?.text || content?.value || '')
    ?.filter(Boolean);

  return parts?.join('\n\n') || '';
}

function isOwner(user) {
  const configuredOwner = String(process?.env?.OWNER_EMAIL || process?.env?.VITE_OWNER_EMAIL || '').trim().toLowerCase();
  return Boolean(configuredOwner && user?.email?.trim()?.toLowerCase() === configuredOwner);
}

export async function generateWithOpenAI({ user, feature, prompt, imageDataUrl = '' }) {
  const apiKey = String(process?.env?.OPENAI_API_KEY || '');
  const model = String(process?.env?.OPENAI_MODEL || 'gpt-5.5');
  const instructions = TOOL_INSTRUCTIONS?.[feature];
  const validImage = !imageDataUrl || /^data:image\/(png|jpe?g|webp);base64,/i.test(imageDataUrl);

  if (!apiKey) {
    throw new ApiError(503, 'ai_not_configured');
  }

  if (!instructions || !prompt || prompt?.length > 24_000 || imageDataUrl?.length > 3_500_000 || !validImage) {
    throw new ApiError(400, 'invalid_ai_request');
  }

  const owner = isOwner(user);
  const usage = owner
    ? { allowed: true, used: 0, limit: null, remaining: null, planId: 'owner' }
    : await consumeAiUsage(user?.id, feature);

  if (!usage?.allowed) {
    throw new ApiError(429, 'usage_limit_reached');
  }

  const content = [{ type: 'input_text', text: prompt }];

  if (imageDataUrl) {
    content?.push({ type: 'input_image', image_url: imageDataUrl });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller?.abort?.(), 60_000);

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        instructions,
        input: [{ role: 'user', content }],
        max_output_tokens: 5000,
        store: false,
      }),
      signal: controller?.signal,
    });

    if (!response?.ok) {
      if (!owner) {
        await refundAiUsage(user?.id, feature);
      }
      throw new ApiError(502, 'ai_request_failed');
    }

    const data = await response?.json?.();
    const text = extractResponseText(data || {})?.trim();

    if (!text) {
      if (!owner) {
        await refundAiUsage(user?.id, feature);
      }
      throw new ApiError(502, 'ai_empty_response');
    }

    return { text, usage };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (!owner) {
      await refundAiUsage(user?.id, feature);
    }
    throw new ApiError(502, 'ai_unavailable');
  } finally {
    clearTimeout(timeoutId);
  }
}
