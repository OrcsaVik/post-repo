import DefaultTheme from 'vitepress/theme'

import './styles/index.css'
import { watch } from 'vue'
let homePageStyle: HTMLStyleElement | undefined
import Mycomponent from "./components/Mycomponent.vue"
import ArticleMetadata from "./components/ArticleMetadata.vue"
import './styles/code.css'
import './styles/icons.css'
export default {

  extends: DefaultTheme,
  Layout: Mycomponent,
  enhanceApp({ app, router }) {
    // 彩虹背景动画样式
    // Client-side only: watch route changes
    if (typeof window !== 'undefined') {
      watch(
        () => router.route.path,                    // ← use router.route.path (more reliable)
        (currentPath) => {
          const isHomePage =
            currentPath === '/' ||
            currentPath === '/index.html' ||
            currentPath.endsWith('/index.html') ||
            currentPath.endsWith('/index')

          updateHomePageStyle(isHomePage)
        },
        { immediate: true }
      )
    }
    app.component('Mycomponent', Mycomponent)
    app.component('ArticleMetadata', ArticleMetadata)

  }


}


// 彩虹背景动画样式
function updateHomePageStyle(value: boolean) {
  if (value) {
    if (homePageStyle) return

    homePageStyle = document.createElement('style')
    homePageStyle.innerHTML = `
    :root {

    animation: rainbow 15s linear infinite;
    }`
    document.body.appendChild(homePageStyle)
  } else {
    if (!homePageStyle) return

    homePageStyle.remove()
    homePageStyle = undefined
  }
}