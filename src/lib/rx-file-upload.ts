import { ajax, AjaxConfig, AjaxError, AjaxResponse } from 'rxjs/ajax';
import { from, merge, Observable, of, Subject, throwError } from 'rxjs';
import {
  catchError,
  concatMap,
  defaultIfEmpty,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  tap,
  toArray,
} from 'rxjs/operators';
import { SHA256 } from 'crypto-es/lib/sha256';
import { WordArray } from 'crypto-es/lib/core';
import {
  RxFileUpload,
  RxFileUploadAdditionalFormData,
  RxFileUploadBodyData,
  RxFileUploadChunkBodyData,
  RxFileUploadChunkFormData,
  RxFileUploadChunkSequenceData,
  RxFileUploadChunkSize,
  RxFileUploadConfig,
  RxFileUploadError,
  RxFileUploadProgressData,
  RxFileUploadResponse,
} from './types';

/**
 * Helper to check if we are in the browser and all required elements are available
 *
 * @return {boolean} the flag to know if we can use RxFileUpload library
 */
export const supportsRxFileUpload = (): boolean =>
  typeof window !== 'undefined' &&
  typeof XMLHttpRequest === 'function' &&
  typeof FormData === 'function';

/**
 * RxFileUploadCls class definition which implements RxFileUpload
 *
 * This class will do the process to upload file(s) fully or with chunks
 *
 * @internal
 */
export class RxFileUploadCls implements RxFileUpload {
  /**
   * List of AjaxConfig allowed properties to be sure to have the right ones when using JS and not TS
   * because JS doesn't use typings so you can pass what you want inside and if one property isn't allowed
   * we will throw an error
   *
   * @private
   * @internal
   */
  private readonly _allowedConfigProperties: string[] = [
    'url',
    'headers',
    'timeout',
    'user',
    'password',
    'crossDomain',
    'withCredentials',
    'xsrfCookieName',
    'xsrfHeaderName',
    'responseType',
    'queryParams',
  ];
  /**
   * Property to store 1024 bytes / 1 Kb
   *
   * @private
   * @internal
   */
  private readonly _oneKb = 1024;
  /**
   * Property to store xhr configuration
   *
   * @private
   * @internal
   */
  private _config: AjaxConfig;
  /**
   * Property to store ajax function
   *
   * @private
   * @internal
   */
  private readonly _ajax: <T>(
    config: AjaxConfig,
  ) => Observable<AjaxResponse<T>>;
  /**
   * Property to store chunk size
   *
   * @private
   * @internal
   */
  private readonly _chunkSize: number;
  /**
   * Property to store flag to know if checksum is disable or not
   *
   * @private
   * @internal
   */
  private readonly _addChecksum: boolean;
  /**
   * Property to store flag to know if chunks split is disable or not
   *
   * @private
   * @internal
   */
  private readonly _useChunks: boolean;
  /**
   * Property to store the number of file to upload and know when complete the progress stream
   *
   * @private
   * @internal
   */
  private _numberOfFilesToUpload: number;
  /**
   * Property to store progress Subject instance
   *
   * @private
   * @internal
   */
  private readonly _progress$: Subject<RxFileUploadProgressData>;

  /**
   * Class constructor
   *
   * @param {RxFileUploadConfig} config object to configure the upload process
   *
   * @internal
   */
  constructor(config: RxFileUploadConfig) {
    // check if functionality is available
    if (!supportsRxFileUpload()) {
      throw new Error(
        'You must be in a compatible browser to use this library !!!',
      );
    }

    // set default chunk size to 1 Mb
    this._chunkSize = this._oneKb * this._oneKb;

    // check if chunk size property is in the config
    if (typeof config.chunkSize === 'number') {
      // check chunk size before storing it
      this._checkChunkSize(config.chunkSize);
      // set chunk size
      this._chunkSize = config.chunkSize;
      // delete chunk size in config
      delete config.chunkSize;
    }

    // set default flag value to false
    this._addChecksum = false;

    // check if flag is set in the config
    if (typeof config.addChecksum === 'boolean') {
      this._addChecksum = config.addChecksum;
      // delete flag in config
      delete config.addChecksum;
    }

    // set default flag value to false
    this._useChunks = false;

    // check if flag is set in the config
    if (typeof config.useChunks === 'boolean') {
      // set flag to know if checksum is disable or not
      this._useChunks = config.useChunks;
      // delete flag in config
      delete config.useChunks;
    }

    // set ajax configuration property
    this._setAjaxConfig(config);

    // set ajax function property
    this._ajax = ajax;

    // init the number of files to 0
    this._numberOfFilesToUpload = 0;

    // set progress Subject
    this._progress$ = new Subject<RxFileUploadProgressData>();
  }

  /**
   * Progress Observable
   *
   * @return {Observable<RxFileUploadProgressData>} the Observable which streams progress data for each file(s)/chunk(s) uploaded
   */
  public progress(): Observable<RxFileUploadProgressData> {
    return this._progress$.pipe(distinctUntilChanged());
  }

  /**
   * Function to upload one or multiple files to the server with optional additional data
   *
   * @param {File|File[]} oneFileOrMultipleFiles the file(s) to upload to the server
   * @param {RxFileUploadAdditionalFormData} additionalFormData sent to the server
   *
   * @return {Observable<RxFileUploadResponse<T>>} the Observable which streams the response from the server after each file has been uploaded
   */
  public upload = <T>(
    oneFileOrMultipleFiles: File | File[],
    additionalFormData?: RxFileUploadAdditionalFormData,
  ): Observable<RxFileUploadResponse<T>> =>
    from([].concat(oneFileOrMultipleFiles)).pipe(
      // check if we really have file object inside our array
      filter((file: File) => file instanceof File),
      toArray(),
      // check if we have at least one file to upload
      mergeMap(
        (files: File[]): Observable<File[]> =>
          of(files.length).pipe(
            filter((length: number): boolean => length === 0),
            mergeMap(
              (): Observable<never> =>
                throwError(
                  () =>
                    new Error('You must provide at least one file to upload.'),
                ),
            ),
            defaultIfEmpty(files),
          ),
      ),
      // store real number of files to upload for progress process
      tap((files: File[]) => (this._numberOfFilesToUpload = files.length)),
      // upload file(s)
      mergeMap(
        (files: File[]): Observable<RxFileUploadResponse<T>> =>
          from(files).pipe(
            mergeMap((file: File, fileIndex: number) =>
              this._uploadFile<T>(
                file,
                additionalFormData,
                files.length > 1 ? fileIndex : undefined,
              ),
            ),
          ),
      ),
    );

  /**
   * Function to upload one file, with or without chunk, to the server with optional additional data
   *
   * @param {File} file the file to upload to the server
   * @param {RxFileUploadAdditionalFormData} additionalFormData sent to the server
   * @param {number} fileIndex the index of the file for a multiple upload
   *
   * @return {Observable<RxFileUploadResponse<T>>} the Observable which streams the response from the server after each file has been uploaded
   *
   * @private
   * @internal
   */
  private _uploadFile = <T>(
    file: File,
    additionalFormData?: RxFileUploadAdditionalFormData,
    fileIndex?: number,
  ): Observable<RxFileUploadResponse<T>> =>
    of(of(this._useChunks)).pipe(
      mergeMap(
        (obs: Observable<boolean>): Observable<RxFileUploadResponse<T>> =>
          merge(
            obs.pipe(
              filter((useChunks: boolean): boolean => !!useChunks),
              mergeMap(
                (): Observable<RxFileUploadResponse<T>> =>
                  this._sendFileWithChunks<T>(
                    file,
                    additionalFormData,
                    fileIndex,
                  ),
              ),
            ),
            obs.pipe(
              filter((useChunks: boolean): boolean => !useChunks),
              mergeMap(
                (): Observable<RxFileUploadResponse<T>> =>
                  this._sendFile<T>(file, additionalFormData, fileIndex),
              ),
            ),
          ),
      ),
    );

  /**
   * Function to upload one file without chunk to the server with optional additional data
   *
   * @param {File} file the file to upload to the server
   * @param {RxFileUploadAdditionalFormData} additionalFormData sent to the server
   * @param {number} fileIndex the index of the file for a multiple upload
   *
   * @return {Observable<RxFileUploadResponse<T>>} the Observable which streams the response from the server after each file has been uploaded
   *
   * @private
   * @internal
   */
  private _sendFile = <T>(
    file: File,
    additionalFormData?: RxFileUploadAdditionalFormData,
    fileIndex?: number,
  ): Observable<RxFileUploadResponse<T>> =>
    this._fileBodyData(file, additionalFormData).pipe(
      mergeMap(
        (f: FormData): Observable<RxFileUploadResponse<T>> =>
          this._makeAjaxCall<T>(f, undefined, fileIndex),
      ),
    );

  /**
   * Function to upload one file with chunks to the server with optional additional data
   *
   * @param {File} file the file to upload to the server
   * @param {RxFileUploadAdditionalFormData} additionalFormData sent to the server
   * @param {number} fileIndex the index of the file for a multiple upload
   *
   * @return {Observable<RxFileUploadResponse<T>>} the Observable which streams the response from the server after each file with chunks has been uploaded
   *
   * @private
   * @internal
   */
  private _sendFileWithChunks = <T>(
    file: File,
    additionalFormData?: RxFileUploadAdditionalFormData,
    fileIndex?: number,
  ): Observable<RxFileUploadResponse<T>> =>
    this._chunkBodyData(file, additionalFormData).pipe(
      concatMap(
        (f: RxFileUploadChunkFormData): Observable<RxFileUploadResponse<T>> =>
          this._makeAjaxCall<T>(f.formData, f.chunkSequenceData, fileIndex),
      ),
    );

  /**
   * Function to make the AJAX call to the server
   * @param {FormData} f the form data object to send to the server
   * @param {RxFileUploadChunkSequenceData} chunk data to calculate real progress if it's a chunk
   * @param {number} fileIndex the index of the file for a multiple upload
   *
   * @return {Observable<RxFileUploadResponse<T>>} the Observable which streams the response from the server after each file, with or without chunks, has been uploaded
   *
   * @private
   * @internal
   */
  private _makeAjaxCall = <T>(
    f: FormData,
    chunk?: RxFileUploadChunkSequenceData,
    fileIndex?: number,
  ): Observable<RxFileUploadResponse<T>> =>
    this._ajax<T>({ ...this._config, body: f }).pipe(
      catchError(
        (e: AjaxError): Observable<never> =>
          throwError(
            (): RxFileUploadError => ({
              status: e.status,
              response: e.response,
            }),
          ),
      ),
      mergeMap(
        (ajaxResponse: AjaxResponse<T>): Observable<AjaxResponse<T>> =>
          merge(
            of(ajaxResponse.type).pipe(
              // progress answer
              filter((type): boolean => type === 'upload_progress'),
              map(
                (): RxFileUploadProgressData => ({
                  progress: this._calculateProgress(
                    Math.round(
                      (ajaxResponse.loaded * 100) / ajaxResponse.total,
                    ),
                    chunk,
                  ),
                }),
              ),
              mergeMap(
                (
                  progress: RxFileUploadProgressData,
                ): Observable<RxFileUploadProgressData> =>
                  of(fileIndex).pipe(
                    filter((_: number): boolean => typeof _ === 'number'),
                    map(
                      (): RxFileUploadProgressData => ({
                        ...progress,
                        fileIndex,
                      }),
                    ),
                    defaultIfEmpty(progress),
                  ),
              ),
              tap((progress: RxFileUploadProgressData): void =>
                this._progress$.next(progress),
              ),
              map((): AjaxResponse<T> => ajaxResponse),
            ),
            // final progress answer
            of(ajaxResponse.type).pipe(
              filter((type): boolean => type === 'upload_load'),
              filter(
                () =>
                  typeof chunk === 'undefined' ||
                  chunk.sequence === chunk.totalChunks,
              ),
              tap(() => this._numberOfFilesToUpload--),
              tap(() =>
                this._numberOfFilesToUpload === 0
                  ? this._progress$.complete()
                  : undefined,
              ),
              map((): AjaxResponse<T> => ajaxResponse),
            ),
            // final answer
            of(ajaxResponse.type).pipe(
              filter((type): boolean => type === 'download_load'),
              map((): AjaxResponse<T> => ajaxResponse),
            ),
          ),
      ),
      // take only the final answer
      filter(
        (ajaxResponse: AjaxResponse<T>): boolean =>
          ajaxResponse.type === 'download_load',
      ),
      // create our own response object instance
      map(
        (ajaxResponse: AjaxResponse<T>): RxFileUploadResponse<T> => ({
          status: ajaxResponse.status,
          response: ajaxResponse.response,
          responseHeaders: Object.keys(ajaxResponse.responseHeaders)
            .filter((key: string) => key !== '')
            .reduce(
              (acc, curr) => ({
                ...acc,
                [curr]: ajaxResponse.responseHeaders[curr],
              }),
              {},
            ),
        }),
      ),
      // add file index in the response if it's a multiple files upload
      mergeMap(
        (
          response: RxFileUploadResponse<T>,
        ): Observable<RxFileUploadResponse<T>> =>
          of(fileIndex).pipe(
            filter((_: number): boolean => typeof _ === 'number'),
            map((): RxFileUploadResponse<T> => ({ ...response, fileIndex })),
            defaultIfEmpty(response),
          ),
      ),
    );

  /**
   * Helper to calculate current progress value
   *
   * @param {number} progress the current ajax response progress value
   * @param {RxFileUploadChunkSequenceData} chunk data to calculate real progress if it's a chunk
   *
   * @return {number} the progress value
   *
   * @private
   * @internal
   */
  private _calculateProgress = (
    progress: number,
    chunk?: RxFileUploadChunkSequenceData,
  ): number =>
    typeof chunk === 'object'
      ? Math.round(
          progress / chunk.totalChunks +
            (chunk.sequence - 1) * (100 / chunk.totalChunks),
        )
      : progress;

  /**
   * Helper to build formData body for one file upload
   *
   * @param {File} file the file to upload to the server
   * @param {RxFileUploadAdditionalFormData} additionalFormData sent to the server
   *
   * @return {Observable<FormData>} the Observable which streams the FormData object to upload full file
   *
   * @private
   * @internal
   */
  private _fileBodyData = (
    file: File,
    additionalFormData?: RxFileUploadAdditionalFormData,
  ): Observable<FormData> =>
    this._fileDataWithAdditionalData(file, additionalFormData).pipe(
      map(
        (data: any): RxFileUploadBodyData => ({
          formData: new FormData(),
          data: { ...data, file },
        }),
      ),
      map(
        (_: RxFileUploadBodyData): FormData => {
          Object.keys(_.data).forEach((key: string) =>
            _.formData.append(key, _.data[key]),
          );
          return _.formData;
        },
      ),
    );

  /**
   * Helper to build fileData and additionalData values to insert inside FormData
   *
   * @param {File} file the file to upload to the server
   * @param {RxFileUploadAdditionalFormData} additionalFormData sent to the server
   *
   * @return {Observable<any>} the Observable which streams the data of the File to upload with optional additional data to insert inside the FormData
   *
   * @private
   * @internal
   */
  private _fileDataWithAdditionalData = (
    file: File,
    additionalFormData?: RxFileUploadAdditionalFormData,
  ): Observable<any> =>
    of(of(this._addChecksum)).pipe(
      mergeMap(
        (obs: Observable<boolean>): Observable<{ fileData: string }> =>
          obs.pipe(
            filter((addChecksum: boolean): boolean => !!addChecksum),
            mergeMap(
              (): Observable<{ fileData: string }> =>
                this._calculateCheckSum(file).pipe(
                  map((checksum: string): { fileData: string } => ({
                    fileData: this._serialize({
                      name: file.name,
                      size: file.size,
                      lastModified: file.lastModified,
                      type: file.type,
                      sha256Checksum: checksum,
                    }),
                  })),
                ),
            ),
            defaultIfEmpty({
              fileData: this._serialize({
                name: file.name,
                size: file.size,
                lastModified: file.lastModified,
                type: file.type,
              }),
            }),
          ),
      ),
      map((data: { fileData: string }): any =>
        typeof additionalFormData !== 'undefined' &&
        typeof additionalFormData.fieldName === 'string' &&
        ['string', 'object'].includes(typeof additionalFormData.data)
          ? {
              ...data,
              [additionalFormData.fieldName]: this._serialize(
                additionalFormData.data,
              ),
            }
          : data,
      ),
    );

  /**
   * Helper to build formData body for one file upload with chunks
   *
   * @param {File} file the file to upload to the server
   * @param {RxFileUploadAdditionalFormData} additionalFormData sent to the server
   *
   * @return {Observable<RxFileUploadChunkFormData>} the Observable which streams the FormData object to upload file with chunks
   *
   * @private
   * @internal
   */
  private _chunkBodyData = (
    file: File,
    additionalFormData?: RxFileUploadAdditionalFormData,
  ): Observable<RxFileUploadChunkFormData> =>
    this._fileDataWithAdditionalData(file, additionalFormData).pipe(
      mergeMap(
        (fileData: any): Observable<RxFileUploadChunkFormData> =>
          this._calculateChunkSizes(file.size).pipe(
            mergeMap(
              (
                chunkSizes: RxFileUploadChunkSize[],
              ): Observable<RxFileUploadChunkFormData> =>
                from(chunkSizes).pipe(
                  map(
                    (
                      _: RxFileUploadChunkSize,
                      index: number,
                    ): RxFileUploadChunkBodyData => ({
                      data: {
                        file: new File(
                          [file.slice(_.startByte, _.endByte)],
                          file.name,
                          { type: file.type },
                        ),
                        ...fileData,
                        chunkData: this._serialize({
                          sequence: index + 1,
                          totalChunks: chunkSizes.length,
                          startByte: _.startByte,
                          endByte: _.endByte,
                        }),
                      },
                      formData: new FormData(),
                      chunkSequenceData: {
                        sequence: index + 1,
                        totalChunks: chunkSizes.length,
                      },
                    }),
                  ),
                  map(
                    (
                      _: RxFileUploadChunkBodyData,
                    ): RxFileUploadChunkFormData => {
                      Object.keys(_.data).forEach((key: string) =>
                        _.formData.append(key, _.data[key]),
                      );
                      return {
                        formData: _.formData,
                        chunkSequenceData: _.chunkSequenceData,
                      };
                    },
                  ),
                ),
            ),
          ),
      ),
    );

  /**
   * Function to check if chunk size is a multiple of 1024 bytes (1 Kb)
   *
   * @param {number} chunkSize the size of one chunk
   *
   * @private
   * @internal
   */
  private _checkChunkSize = (chunkSize: number): void => {
    if (typeof chunkSize !== 'number' || chunkSize % this._oneKb !== 0) {
      throw new Error(
        'The size of a chunk must be a multiple of 1024 bytes / 1 Kb !!!',
      );
    }
  };

  /**
   * Helper to check the validity of the config object before setting it in instance property
   *
   * @param {Omit<RxFileUploadConfig, 'chunkSize' | 'addChecksum' | 'useChunks'>} config object to configure the xhr request
   *
   * @private
   * @internal
   */
  private _setAjaxConfig = (
    config: Omit<RxFileUploadConfig, 'chunkSize' | 'addChecksum' | 'useChunks'>,
  ): void => {
    // check if config's properties are allowed -> JS verification when not using typings
    Object.keys(config).forEach((_: string) => {
      if (!this._allowedConfigProperties.includes(_))
        throw new Error(
          `"${_}" isn't a valid property of "RxFileUploadConfig"`,
        );
    });

    // set configuration in class property after removing "content-type" header if exists
    // because the "body" will be a "FormData" so
    // a "content-type" of "multipart/form-data; boundary=----WebKitFormBoundary...." will be set automatically
    // and, after adding "method" and "includeUploadProgress" properties.
    this._config = {
      ...(!!config.headers
        ? {
            ...config,
            // remove content-type header if exists
            headers: Object.keys(config.headers)
              .filter((_: string) => _.toLowerCase() !== 'content-type')
              .reduce(
                (acc, curr) => ({ ...acc, [curr]: config.headers[curr] }),
                {},
              ),
          }
        : { ...config }),
      method: 'POST',
      includeUploadProgress: true,
    };
  };

  /**
   * Helper to calculate each chunk size
   *
   * @param {number} fileSize the size of the file to split on chunks
   *
   * @return {Observable<RxFileUploadChunkSize[]>} the Observable which streams the array of chunk size data
   *
   * @private
   * @internal
   */
  private _calculateChunkSizes = (
    fileSize: number,
  ): Observable<RxFileUploadChunkSize[]> =>
    from(
      Array.from(
        { length: Math.max(Math.ceil(fileSize / this._chunkSize), 1) },
        (_, offset: number) => offset++,
      ),
    ).pipe(
      map((offset: number) => ({
        startByte: offset * this._chunkSize,
        endByte: Math.min(fileSize, (offset + 1) * this._chunkSize),
      })),
      toArray(),
    );

  /**
   * Helper to calculate file checksum and return it as sha256 string
   *
   * @param {File} file the file to calculate the checksum
   *
   * @return {Observable<string>} the Observable which streams the file's sha256 checksum
   *
   * @private
   * @internal
   */
  private _calculateCheckSum = (file: File): Observable<string> =>
    from(file.arrayBuffer()).pipe(
      map((arrayBuffer: ArrayBuffer): string =>
        SHA256(WordArray.create(new Uint8Array(arrayBuffer))).toString(),
      ),
    );

  /**
   * Helper to serialize additional formData value
   *
   * @param data the value to serialize string or object
   *
   * @return {string} the serialized data
   *
   * @private
   * @internal
   */
  private _serialize = (data: any): string =>
    typeof data === 'string' ? data : JSON.stringify(data);
}

/**
 * Function to instantiate RxFileUpload
 *
 * @param {RxFileUploadConfig} config the object to create the new instance of RxFileUpload
 *
 * @return {RxFileUpload} new instance
 */
export const rxFileUpload = (config: RxFileUploadConfig): RxFileUpload =>
  new RxFileUploadCls(config);
