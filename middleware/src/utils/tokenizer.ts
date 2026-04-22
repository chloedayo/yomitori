import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let tokenizer: any = null;
let TokenizerBuilder: any = null;
let NodeDictionaryLoader: any = null;

export async function initializeTokenizer() {
  if (tokenizer) return;

  try {
    const dicPath = process.env.KUROMOJI_DIC_PATH ?? join(__dirname, '../../node_modules/@patdx/kuromoji/dict');

    if (!TokenizerBuilder || !NodeDictionaryLoader) {
      // @ts-ignore
      const kuromoji = await import('@patdx/kuromoji');
      // @ts-ignore
      const nodeLoader = await import('@patdx/kuromoji/node');
      TokenizerBuilder = kuromoji.TokenizerBuilder;
      NodeDictionaryLoader = nodeLoader.default;
    }

    const loader = new NodeDictionaryLoader({ dic_path: dicPath });
    const builder = new TokenizerBuilder({ loader });
    tokenizer = await builder.build();
    console.log('✓ Kuromoji tokenizer initialized');
  } catch (err) {
    console.error('✗ Failed to initialize Kuromoji:', err);
    throw err;
  }
}

export function tokenizeText(text: string) {
  if (!tokenizer) {
    return fallbackTokenize(text);
  }

  try {
    const tokens = tokenizer.tokenize(text);
    return tokens
      .filter((token: any) => {
        return (token.pos === '名詞' || token.pos === '動詞' || token.pos === '形容詞') && token.surface_form.length > 1;
      })
      .map((token: any) => ({
        surface: token.surface_form,
        baseForm: token.basic_form || token.surface_form,
        partOfSpeech: token.pos,
        reading: token.reading_form,
      }));
  } catch (err) {
    console.error('Tokenization error:', err);
    return fallbackTokenize(text);
  }
}

function fallbackTokenize(text: string) {
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
