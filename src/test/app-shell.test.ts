import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = process.cwd()

describe('native app shell', () => {
  it('keeps every screen below the top safe area', () => {
    const appSource = readFileSync(resolve(projectRoot, 'App.tsx'), 'utf8')

    expect(appSource).toContain('SafeAreaView')
    expect(appSource).toContain("edges={['top']}")
  })

  it('uses 云阁 as the installed app name', () => {
    const appConfig = JSON.parse(readFileSync(resolve(projectRoot, 'app.json'), 'utf8'))

    expect(appConfig.expo.name).toBe('云阁')
  })
})
