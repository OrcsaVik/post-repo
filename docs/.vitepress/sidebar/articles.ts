import type { DefaultTheme } from 'vitepress'

export const sidebarArticles: Record<string, DefaultTheme.SidebarItem[]> = {
  java: [
    {
      text: 'Java 专栏',
      collapsed: false,
      items: [
        { text: '概览', link: '/docs/articles/java/' },
        { text: 'JVM', link: '/articles/java/jvm' },
        { text: '并发', link: '/articles/java/concurrency' },
        { text: 'Spring', link: '/articles/java/spring' },
      ],
    },
  ],

  python: [
    {
      text: 'Python 专栏',
      collapsed: false,
      items: [
        { text: '概览', link: '/articles/python/' },
        { text: '基础', link: '/articles/python/basics' },
      ],
    },
  ],

  llm: [
    {
      text: 'LLM 专栏',
      collapsed: false,
      items: [
        { text: '概览', link: '/articles/llm/' },
        { text: 'Prompt 工程', link: '/articles/llm/prompt' },
      ],
    },
  ],
}
