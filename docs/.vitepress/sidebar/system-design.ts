import type { DefaultTheme } from 'vitepress'

export const sidebarSystemDesign: DefaultTheme.SidebarItem[] = [
  {
    text: '系统设计',
    collapsed: false,
    items: [
      { text: '概览', link: '/system-design/' },
      { text: '项目理解', link: '/system-design/understanding' },
      { text: '系统架构设计', link: '/system-design/architecture' },
    ],
  },
]
