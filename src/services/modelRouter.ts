import type { AIModel } from '../types';

export type TaskCategory = 'simple_qa' | 'complex_reasoning' | 'coding' | 'vision' | 'long_context' | 'data_analysis';

export interface ModelRoutingDecision {
  category: TaskCategory;
  recommendedModelId: string;
  reason: string;
}

export function classifyPromptTask(prompt: string, hasImages = false, hasFiles = false): TaskCategory {
  if (hasImages || /\b(image|screenshot|diagram|photo|ocr|chart)\b/i.test(prompt)) {
    return 'vision';
  }
  if (hasFiles || prompt.length > 5000) {
    return 'long_context';
  }
  if (/\b(csv|xlsx|excel|dataframe|statistics|pivot|chart|dataset)\b/i.test(prompt)) {
    return 'data_analysis';
  }
  if (/\b(code|function|bug|refactor|typescript|python|rust|css|html|react|sql|api|error|stacktrace)\b/i.test(prompt)) {
    return 'coding';
  }
  if (/\b(why|explain|compare|synthesize|analyze|proof|calculate|reason|logic|architecture)\b/i.test(prompt) || prompt.length > 300) {
    return 'complex_reasoning';
  }
  return 'simple_qa';
}

export function routeModelForTask(
  prompt: string,
  availableModels: AIModel[],
  userDefaultModel: string,
  hasImages = false,
  hasFiles = false
): ModelRoutingDecision {
  const category = classifyPromptTask(prompt, hasImages, hasFiles);

  // Vision model matching
  if (category === 'vision') {
    const visionModel = availableModels.find(m => m.id.includes('vision') || m.id.includes('llava') || m.provider === 'gemini');
    if (visionModel) {
      return { category, recommendedModelId: visionModel.id, reason: 'Selected vision-capable model for image analysis' };
    }
  }

  // Coding model matching
  if (category === 'coding') {
    const codingModel = availableModels.find(m => m.id.includes('coder') || m.id.includes('codellama') || m.id.includes('claude'));
    if (codingModel) {
      return { category, recommendedModelId: codingModel.id, reason: 'Selected specialized coding model for software tasks' };
    }
  }

  // Fallback to default model
  return {
    category,
    recommendedModelId: userDefaultModel || availableModels[0]?.id || 'llama3.2',
    reason: `Selected default model for ${category.replace('_', ' ')}`,
  };
}
