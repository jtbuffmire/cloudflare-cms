import { join } from 'path';
import { skeleton } from '@skeletonlabs/tw-plugin';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './src/**/*.{html,js,svelte,ts}',
    join(require.resolve('@skeletonlabs/skeleton'), '../**/*.{html,js,svelte,ts}')
  ],
  theme: {
    extend: {
      colors: {
        // custom colors if needed
      },
    },
  },
  plugins: [
    skeleton({
      themes: {
        preset: [
          {
            name: 'modern',
            enhancements: true,
          },
        ],
      }
    })
  ]
};