import svelte from "rollup-plugin-svelte";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import livereload from "rollup-plugin-livereload";
import autoPreprocess from "svelte-preprocess";
import { terser } from "rollup-plugin-terser";
import sass from 'rollup-plugin-sass';
import json from '@rollup/plugin-json';
import image from 'svelte-image'
import copy from 'rollup-plugin-copy'

const isDev = Boolean(process.env.ROLLUP_WATCH);

export default [
  // Browser bundle
  {
    input: "src/main.ts",
    output: {
      sourcemap: true,
      format: "iife",
      name: "app",
      file: "public/bundle.js"
    },
    plugins: [
      sass({
         includePaths: ["./src/styles"],
         output: "public/global.css"
      }),
      svelte({
        hydratable: true,
        dev: isDev,
        css: css => {
          css.write("public/bundle.css");
        },
        preprocess: autoPreprocess(),
      }),
      copy({
        targets: [{ src: 'static/*', dest: 'public' }],
      }),
      resolve(),
      commonjs(),
      json({
        compact: true
      }),
      // App.js will be built after bundle.js, so we only need to watch that.
      // By setting a small delay the Node server has a chance to restart before reloading.
      isDev &&
        livereload({
          watch: "public/App.js",
          delay: 200
        }),
      !isDev && terser()
    ]
  },
  // Server bundle
  {
    input: "src/App.svelte",
    output: {
      sourcemap: false,
      format: "cjs",
      name: "app",
      file: "public/App.js"
    },
    plugins: [
      svelte({
        preprocess: autoPreprocess(),
        generate: "ssr",
      }),
      resolve(),
      commonjs(),
      json({
        compact: true
      }),
      !isDev && terser()
    ]
  }
];
