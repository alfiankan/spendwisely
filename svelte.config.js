import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		// Static adapter for CSR static site generation
		adapter: adapter({
			// Output directory for static files
			pages: 'build',
			assets: 'build',
			// Fallback page for SPA routing
			fallback: 'index.html',
			// Precompress files
			precompress: false,
			// Strict mode (recommended for static sites)
			strict: true
		}),
		// Prerender all pages for static generation
		prerender: {
			handleHttpError: 'warn'
		}
	}
};

export default config;
