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

  it('configures offline vector icons and Chinese labels for every main tab', () => {
    const navigatorSource = readFileSync(resolve(projectRoot, 'src/navigation/RootNavigator.tsx'), 'utf8')

    expect(navigatorSource).toContain("import Ionicons from '@expo/vector-icons/Ionicons'")
    expect(navigatorSource).toContain("Home: 'home-outline'")
    expect(navigatorSource).toContain("Catalog: 'library-outline'")
    expect(navigatorSource).toContain("Loans: 'swap-horizontal-outline'")
    expect(navigatorSource).toContain("Profile: 'person-outline'")
    expect(navigatorSource).toContain("title: '首页'")
    expect(navigatorSource).toContain("title: '藏书'")
    expect(navigatorSource).toContain("title: '借阅'")
    expect(navigatorSource).toContain("title: '我的'")
    expect(navigatorSource).toContain('tabBarItemStyle: { flex: 1 }')
    expect(navigatorSource).toContain('height: 56 + insets.bottom')
  })
})
