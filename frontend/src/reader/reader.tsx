import React from 'react'
import ReactDOM from 'react-dom/client'
import { ReaderPage } from './ReaderPage'
import version from '../../version.json'

const BUILD_VERSION = `${version.major}.${version.minor}.${version.patch}`
console.log(`🎯 Yomitori Reader v${BUILD_VERSION} loaded`)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ReaderPage />
  </React.StrictMode>
)
