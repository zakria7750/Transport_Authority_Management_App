import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { APP_FULL_BRAND } from './constants'

document.title = APP_FULL_BRAND

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
