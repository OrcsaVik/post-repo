import type { DefaultTheme } from 'vitepress'

export const sidebarOpenSource: DefaultTheme.SidebarItem[] = [
  {
    text: '开源项目',
    collapsed: false,
    items: [
      { text: '概览', link: '/open-source/' },
      { text: '开源社区', link: '/open-source/community' },
      { text: '个人开源项目', link: '/open-source/personal' },
    ],
  },
]
