import { defineConfig } from 'vitepress'
// import { sidebarDatabase } from './theme/sidebar/database'
import { sidebarSystemDesign } from './sidebar/system-design'
import { sidebarOpenSource } from './sidebar/open-source'
import { sidebarArticles } from './sidebar/articles'
import { generateSidebar } from 'vitepress-sidebar'
import { sidebarOptions } from './sidebar/options'
export default defineConfig({
  // base: '/docs',   // ← change to '/your-repo-name/' only if deploying to GitHub Pages subdirectory
  lang: 'zh-CN',
  title: "OrcsaVik",
  appearance: 'dark', // Forced Dark Mode
  // srcDir: 'docs',

  head: [
    ['link', { rel: 'icon', href: '/572.png' }], // Note: Removed /public, assume 572.png is in docs/public/
  ],

  markdown: {
    config(md) {
      // 启用 Markdown 层插件
      // Your existing markdown config...
      const raw = md.renderer.rules.heading_close
      md.renderer.rules.heading_close = (tokens, idx, options, env, self) => {
        const result = raw
          ? raw(tokens, idx, options, env, self)
          : self.renderToken(tokens, idx, options)
        if (tokens[idx].tag === 'h1') {
          return result + '\n<ArticleMetadata />\n'
        }
        return result
      }
      // md.use(groupIconMdPlugin)
    }
  },

  // vite: {
  //   plugins: [groupIconVitePlugin()] // 启用 Vite 层插件
  // }
  // ,
  themeConfig: {
    logo: '/logo.png', // Ensure logo.png is in docs/public/logo.png
    darkModeSwitchLabel: '深浅模式',

    search: {
      provider: 'local',
      options: { detailedView: true }
    },

    outline: {
      level: [2, 3], // Changed to 2-3 to see subsections
      label: 'On this page'
    },

    // !!! FIX PATHS HERE !!!
    // Do not include '/docs/' in the link. 
    // '/' now equals your 'docs' folder.
    nav: [
      { text: '首页', link: '/' },
      {
        text: '文章专栏',
        items: [
          // Ensure these folders exist: docs/articles/java/index.md
          { text: 'Java', link: '/articles/java/' },
          { text: 'Python', link: '/articles/python/' },
          { text: 'LLM', link: '/articles/llm/' },
        ],
      },
      // Ensure folder exists: docs/system-design/index.md
      { text: '系统设计', link: '/system-design/' },
      // Ensure folder exists: docs/open-source/index.md
      { text: '开源项目', link: '/open-source/' },
      { text: '推荐阅读', link: '/books-love/' },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' },
      {
        icon: {
          svg: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.758v8.035c-.054 1.51-.578 2.769-1.574 3.773-.995 1.004-2.249 1.524-3.758 1.56H5.333c-1.51-.054-2.769-.578-3.773-1.574-1.004-.995-1.524-2.249-1.56-3.758V9.985c.054-1.51.578-2.769 1.574-3.773.995-1.004 2.249-1.524 3.758-1.56h.854l-2.043-2.315a.835.835 0 0 1 .08-1.166.848.848 0 0 1 1.168.083l2.457 2.783h7.904l2.457-2.783a.848.848 0 0 1 1.168-.083.836.836 0 0 1 .08 1.166l-2.043 2.315Zm-2.586 7.42a1.867 1.867 0 1 0 0 3.734 1.867 1.867 0 0 0 0-3.734Zm-6.454 0a1.867 1.867 0 1 0 0 3.734 1.867 1.867 0 0 0 0-3.734Z" fill="currentColor"/></svg>'
        },
        link: 'https://www.bilibili.com/'
      }
    ],

    sidebarMenuLabel: '目录',
    returnToTopLabel: '返回顶部',
    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'long',
        timeStyle: 'short'
      },
    },

    docFooter: {
      prev: '上一页',
      next: '下一页',
    },

    // IMPORTANT: Pass the imported options array to the generator
    sidebar: generateSidebar(sidebarOptions),
  }


})