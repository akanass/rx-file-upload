import { OutputOptions, Plugin } from 'rollup';
import { from, lastValueFrom, of } from 'rxjs';
import {
  catchError,
  defaultIfEmpty,
  filter,
  map,
  mergeMap,
  tap,
} from 'rxjs/operators';
import { copy, outputJson, readJson } from 'fs-extra';
import { join } from 'path';

/**
 * Clean comments in bundle
 */
export const cleanComments: Plugin = () => {
  return {
    name: 'cleanComments',
    renderChunk: async (code: string) => {
      return await lastValueFrom(
        of(code).pipe(
          map((_: string) =>
            _.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, ''),
          ),
          map((_: string) => _.replace(/\n/gm, '')),
        ),
      );
    },
  };
};

/**
 * Add files to prepare final dist folder to publish it on NPM
 *
 * @param {string[]} files list of files to add in final package directory
 */
export const addPackageFiles: Plugin = (files: string[]) => {
  return {
    name: 'addPackageFiles',
    writeBundle: async (options: OutputOptions) => {
      await lastValueFrom(
        from([].concat(files)).pipe(
          filter(
            (fileName: string) =>
              typeof fileName === 'string' && fileName !== '',
          ),
          mergeMap((fileName: string) =>
            fileName.indexOf('package.json') > -1
              ? from(readJson(join(process.cwd(), fileName))).pipe(
                  tap((packageObj: any) => delete packageObj['scripts']),
                  tap(
                    (packageObj: any) => delete packageObj['devDependencies'],
                  ),
                  mergeMap((packageObj: any) =>
                    outputJson(
                      join(process.cwd(), options.dir, fileName),
                      packageObj,
                    ),
                  ),
                  catchError((err: Error) => {
                    console.error('addPackageFiles failed =>', err.message);
                    return of(undefined);
                  }),
                )
              : from(
                  copy(
                    join(process.cwd(), fileName),
                    join(process.cwd(), options.dir, fileName),
                  ),
                ).pipe(
                  catchError((err: Error) => {
                    console.error('addPackageFiles failed =>', err.message);
                    return of(undefined);
                  }),
                ),
          ),
          defaultIfEmpty(undefined),
        ),
      );
    },
  };
};
