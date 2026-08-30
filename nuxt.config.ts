import { fileURLToPath } from 'node:url';

// https://nuxt.com/docs/api/configuration/nuxt-config
const isProductionBuild = process.env.NODE_ENV === 'production';

export default defineNuxtConfig({
	modules: [
		...(isProductionBuild ? [] : ['@nuxt/test-utils/module']),
		'@pinia/nuxt',
		'@nuxt/image',
		'@nuxtjs/i18n',
		'@vueuse/motion/nuxt',
		'@vueuse/nuxt',
		'@nuxt/eslint',
		'@nuxt/ui',
		'@vueuse/nuxt',
		[
			'@nuxtjs/google-fonts',
			{
				families: {
					Lato: {
						wght: '300..900',
						italic: '300..900',
					},
				},
				preload: true,
			},
		],
	],

	i18n: {
		locales: [
			{ code: 'en', name: 'English', file: 'en.json' },
			{ code: 'ms', name: 'Bahasa Melayu', file: 'ms.json' },
		],
		defaultLocale: 'en',
		lazy: true,
		langDir: 'locales',
		strategy: 'no_prefix',
	},

	app: {
		head: {
			title: process.env.APP_PLATFORM === 'yeppi' ? 'Yeppi CRM' : 'Wemotoo CRM',
			link: [
				{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/icon?family=Material+Icons' },
				{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
			],
		},
		baseURL: process.env.NODE_ENV === 'prod' ? '/' : '/',
	},

	css: ['~/assets/css/main.css'],

	future: {
		compatibilityVersion: 4,
	},

	colorMode: {
		preference: 'light',
	},

	// routeRules: {
	// 	'/**': {
	// 		proxy: { to: 'http://127.0.0.1:8888/**' },
	// 	},
	// },
	// nitro: {
	// 	devProxy: {
	// 		'/api': {
	// 			target: 'http://localhost:8888',
	// 			headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' },
	// 			prependPath: true,
	// 			changeOrigin: true,
	// 		},
	// 	},
	// },

	runtimeConfig: {
		apiKey: process.env.API_KEY,
		requestSignatureSecret: process.env.REQUEST_SIGNATURE_SECRET,
		jwtSecret: process.env.JWT_SECRET,
		appPlatform: process.env.APP_PLATFORM || 'wemotoo',
		public: {
			baseUrl: process.env.BASE_URL,
			version: process.env.APP_VERSION,
			appPlatform: process.env.APP_PLATFORM || 'wemotoo',
		},
	},

	routeRules: {
		'/api**': {
			// enable CORS
			cors: true, // if enabled, also needs cors-preflight-request.ts Nitro middleware to answer CORS preflight requests
			headers: {
				// CORS headers
				'Access-Control-Allow-Origin': '*', // 'http://example:6006', has to be set to the requesting domain that you want to send the credentials back to
				'Access-Control-Allow-Methods': '*', // 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS'
				'Access-Control-Allow-Credentials': 'true',
				'Access-Control-Allow-Headers': '*', // 'Origin, Content-Type, Accept, Authorization, X-Requested-With'
				'Access-Control-Expose-Headers': '*',
				// 'Access-Control-Max-Age': '7200', // 7200 = caching 2 hours (Chromium default), https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Max-Age#directives
			},
		},
	},

	features: {
		inlineStyles: false,
	},

	compatibilityDate: '2024-04-03',

	alias: {
		'#root': fileURLToPath(new URL('.', import.meta.url)),
	},

	nitro: {
		compressPublicAssets: true,
		sourceMap: !isProductionBuild,
	},

	vite: {
		resolve: {
			// Prefer "browser" entry for client build so yeppi-common uses browser-safe bundle (no Node crypto).
			conditions: ['browser', 'import', 'module', 'default'],
		},
		// Ensure zod is pre-bundled for SSR to avoid undefined errors.
		// Keep yeppi-common out of the Vite dep cache: the git package stays at 1.0.0,
		// so new named exports are otherwise served from a stale prebundle.
		optimizeDeps: {
			include: ['zod'],
			exclude: ['yeppi-common'],
		},
		ssr: {
			noExternal: ['zod'],
		},
		css: {
			preprocessorOptions: {
				scss: {
					charset: false,
				},
			},
		},
		build: {
			cssCodeSplit: false,
			sourcemap: !isProductionBuild,
		},
		server: {
			fs: {
				allow: [
					'.', // project root
					'..', // parent directory for potential shared modules
				],
			},
		},
	},

	eslint: {
		config: {
			stylistic: {
				indent: 'tab',
				quotes: 'single',
				semi: true,
				braceStyle: '1tbs',
			},
		},
	},
});
