import { nodeResolve } from '@rollup/plugin-node-resolve';
import { babel } from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';
import replace from '@rollup/plugin-replace';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const isDev = process.env.NODE_ENV === 'development';

export default {
  input: 'tag/index.ts',
  output: [
    {
      // legacy
      file: 'public/analytics.js',
      format: 'iife',
      sourcemap: true,
    },
    {
      file: 'public/tag.js',
      format: 'iife',
      sourcemap: true,
    },
  ],
  plugins: [
    babel({
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      include: ['tag/**/*'],
      babelHelpers: 'bundled',
    }),
    nodeResolve(),
    replace({
      'process.env.NODE_ENV': JSON.stringify(
        isDev ? 'development' : 'production'
      ),
      'process.env.PUBLIC_ORIGIN': JSON.stringify(process.env.PUBLIC_ORIGIN),
    }),
    terser(),
  ],
  watch: {
    clearScreen: false,
  },
};
