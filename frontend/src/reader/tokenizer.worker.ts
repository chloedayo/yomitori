import * as kuromoji from '@patdx/kuromoji'
import BrowserDictionaryLoader from '@patdx/kuromoji/browser'

let tokenizer: any = null
const CACHE_KEY = 'yomitori-kuromoji-dict'
const CACHE_VERSION = '1'

class CachingDictionaryLoader {
  private basePath: string
  private cache: Map<string, ArrayBuffer> = new Map()

  constructor(basePath: string) {
    this.basePath = basePath
  }

  async load(file: string, callback: (data: ArrayBuffer) => void) {
    const cachedData = await this.getFromCache(file)
    if (cachedData) {
      callback(cachedData)
      return
    }

    const url = `${this.basePath}${file}`
    try {
      const response = await fetch(url)
      const data = await response.arrayBuffer()
      await this.saveToCache(file, data)
      callback(data)
    } catch (err) {
      throw new Error(`Failed to load dictionary file ${file}: ${err}`)
    }
  }

  private async getFromCache(file: string): Promise<ArrayBuffer | null> {
    try {
      const stored = localStorage.getItem(`${CACHE_KEY}-${CACHE_VERSION}-${file}`)
      if (stored) {
        const binary = atob(stored)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i)
        }
        return bytes.buffer
      }
    } catch (err) {
      console.warn('Failed to load from localStorage:', err)
    }
    return null
  }

  private async saveToCache(file: string, data: ArrayBuffer): Promise<void> {
    try {
      const binary = String.fromCharCode.apply(null, Array.from(new Uint8Array(data)) as any)
      const encoded = btoa(binary)
      localStorage.setItem(`${CACHE_KEY}-${CACHE_VERSION}-${file}`, encoded)
    } catch (err) {
      console.warn('Failed to save to localStorage:', err)
    }
  }
}

async function initTokenizer() {
  if (tokenizer) return

  try {
    const loader = new CachingDictionaryLoader('https://cdn.jsdelivr.net/npm/@aiktb/kuromoji@1.0.2/dict/')
    const builder = new (kuromoji as any).TokenizerBuilder({
      loader: loader as any
    })
    tokenizer = await builder.build()
  } catch (err) {
    throw new Error(`Failed to initialize tokenizer: ${err}`)
  }
}

interface TokenizeMessage {
  type: 'tokenize'
  text: string
}

interface InitMessage {
  type: 'init'
}

type WorkerMessage = TokenizeMessage | InitMessage

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  try {
    if (event.data.type === 'init') {
      await initTokenizer()
      self.postMessage({ type: 'init-success' })
    } else if (event.data.type === 'tokenize') {
      if (!tokenizer) await initTokenizer()
      const tokens = tokenizer.tokenize(event.data.text)
      self.postMessage({ type: 'tokenize-success', tokens })
    }
  } catch (err) {
    self.postMessage({ type: 'error', error: String(err) })
  }
}
