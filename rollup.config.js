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
      allowSyntheticDefaultImports: true,
      lib: [
        'esnext',
      ]
    })
  ]
};

export default [
  {
    ...defaults,
    external: [
      'path',
      'vscode'
    ],
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs'
    }
  }
];
