import { assertTrustedOrigin, readJsonBody, requirePost, safeApiMessage, sendJson } from '../server/http.js';
import { generateWithOpenAI } from '../server/openai.js';
import { requireUser } from '../server/supabase.js';

export const config = {
  maxDuration: 60,
};

export default async function handler(request, response) {
  try {
    requirePost(request);
    assertTrustedOrigin(request);
    const { user } = await requireUser(request);
    const body = await readJsonBody(request, 64_000);
    const prompt = String(body?.prompt || '').trim();
    const result = await generateWithOpenAI({
      user,
      feature: 'workoutGenerator',
      prompt,
    });

    sendJson(response, 200, {
      text: result?.text || '',
      usage: result?.usage || null,
    });
  } catch (error) {
    sendJson(response, Number(error?.status || 500), {
      message: safeApiMessage(error, 'Workout generation is unavailable right now.'),
      code: error?.code || 'workout_generation_failed',
    });
  }
}
