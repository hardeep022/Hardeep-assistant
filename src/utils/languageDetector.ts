export interface DetectedLanguage {
  code: string;
  name: string;
  shortCode: string;
  isHinglish?: boolean;
}

export function detectLanguage(text: string): DetectedLanguage {
  if (!text || !text.trim()) {
    return { code: 'en-US', name: 'English', shortCode: 'en' };
  }

  const trimmed = text.trim();

  // Devanagari script (Hindi)
  if (/[\u0900-\u097F]/.test(trimmed)) {
    return { code: 'hi-IN', name: 'Hindi', shortCode: 'hi' };
  }

  // Gurmukhi script (Punjabi)
  if (/[\u0A00-\u0A7F]/.test(trimmed)) {
    return { code: 'pa-IN', name: 'Punjabi', shortCode: 'pa' };
  }

  // Hinglish detection (Latin script containing Hindi/Punjabi phonetics)
  const hinglishWords = /\b(mera|meri|mujhe|kya|hai|ho|raha|rahi|kar|karo|nahi|sakte|hum|apna|apne|bhai|kaise|kaun|kab|jago|sunno|batao|chahiye)\b/i;
  if (hinglishWords.test(trimmed)) {
    return { code: 'hi-IN', name: 'Hinglish (Hindi/English)', shortCode: 'hi', isHinglish: true };
  }

  return { code: 'en-US', name: 'English', shortCode: 'en' };
}
