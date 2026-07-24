// opentype.js ships no types. It's used only by lib/font-parser.ts (font
// metadata parsing). Declare it as `any` so type-checking can be enabled for
// the rest of the codebase without pulling in a full typings package.
declare module 'opentype.js'
