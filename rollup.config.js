import { nodeResolve } from '@rollup/plugin-node-resolve';
import { babel } from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';
import replace from '@rollup/plugin-replace';

const isDev = process.env.NODE_ENV === 'development';

export default {
  input: 'tag/analytics.ts',
  output: {
    file: 'public/analytics.js',
    format: 'iife',
    sourcemap: true,
  },
  plugins: [
    babel({
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      include: ['tag/**/*'],
      babelHelpers: 'bundled',
      presets: [
        [
          '@babel/preset-env',
          {
            // MAke sure to output ES5
            targets: 'defaults',
          },
        ],
        '@babel/preset-typescript',
      ],
    }),
    nodeResolve(),
    replace({
      'process.env.NODE_ENV': JSON.stringify(
        isDev ? 'development' : 'production'
      ),
      'process.env.SCRIPT_ORIGIN': JSON.stringify(process.env.PUBLIC_ORIGIN),
    }),
    terser(),
  ],
  watch: {
    clearScreen: false,
  },
};
