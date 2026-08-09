export interface ImageAnalysisPayload {
  imageName: string;
  mimeType: string;
  base64Data: string;
}

export function prepareImagePayload(file: File): Promise<ImageAnalysisPayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const mimeType = file.type || 'image/png';
      const base64Data = dataUrl.split(',')[1] || '';
      resolve({
        imageName: file.name,
        mimeType,
        base64Data,
      });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function formatVisionPrompt(imagePayload: ImageAnalysisPayload, userInstruction?: string): string {
  const instruction = userInstruction || 'Analyze this image in detail. Perform OCR to extract all visible text, identify any error codes or stack traces, and summarize key elements.';
  return `🖼️ **[Attached Image: ${imagePayload.imageName}]**\nInstruction: ${instruction}\n\n[Base64 Image Payload Encoded for Vision Model: ${imagePayload.base64Data.slice(0, 40)}...]`;
}
