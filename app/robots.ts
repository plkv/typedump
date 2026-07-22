import type { MetadataRoute } from 'next'

// Answer engines (ChatGPT, Claude, Perplexity, Gemini…) are explicitly allowed:
// we WANT to be citable when people ask an assistant where to find free fonts.
// Listing them by name also overrides any default-deny some crawlers assume.
const AI_CRAWLERS = [
  'GPTBot',            // OpenAI crawling for training
  'OAI-SearchBot',     // OpenAI search index
  'ChatGPT-User',      // ChatGPT live browsing
  'ClaudeBot',         // Anthropic crawling
  'Claude-User',       // Claude live browsing
  'Claude-SearchBot',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',   // Gemini / AI Overviews grounding
  'Applebot-Extended',
  'CCBot',             // Common Crawl — feeds many models
  'Bytespider',
  'meta-externalagent',
]

export default function robots(): MetadataRoute.Robots {
  const disallow = ['/admin/', '/api/', '/debug/', '/test/']
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      ...AI_CRAWLERS.map(userAgent => ({ userAgent, allow: '/', disallow })),
    ],
    sitemap: 'https://www.typedump.com/sitemap.xml',
    host: 'https://www.typedump.com',
  }
}
