import * as kuromoji from '@patdx/kuromoji'

let tokenizer: any = null

class DictionaryLoader {
  private basePath: string

  constructor(basePath: string) {
    this.basePath = basePath
  }

  loadArrayBuffer(path: string, callback: (data: ArrayBuffer | null) => void) {
    const url = `${this.basePath}${path}`
    fetch(url)
      .then(response => response.arrayBuffer())
      .then(callback)
      .catch((err) => {
        console.error(`Failed to load ${path}:`, err)
        callback(null)
      })
  }
}

async function initTokenizer() {
  if (tokenizer) return

  try {
    const loader = new DictionaryLoader('https://cdn.jsdelivr.net/npm/@aiktb/kuromoji@1.0.2/dict/')
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
