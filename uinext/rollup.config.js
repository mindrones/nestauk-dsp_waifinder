/* eslint-disable no-process-env */
import commonjs from '@rollup/plugin-commonjs';
import dsv from '@rollup/plugin-dsv';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import yaml from '@rollup/plugin-yaml';
import {mdsvex} from 'mdsvex';
import babel from 'rollup-plugin-babel';
import svelte from 'rollup-plugin-svelte';
import { terser } from 'rollup-plugin-terser';
import config from 'sapper/config/rollup.js';

import {unescape_code} from './src/node_modules/app/utils/unescape-inlineCode';
import pkg from './package.json';

const mode = process.env.NODE_ENV;
const isExported = process.env.SAPPER_EXPORT;
const dev = mode === 'development';
const legacy = Boolean(process.env.SAPPER_LEGACY_BUILD);

const onwarn = (warning, warn) => (
	warning.code === 'MISSING_EXPORT' && (/'preload'/u).test(warning.message) ||
	warning.code === 'CIRCULAR_DEPENDENCY' && (/[/\\]@sapper[/\\]/u).test(warning.message) ||
	warning.code !== 'CIRCULAR_DEPENDENCY'
) && warn(warning);

export default {
	client: {
		input: config.client.input(),
		output: config.client.output(),
		preserveEntrySignatures: false,
		plugins: [
			replace({
				'process.browser': true,
				'process.env.NODE_ENV': JSON.stringify(mode),
				'process.env.SAPPER_EXPORT': JSON.stringify(isExported)
			}),
			svelte({
				extensions: [
					'.svelte',
					'.svx'
				],
				preprocess: mdsvex({
					layout:'./src/node_modules/app/components/mdsvex/_layout.svelte',
					remarkPlugins: [unescape_code]
				}),
				compilerOptions: {
					dev,
					hydratable: true,
				},
				emitCss: true,
			}),
			resolve({
				// browser: true,
				dedupe: ['svelte']
			}),
			commonjs(),
			dsv(),
			json(),
			yaml(),

			legacy && babel({
				extensions: ['.js', '.mjs', '.html', '.svelte'],
				runtimeHelpers: true,
				exclude: ['node_modules/@babel/**'],
				presets: [
					['@babel/preset-env', {
						targets: '> 0.25%, not dead'
					}]
				],
				plugins: [
					'@babel/plugin-syntax-dynamic-import',
					['@babel/plugin-transform-runtime', {
						useESModules: true
					}]
				]
			}),

			!dev && terser({
				module: true
			})
		],

		onwarn,
	},

	server: {
		input: config.server.input(),
		output: config.server.output(),
		preserveEntrySignatures: false,
		plugins: [
			replace({
				'process.browser': false,
				'process.env.NODE_ENV': JSON.stringify(mode),
				'process.env.SAPPER_EXPORT': JSON.stringify(isExported)
			}),
			svelte({
				extensions: [
					'.svelte',
					'.svx'
				],
				preprocess: mdsvex({
					layout:'./src/node_modules/app/components/mdsvex/_layout.svelte',
					remarkPlugins: [unescape_code]
				}),
				compilerOptions: {
					generate: 'ssr',
					dev,
				},
			}),
			resolve({
				dedupe: ['svelte']
			}),
			commonjs(),
			dsv(),
			json(),
			yaml(),
		],
		external:
			Object.keys(pkg.dependencies)
			.filter(name => ![
				'@svizzle/barchart',
				'@svizzle/choropleth',
				'@svizzle/utils',
			].includes(name))
			.concat(
				// eslint-disable-next-line global-require
				require('module').builtinModules ||
				Object.keys(process.binding('natives'))
			),

		onwarn,
	},

	serviceworker: {
		input: config.serviceworker.input(),
		output: config.serviceworker.output(),
		preserveEntrySignatures: false,
		plugins: [
			resolve(),
			replace({
				'process.browser': true,
				'process.env.NODE_ENV': JSON.stringify(mode),
				'process.env.SAPPER_EXPORT': JSON.stringify(isExported)
			}),
			commonjs(),
			dsv(),
			json(),
			yaml(),
			!dev && terser()
		],

		onwarn,
	}
};
