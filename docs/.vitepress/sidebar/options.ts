import { GenerateSidebarOption } from 'vitepress-sidebar';

// 1. Common settings shared by all sidebars (Formatting, folding, etc.)
const commonOptions = {
  documentRootPath: 'docs', // Important: Tells the plugin where your physical files are
  collapsed: true,
  collapseDepth: 2,
  hyphenToSpace: true,
  underscoreToSpace: true,
  capitalizeFirst: true,
  useTitleFromFrontmatter: true,
  useFolderTitleFromIndexFile: true,
  useFolderLinkFromIndexFile: true,
  // Sort by 'order: number' in frontmatter
  sortMenusByFrontmatterOrder: true,
};

// 2. Define distinct sections
// We export an ARRAY of options. The plugin will merge them.
export const sidebarOptions: GenerateSidebarOption[] = [
  // === Articles: Java ===
  {
    ...commonOptions,
    scanStartPath: 'articles/java', // Folder to scan
    resolvePath: '/articles/java/', // Only show this sidebar on these URLs
    rootGroupText: 'Java 专栏',    // Optional: Label for the top group
  },
  // === Articles: Python ===
  {
    ...commonOptions,
    scanStartPath: 'articles/python',
    resolvePath: '/articles/python/',
    rootGroupText: 'Python 专栏',
  },
  // === Articles: LLM ===
  {
    ...commonOptions,
    scanStartPath: 'articles/llm',
    resolvePath: '/articles/llm/',
    rootGroupText: 'LLM 专栏',
  },
  // === System Design ===
  {
    ...commonOptions,
    scanStartPath: 'system-design',
    resolvePath: '/system-design/',
    rootGroupText: '系统设计',
  },
  // === Open Source ===
  {
    ...commonOptions,
    scanStartPath: 'open-source',
    resolvePath: '/open-source/',
    rootGroupText: '开源项目',
  },
  // === Articles: Algo ===
  {
    ...commonOptions,
    scanStartPath: 'articles/algo',
    resolvePath: '/articles/algo/',
    rootGroupText: '算法专栏',
  },
];