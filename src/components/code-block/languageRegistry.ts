// Type for lowlight instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Lowlight = any;

export interface LanguageDefinition {
  name: string;
  module: string;
}

// Language mapping: display name -> highlight.js module path
export const LANGUAGES: Record<string, LanguageDefinition> = {
  'Plain text': { name: 'plaintext', module: 'highlight.js/lib/languages/plaintext' },
  'Bash': { name: 'bash', module: 'highlight.js/lib/languages/bash' },
  'C': { name: 'c', module: 'highlight.js/lib/languages/c' },
  'C++': { name: 'cpp', module: 'highlight.js/lib/languages/cpp' },
  'C#': { name: 'csharp', module: 'highlight.js/lib/languages/csharp' },
  'CSS': { name: 'css', module: 'highlight.js/lib/languages/css' },
  'Dart': { name: 'dart', module: 'highlight.js/lib/languages/dart' },
  'Dockerfile': { name: 'dockerfile', module: 'highlight.js/lib/languages/dockerfile' },
  'Go': { name: 'go', module: 'highlight.js/lib/languages/go' },
  'GraphQL': { name: 'graphql', module: 'highlight.js/lib/languages/graphql' },
  'HTML': { name: 'html', module: 'highlight.js/lib/languages/xml' },
  'Java': { name: 'java', module: 'highlight.js/lib/languages/java' },
  'JavaScript': { name: 'javascript', module: 'highlight.js/lib/languages/javascript' },
  'JSON': { name: 'json', module: 'highlight.js/lib/languages/json' },
  'JSX': { name: 'jsx', module: 'highlight.js/lib/languages/javascript' },
  'Kotlin': { name: 'kotlin', module: 'highlight.js/lib/languages/kotlin' },
  'Markdown': { name: 'markdown', module: 'highlight.js/lib/languages/markdown' },
  'PHP': { name: 'php', module: 'highlight.js/lib/languages/php' },
  'Python': { name: 'python', module: 'highlight.js/lib/languages/python' },
  'R': { name: 'r', module: 'highlight.js/lib/languages/r' },
  'Ruby': { name: 'ruby', module: 'highlight.js/lib/languages/ruby' },
  'Rust': { name: 'rust', module: 'highlight.js/lib/languages/rust' },
  'SCSS': { name: 'scss', module: 'highlight.js/lib/languages/scss' },
  'Shell': { name: 'shell', module: 'highlight.js/lib/languages/shell' },
  'SQL': { name: 'sql', module: 'highlight.js/lib/languages/sql' },
  'Swift': { name: 'swift', module: 'highlight.js/lib/languages/swift' },
  'TypeScript': { name: 'typescript', module: 'highlight.js/lib/languages/typescript' },
  'TSX': { name: 'tsx', module: 'highlight.js/lib/languages/typescript' },
  'XML': { name: 'xml', module: 'highlight.js/lib/languages/xml' },
  'YAML': { name: 'yaml', module: 'highlight.js/lib/languages/yaml' },
};

// Cache for loaded languages to avoid re-importing
const languageCache = new Map<string, boolean>();

export async function loadLanguage(
  lowlight: Lowlight,
  languageKey: string
): Promise<boolean> {
  const langDef = LANGUAGES[languageKey];
  if (!langDef) return false;

  // Already loaded
  if (languageCache.has(langDef.name)) {
    return true;
  }

  try {
    const module = await import(/* @vite-ignore */ langDef.module);
    if (module.default) {
      // Register with the module's default name first
      lowlight.register(langDef.name, module.default);

      // Register aliases for languages that need them
      if (langDef.name === 'xml') {
        // XML module also handles HTML
        lowlight.register('html', module.default);
        languageCache.set('html', true);
      }
      if (langDef.name === 'javascript') {
        // JavaScript module also handles JSX
        lowlight.register('jsx', module.default);
        languageCache.set('jsx', true);
      }
      if (langDef.name === 'typescript') {
        // TypeScript module also handles TSX
        lowlight.register('tsx', module.default);
        languageCache.set('tsx', true);
      }

      languageCache.set(langDef.name, true);
      return true;
    }
    return false;
  } catch (error) {
    console.warn(`Failed to load language: ${languageKey}`, error);
    return false;
  }
}

export function isLanguageLoaded(languageKey: string): boolean {
  const langDef = LANGUAGES[languageKey];
  if (!langDef) return false;
  return languageCache.has(langDef.name);
}

export function getLanguageName(languageKey: string): string {
  const langDef = LANGUAGES[languageKey];
  return langDef?.name || 'plaintext';
}

export function getLanguageKeyByName(name: string): string | undefined {
  return Object.keys(LANGUAGES).find(
    (key) => LANGUAGES[key].name === name
  );
}

export function getAllLanguageKeys(): string[] {
  return Object.keys(LANGUAGES);
}
