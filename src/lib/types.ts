import { AjaxConfig, AjaxError, AjaxResponse } from 'rxjs/ajax';

/**
 * RxFileUploadConfig type declaration
 *
 * It's a copy of AjaxConfig without few fields and with new ones
 */
export type RxFileUploadConfig = Omit<
  AjaxConfig,
  | 'body'
  | 'async'
  | 'method'
  | 'createXHR'
  | 'progressSubscriber'
  | 'includeUploadProgress'
  | 'includeDownloadProgress'
> & { chunkSize?: number; addChecksum?: boolean; useChunks?: boolean };

/**
 * Additional FormData type definition
 */
export type RxFileUploadAdditionalFormData = {
  readonly fieldName: string;
  readonly data: any;
};

/**
 * Progress Observable data type definition
 */
export type RxFileUploadProgressData = {
  readonly progress: number;
  readonly fileIndex?: number;
};

/**
 * Upload Observable response type definition
 *
 * It's a copy of AjaxResponse without few fields and with new one
 */
export type RxFileUploadResponse<T> = Omit<
  AjaxResponse<T>,
  | 'responseType'
  | 'loaded'
  | 'total'
  | 'originalEvent'
  | 'xhr'
  | 'request'
  | 'type'
> & {
  readonly fileIndex?: number;
};

/**
 * Upload Observable error type definition
 *
 * It's a copy of AjaxError with only status and response fields
 */
export type RxFileUploadError = Omit<
  AjaxError,
  'xhr' | 'message' | 'name' | 'responseType' | 'request' | 'stack'
>;

/**
 * Chunk size type definition
 *
 * @internal
 */
export type RxFileUploadChunkSize = {
  readonly startByte: number;
  readonly endByte: number;
};

/**
 * Chunk sequence type definition
 *
 * @internal
 */
export type RxFileUploadChunkSequenceData = {
  readonly sequence: number;
  readonly totalChunks: number;
};

/**
 * Body form data type definition
 *
 * @internal
 */
export type RxFileUploadBodyData = {
  readonly formData: FormData;
  readonly data: any;
};

/**
 * Chunk body form data type definition
 *
 * @internal
 */
export type RxFileUploadChunkBodyData = RxFileUploadBodyData & {
  chunkSequenceData: RxFileUploadChunkSequenceData;
};

/**
 * Chunk form data type definition
 *
 * @internal
 */
export type RxFileUploadChunkFormData = Omit<RxFileUploadChunkBodyData, 'data'>;
