import { AjaxConfig, AjaxError, AjaxResponse } from 'rxjs/ajax';
import { Observable } from 'rxjs';

/**
 * RxFileUpload interface definition
 */
export interface RxFileUpload {
  /**
   * Progress Observable
   *
   * @return {Observable<RxFileUploadProgressData>} the Observable which streams progress data for each file(s)/chunk(s) uploaded
   */
  progress$: Observable<RxFileUploadProgressData>;

  /**
   * Function to upload one or multiple files to the server with optional additional data
   *
   * @param {File|File[]} oneFileOrMultipleFiles the file(s) to upload to the server
   * @param {RxFileUploadAdditionalFormData} additionalFormData sent to the server
   *
   * @return {Observable<RxFileUploadResponse<T>>} the Observable which streams the response from the server after each file has been uploaded
   */
  upload<T>(
    oneFileOrMultipleFiles: File | File[],
    additionalFormData?: RxFileUploadAdditionalFormData,
  ): Observable<RxFileUploadResponse<T>>;
}

/**
 * RxFileUploadConfig type declaration
 *
 * It's a copy of AjaxConfig without few fields and with new ones
 */
export type RxFileUploadConfig = Omit<
  AjaxConfig,
  | 'body'
  | 'async'
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
