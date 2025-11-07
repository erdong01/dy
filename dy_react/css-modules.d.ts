// Allow importing plain CSS files as side-effect modules in TypeScript
// Next.js supports global CSS imports, but TS needs a module declaration to silence type errors.
declare module '*.css';

declare module '@vidstack/react/player/styles/base.css';
declare module '@vidstack/react/player/styles/default/layouts/audio.css';
declare module '@vidstack/react/player/styles/default/layouts/video.css';
declare module '@vidstack/react/player/styles/default/theme.css';
declare module '@vidstack/react/player/styles/plyr/theme.css';
