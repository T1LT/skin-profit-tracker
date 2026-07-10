import type { SkinProfitAPI } from '../../electron/preload'

declare global {
  interface Window {
    api: SkinProfitAPI
  }
}

export {}
