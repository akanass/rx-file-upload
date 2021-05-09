import { RollupOptions } from 'rollup';

// rollup plugins
import * as del from 'rollup-plugin-delete';
import * as typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import { addPackageFiles, cleanComments } from './rollup.plugin';

// rebuild config array to switch plugins values from config by plugins functions
const config: RollupOptions[] = [
  {
    input: './src/index.ts',
    output: {
      dir: './dist',
      format: 'esm',
      entryFileNames: 'esm/[name].js',
      preferConst: true,
    },
    plugins: [
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      del({ targets: ['./dist'] }),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      typescript(),
      nodeResolve(),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      addPackageFiles(['README.md', 'package.json']),
    ],
    external: [
      'rxjs',
      'rxjs/ajax',
      'rxjs/operators',
      'crypto-es/lib/sha256',
      'crypto-es/lib/core',
    ],
  },
  {
    input: './src/index.ts',
    output: {
      dir: './dist',
      format: 'esm',
      entryFileNames: 'esm5/[name].js',
    },
    plugins: [
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      typescript({ tsconfig: './tsconfig.es5.json' }),
      nodeResolve(),
    ],
    external: [
      'tslib',
      'rxjs',
      'rxjs/ajax',
      'rxjs/operators',
      'crypto-es/lib/sha256',
      'crypto-es/lib/core',
    ],
  },
  {
    input: './src/index.ts',
    output: {
      dir: './dist',
      format: 'umd',
      name: 'RxFileUploadUnPkg',
      entryFileNames: 'bundle/[name].umd.min.js',
    },
    plugins: [
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      typescript({ tsconfig: './tsconfig.es5.json' }),
      nodeResolve(),
      terser(),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      cleanComments(),
    ],
  },
];

export default config;
