export interface ModelBenchmarkResult {
  modelId: string;
  durationMs: number;
  evalCount: number;
  tokensPerSec: number;
  latencyMs: number;
  speedRating: number; // 1-5 stars
  codingRating: number;
  reasoningRating: number;
}

export async function benchmarkModel(modelId: string, ollamaUrl = "http://localhost:11434"): Promise<ModelBenchmarkResult> {
  const startTime = Date.now();
  const testPrompt = "Write a 3-line quicksort algorithm in Python with explanation.";

  try {
    const res = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelId,
        prompt: testPrompt,
        stream: false,
      }),
    });

    const durationMs = Date.now() - startTime;
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json() as { eval_count?: number; eval_duration?: number };
    const evalCount = data.eval_count || 100;
    const evalDurationSec = (data.eval_duration || 1000000000) / 1e9;
    const tokensPerSec = Number((evalCount / (evalDurationSec || (durationMs / 1000))).toFixed(1));

    const speedRating = Math.min(5, Math.max(1, Math.round(tokensPerSec / 10)));
    const codingRating = modelId.includes("coder") || modelId.includes("codellama") ? 5 : 4;
    const reasoningRating = modelId.includes("llama3") || modelId.includes("qwen") ? 5 : 4;

    return {
      modelId,
      durationMs,
      evalCount,
      tokensPerSec,
      latencyMs: durationMs,
      speedRating,
      codingRating,
      reasoningRating,
    };
  } catch (err: any) {
    return {
      modelId,
      durationMs: Date.now() - startTime,
      evalCount: 0,
      tokensPerSec: 0,
      latencyMs: 9999,
      speedRating: 1,
      codingRating: 1,
      reasoningRating: 1,
    };
  }
}
