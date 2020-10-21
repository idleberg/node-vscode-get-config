import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import filesize from 'rollup-plugin-filesize';
import typescript from '@rollup/plugin-typescript';

const defaults = {
  external: [
    'vscode'
  ],
  plugins: [
    commonjs(),
    filesize(),
    nodeResolve(),
    typescript({
      allowSyntheticDefaultImports: true
    })
  ]
};

export default [
  {
    ...defaults,
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs'
    }
  }
];
