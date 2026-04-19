export interface Token {
  surface: string;
  baseForm: string;
  partOfSpeech: string;
  reading?: string;
}

export function simpleTokenize(text: string): Token[] {
  const words = text.match(/[\p{L}\p{N}]+/gu) || [];
  return words
    .filter(w => w.length > 1)
    .map(word => ({
      surface: word,
      baseForm: word,
      partOfSpeech: 'unknown',
      reading: undefined,
    }));
}
