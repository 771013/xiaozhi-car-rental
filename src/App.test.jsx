// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { readFileSync } from 'node:fs'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

const styles = readFileSync('src/styles.css', 'utf8')

class IntersectionObserverStub {
  observe() {}
  disconnect() {}
}

describe('小支租车官网交互', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub)
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 0 })
  })

  it('车型介绍和小支比价保持静态展示，不提供卡片点击切换', () => {
    const { container } = render(<App />)

    expect(container.querySelectorAll('#cars button')).toHaveLength(0)
    expect(container.querySelectorAll('#compare button')).toHaveLength(0)
    expect(container.querySelector('#cars .car-card.featured')).toHaveTextContent('豪华型')
    expect(container.querySelector('#compare .compare-row.active')).toHaveTextContent('安心护航')
  })

  it('打开比价弹窗后可按 Escape 关闭并恢复按钮焦点', () => {
    render(<App />)
    const openButton = screen.getByRole('button', { name: /立即去比价/ })

    fireEvent.click(openButton)
    expect(screen.getByRole('dialog')).toBeVisible()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(openButton).toHaveFocus()
  })

  it('页头仅保留小支租车文字品牌标识，不显示方形汽车图标', () => {
    const { container } = render(<App />)
    const brandImage = container.querySelector('.site-header .brand-logo')

    expect(brandImage).toHaveAttribute('src', '/assets/header-logo.svg')
    expect(container.querySelector('.site-header .brand-app-icon')).not.toBeInTheDocument()
  })

  it('首屏使用小支官网4的新主视觉和无箭头胶囊按钮', () => {
    const { container } = render(<App />)
    const primaryButton = screen.getByRole('button', { name: '立即去比价' })
    const secondaryButton = screen.getByRole('button', { name: '了解知心租' })

    expect(container.querySelector('.hero-visual')).toHaveAttribute('src', '/assets/hero-visual-figma4.png')
    expect(primaryButton.querySelector('img')).not.toBeInTheDocument()
    expect(secondaryButton.querySelector('img')).not.toBeInTheDocument()
    expect(styles).toMatch(/\.button\{[^}]*width:160px[^}]*height:50px[^}]*border-radius:25px/)
    expect(styles).toMatch(/\.button\.primary:hover,[^}]*\.button\.primary:focus-visible\{[^}]*color:#fff[^}]*background:#0056d6/)
  })

  it('首页左侧文案四处纵向间距各增加 10px', () => {
    expect(styles).toMatch(/\.hero h1\{[^}]*margin:17px 0 0/)
    expect(styles).toMatch(/\.hero h2\{[^}]*margin:7px 0 23px/)
    expect(styles).toMatch(/\.hero-actions\{[^}]*margin-top:42px/)
  })

  it('首页副标题使用青色打字轮播并保留三句完整文案', () => {
    const { container } = render(<App />)
    const heading = container.querySelector('.hero-rotating-line')

    expect(heading).toHaveTextContent('比出好价格，租车更省心')
    expect(heading).toHaveTextContent('比出好价格，选车更明白')
    expect(heading).toHaveTextContent('比出好价格，好车放心开')
    expect(styles).toMatch(/\.hero-rotating-line\{[^}]*color:#8cffff/i)
    expect(styles).toMatch(/\.hero-typewriter-caret\{[^}]*animation:hero-caret-blink \.5s/)
  })

  it('小支比价蓝色区域的地球装饰水平镜像', () => {
    const { container } = render(<App />)
    const decoration = container.querySelector('#compare .compare-decoration')

    expect(decoration).toHaveStyle({ transform: 'scaleX(-1)' })
  })

  it('导航在页面顶部透明，滚动超过阈值后切换背景状态', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 0 })
    const { container } = render(<App />)
    const header = container.querySelector('.site-header')

    expect(header).toHaveClass('at-top')

    window.scrollY = 30
    fireEvent.scroll(window)
    expect(header).toHaveClass('is-scrolled')
  })

  it('其他三个模块的副标题保持无逗号文案', () => {
    render(<App />)

    expect(screen.getByText('透明价格 比出超高性价比')).toBeInTheDocument()
    expect(screen.getByText('订取用还 全程保障')).toBeInTheDocument()
    expect(screen.getByText('多样车型选择 满足不同出行场景')).toBeInTheDocument()
  })

  it('观察器不可用时直接展示最终数据与内容', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const { container } = render(<App />)

    expect(container.querySelector('[data-count="50000"]')).toHaveTextContent('50000')
    expect(container.querySelector('[data-count="70000"]')).toHaveTextContent('70000')
    expect(container.querySelector('[data-count="800000"]')).toHaveTextContent('800000')
    expect(container.querySelector('[data-reveal]')).toHaveClass('is-visible')
  })

  it('系统减少动态效果时不等待观察器并直接展示最终数据', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
    const { container } = render(<App />)

    expect(container.querySelector('[data-count="50000"]')).toHaveTextContent('50000')
    expect(container.querySelector('[data-reveal]')).toHaveClass('is-visible')
  })

  it('十种车型按 Figma 分类循环展示，场景文案由连续焦点值控制显隐', () => {
    render(<App />)

    ;['舒适型', '经济型', 'SUV', '豪华型', '新能源', '跑车', '商务车', '房车', '小巴士', '皮卡']
      .forEach((title) => expect(screen.getByLabelText(title)).toBeInTheDocument())
    expect(document.querySelectorAll('#cars .car-card')).toHaveLength(10)
    expect(document.querySelectorAll('#cars .car-card .car-caption small')).toHaveLength(10)
    expect(styles).toMatch(/\.car-caption small\{[^}]*position:absolute[^}]*opacity:var\(--car-focus\)[^}]*transform:/)
    expect(styles).not.toMatch(/\.car-caption small\{[^}]*max-height:/)
    expect(styles).not.toMatch(/\.car-caption small\{[^}]*overflow:hidden/)
    expect(styles).toMatch(/\.car-card::after\{[^}]*opacity:var\(--car-outline\)[^}]*transition:opacity/)
  })

  it('车型轨道脱离版心容器并直接铺满舞台宽度', () => {
    const { container } = render(<App />)

    expect(container.querySelector('#cars .cars-stage > .car-rail')).toBeInTheDocument()
    expect(container.querySelector('#cars .cars-content .car-rail')).not.toBeInTheDocument()
    expect(styles).toMatch(/\.car-rail\{[^}]*z-index:1[^}]*top:calc\(var\(--cars-block-top\) \+ var\(--cars-rail-offset\)\)[^}]*right:0[^}]*bottom:auto[^}]*left:0/)
  })

  it('车型轨道被宽渐变遮罩覆盖，标题与小字保持在遮罩上方', () => {
    expect(styles).toMatch(/\.cars-stage::before,\.cars-stage::after\{[^}]*width:clamp\(180px,18vw,280px\)[^}]*z-index:2/)
    expect(styles).toMatch(/\.cars \.section-title\{[^}]*z-index:3/)
  })

  it('关于小支的介绍与业务规模作为整体垂直居中', () => {
    expect(styles).toMatch(/\.about-grid\{[^}]*grid-template-rows:auto auto[^}]*align-content:center/)
    expect(styles).toMatch(/\.about-copy\{[^}]*transform:none/)
    expect(styles).toMatch(/\.scale-heading\{[^}]*position:relative[^}]*top:0/)
    expect(styles).toMatch(/\.stats\{[^}]*transform:translateX\(-8px\)/)
  })

  it('联系我们为人物和左右交错文案提供独立揭示且人物入场后保持静止', () => {
    const { container } = render(<App />)

    expect(container.querySelector('#contact [data-contact-reveal="mascot"] .contact-mascot')).toBeInTheDocument()
    expect(container.querySelectorAll('#contact [data-contact-reveal="left"]')).toHaveLength(2)
    expect(container.querySelectorAll('#contact [data-contact-reveal="right"]')).toHaveLength(2)
    expect(styles).toMatch(/\[data-contact-reveal="mascot"\]\{[^}]*filter:none/)
    expect(styles).not.toMatch(/contactMascotFloat/)
    expect(styles).not.toMatch(/\.contact-mascot-wrap\.is-visible \.contact-mascot\{[^}]*animation:/)
  })

  it('整屏吸附下导航仍可直接抵达目标模块', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '联系我们' }))
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
  })

  it('桌面滚轮保持原生跟手滚动，不再拦截或设置时间去重', () => {
    vi.stubGlobal('matchMedia', vi.fn((query) => ({
      matches: query === '(min-width: 901px)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
    render(<App />)

    expect(fireEvent.wheel(window, { deltaY: 4 })).toBe(true)
    expect(fireEvent.wheel(window, { deltaY: -4 })).toBe(true)
  })

  it('小支比价和联系我们白色板块顶部不保留圆角', () => {
    expect(styles).toMatch(/\.compare\{[^}]*border-radius:0/)
    expect(styles).toMatch(/\.contact\{[^}]*border-radius:0/)
  })

  it('比价高亮默认位于安心护航并跟随鼠标悬停切换', () => {
    const { container } = render(<App />)
    const list = container.querySelector('#compare .compare-list')
    const rows = [...container.querySelectorAll('#compare .compare-row')]
    const highlight = container.querySelector('#compare .compare-highlight')

    expect(rows[1]).toHaveClass('active')
    expect(highlight.style.getPropertyValue('--active-index')).toBe('1')

    fireEvent.mouseEnter(rows[0])
    expect(rows[0]).toHaveClass('active')
    expect(highlight.style.getPropertyValue('--active-index')).toBe('0')

    fireEvent.mouseLeave(list)
    expect(rows[0]).toHaveClass('active')
    expect(highlight.style.getPropertyValue('--active-index')).toBe('0')
  })

  it('比价项目不再提供可聚焦的切换状态', () => {
    const { container } = render(<App />)
    const rows = [...container.querySelectorAll('#compare .compare-row')]

    expect(rows.every((row) => !row.hasAttribute('tabindex'))).toBe(true)
    expect(rows[1]).toHaveClass('active')
  })

  it('首页文字静态展示，其他区块内容按段落和卡片渐进揭示', () => {
    const { container } = render(<App />)

    expect(container.querySelector('.hero-copy')).not.toHaveAttribute('data-reveal')
    expect(container.querySelectorAll('#about .about-copy > [data-reveal]')).toHaveLength(2)
    expect(container.querySelectorAll('#cars .section-title > [data-reveal]')).toHaveLength(2)
    expect(container.querySelectorAll('#compare .compare-row[data-reveal]')).toHaveLength(3)
    expect(container.querySelectorAll('#service .service-group[data-reveal]')).toHaveLength(3)
  })

  it('桌面端使用原生纵向强制吸附，滚动过程保持跟手', () => {
    const { container } = render(<App />)
    const contactSnap = container.querySelector('.contact-snap')

    expect(contactSnap?.querySelector('#contact')).toBeInTheDocument()
    expect(contactSnap?.querySelector('.footer')).toBeInTheDocument()
    expect(styles).toMatch(/@media\(min-width:901px\)\{[^}]*html\{[^}]*scroll-snap-type:y mandatory[^}]*scroll-padding-top:70px/)
    expect(styles).toMatch(/@media\(min-width:901px\)\{[\s\S]*?section\[id\]\{scroll-margin-top:0\}/)
    expect(styles).toMatch(/\.hero,\.about,\.cars,\.compare,\.service,\.contact-snap\{[^}]*scroll-snap-align:start[^}]*scroll-snap-stop:always/)
    expect(styles).toMatch(/\.contact-snap\{[^}]*height:calc\(100svh - 70px\)[^}]*scroll-margin-top:0/)
  })

  it('桌面导航与主要区块合计占满一屏，联系我们连同页脚刚好收束', () => {
    expect(styles).toMatch(/\.hero\{[^}]*height:100svh/)
    expect(styles).toMatch(/\.about\{[^}]*height:calc\(100svh - 70px\)/)
    expect(styles).toMatch(/\.cars\{[^}]*height:calc\(100svh - 70px\)/)
    expect(styles).toMatch(/\.compare\{[^}]*height:calc\(100svh - 70px\)/)
    expect(styles).toMatch(/\.service\{[^}]*height:calc\(100svh - 70px\)/)
    expect(styles).toMatch(/\.contact\{[^}]*height:calc\(100svh - 184px\)[^}]*max-height:calc\(100svh - 184px\)/)
    expect(styles).toMatch(/\.footer\{[^}]*height:114px/)
  })

  it('桌面模块不再被旧最小高度撑破单屏，矮屏会同步压缩关键内容间距', () => {
    expect(styles).toMatch(/@media\(min-width:901px\)\{[\s\S]*?\.hero,\.about,\.cars,\.compare,\.service\{min-height:0\}/)
    expect(styles).toMatch(/@media\(min-width:901px\)\{[\s\S]*?\.cars\{margin-bottom:0\}/)
    expect(styles).toMatch(/@media\(min-width:901px\)\{[\s\S]*?\.service\{margin-top:0\}/)
    expect(styles).toMatch(/@media\(min-width:901px\) and \(max-height:820px\)\{/)
    expect(styles).toMatch(/@media\(min-width:901px\) and \(max-height:820px\)\{[\s\S]*?\.about-grid\{[^}]*gap:32px[^}]*padding-block:28px/)
    expect(styles).toMatch(/@media\(min-width:901px\) and \(max-height:820px\)\{[\s\S]*?\.cars\{[^}]*--cars-block-height:561px[^}]*--cars-rail-offset:110px/)
    expect(styles).toMatch(/@media\(min-width:901px\) and \(max-height:820px\)\{[\s\S]*?\.compare\{--compare-row-height:150px/)
    expect(styles).toMatch(/@media\(min-width:901px\) and \(max-height:820px\)\{[\s\S]*?\.compare-inner\{[^}]*padding-block:28px/)
    expect(styles).toMatch(/@media\(min-width:901px\) and \(max-height:820px\)\{[\s\S]*?\.service-inner\{[^}]*gap:20px[^}]*padding-block:28px/)
    expect(styles).toMatch(/@media\(min-width:901px\) and \(max-height:560px\)\{[\s\S]*?\.service-inner\{[^}]*gap:8px[^}]*padding-block:8px/)
    expect(styles).toMatch(/@media\(min-width:901px\) and \(max-height:560px\)\{[\s\S]*?\.service-group,\.service-group-2\{height:238px/)
    expect(styles).toMatch(/@media\(min-width:1600px\) and \(min-height:900px\)\{[\s\S]*?\.hero-content\{[^}]*width:min\(1200px,calc\(100% - 48px\)\)/)
  })

  it('Retina 矮屏保持首屏主视觉下沉并让知心租三栏等高', () => {
    expect(styles).toMatch(/@media\(min-width:901px\) and \(max-height:820px\)\{[\s\S]*?\.hero-visual\{[^}]*top:50%[^}]*translate:0 calc\(-50% \+ clamp\(24px,5svh,40px\)\)/)
    expect(styles).toMatch(/@media\(min-width:901px\) and \(max-height:560px\)\{[\s\S]*?\.service\{z-index:4\}/)
    expect(styles).toMatch(/@media\(min-width:901px\) and \(max-height:560px\)\{[\s\S]*?\.service-inner\{[^}]*gap:8px[^}]*padding-block:8px/)
    expect(styles).toMatch(/@media\(min-width:901px\) and \(max-height:560px\)\{[\s\S]*?\.service-group,\.service-group-2\{height:238px/)
  })

  it('最大尺寸首屏沿用常规桌面文字和按钮尺寸', () => {
    const largeHeroRule = styles.match(/@media\(min-width:1600px\) and \(min-height:900px\)\{([\s\S]*?)\n\}/)?.[1] ?? ''

    expect(largeHeroRule).not.toMatch(/\.hero h1\{[^}]*font-size:/)
    expect(largeHeroRule).not.toMatch(/\.hero h2\{[^}]*font-size:/)
    expect(largeHeroRule).not.toMatch(/\.hero-copy>p\{[^}]*font-size:/)
    expect(largeHeroRule).not.toMatch(/\.hero \.button\{[^}]*font-size:/)
  })

  it('桌面端比价与知心租内容组在可用一屏内垂直居中', () => {
    expect(styles).toMatch(/@media\(min-width:901px\)\{[\s\S]*?\.compare-inner\{[^}]*height:100%[^}]*display:flex[^}]*flex-direction:column[^}]*justify-content:center/)
    expect(styles).toMatch(/@media\(min-width:901px\)\{[\s\S]*?\.service-inner\{[^}]*display:flex[^}]*flex-direction:column[^}]*justify-content:center/)
    expect(styles).toMatch(/@media\(min-width:901px\)\{[\s\S]*?\.service-groups\{[^}]*position:relative[^}]*inset:auto/)
  })

  it('联系我们恢复上一版宽度并按人物外扩高度垂直居中', () => {
    expect(styles).toMatch(/\.contact\{[^}]*display:flex[^}]*align-items:center[^}]*padding-top:114px/)
    expect(styles).toMatch(/\.contact-inner\{[^}]*width:min\(1200px,calc\(100% - 48px\)\)/)
  })

  it('知心租背景保持封面比例，移动端车型使用横向吸附且减少动态效果可降级', () => {
    expect(styles).toMatch(/\.service\{[^}]*background-size:cover/)
    expect(styles).toMatch(/scroll-snap-type:x mandatory/)
    expect(styles).toMatch(/@media\(prefers-reduced-motion:reduce\)/)
  })

  it('文字保留透明度与位移动效但不再使用模糊渐显', () => {
    expect(styles).not.toMatch(/\[data-reveal="title"\]\{[^}]*clip-path:inset\(0 0 100% 0\)/)
    expect(styles).toMatch(/\[data-reveal\]\{[^}]*opacity:0[^}]*filter:none[^}]*transition:opacity/)
    expect(styles).not.toMatch(/\[data-reveal\]\{[^}]*filter:blur\(/)
    expect(styles).not.toMatch(/\[data-contact-reveal\]\{[^}]*filter:blur\(/)
    expect(styles).not.toMatch(/\[data-contact-reveal="mascot"\]\{[^}]*filter:blur\(/)
    expect(styles).toMatch(/\[data-contact-reveal\]\{[^}]*opacity:0[^}]*filter:none[^}]*transition:opacity/)
  })

  it('指定模块的文字与内容入场时长增加 50%，数字计数与汽车卡片节奏不变', () => {
    expect(styles).toMatch(/#about \[data-reveal\],#cars \.section-title \[data-reveal\],#compare \[data-reveal\],#service \[data-reveal\]\{transition-duration:1\.725s,2\.025s\}/)
    expect(styles).not.toMatch(/#cars \.car-card[^\{]*\{[^}]*transition-duration:1\.725s/)
  })
})
