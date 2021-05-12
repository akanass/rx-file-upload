# Rx-File-Upload

![npm type definitions](https://img.shields.io/npm/types/typescript?style=for-the-badge)
![npm (scoped)](https://img.shields.io/npm/v/@akanass/rx-file-upload?logo=npm&style=for-the-badge&color=red)
![Browser Support](https://img.shields.io/badge/Browser-ES5+-brightgreen?style=for-the-badge)

Library to upload a file in the browser and send it fully or in several chunks to the server.

All the implementation is done in [Typescript](https://www.typescriptlang.org/) and is based on the latest version of [RxJS](https://rxjs.dev/).

This library can only be used in browsers because its functionalities are based on specific elements such as [FormData](https://developer.mozilla.org/fr/docs/Web/API/FormData) and [XMLHttpRequest](https://developer.mozilla.org/fr/docs/Web/API/XMLHttpRequest).

However, we provide a [method](#supportsrxfileupload) that will allow you to **easily verify** if you are in a **compatible environment** before performing your treatments. This can be very useful in the case of components rendered on the server side (SSR).

## Table of contents

* [Installation](#installation)
    * [UMD](#umd)
* [Usage](#usage)
* [API in Details](#api-in-details)
  * [rxFileUpload(config)](#rxfileuploadconfig)
  * [.progress$](#progress)
  * [.upload\<T\>(oneFileOrMultipleFiles[,additionalFormData])](#uploadtonefileormultiplefilesadditionalformdata)
    * [Data sent in the FormData](#data-sent-in-the-formdata)
  * [supportsRxFileUpload()](#supportsrxfileupload)
* [Types in Details](#types-in-details)
  * [RxFileUpload](#rxfileupload)
  * [RxFileUploadConfig](#rxfileuploadconfig-1)
  * [RxFileUploadAdditionalFormData](#rxfileuploadadditionalformdata)
  * [RxFileUploadProgressData](#rxfileuploadprogressdata)
  * [RxFileUploadResponse\<T\>](#rxfileuploadresponset)
  * [RxFileUploadError](#rxfileuploaderror)
* [Building for Production](#building-for-production)
    * [ES5](#es5)
    * [ESNEXT](#esnext)
        * [Webpack support](#webpack-support)
        * [Rollup support](#rollup-support)
* [License](#license)

## Installation

This package is available on **npm**:

```bash
$> npm install @akanass/rx-file-upload rxjs

or 

$> yarn add @akanass/rx-file-upload rxjs
```

### UMD

This package can also be installed via **unpkg** by including the following script in your page's `<head>` element. The library's methods will be available on the global **`RxFileUploadUnPkg`** object.

```html
<script src="https://unpkg.com/@akanass/rx-file-upload"></script>
```

[back to top](#table-of-contents)

## Usage

You must first have an HTML file containing an [input of type file](https://developer.mozilla.org/fr/docs/Web/HTML/Element/Input/file).

In our example, we will allow the selection of several `PDF` type files or any `image`:

```html
<input id="input-file" type="file" accept="application/pdf,image/*" multiple />
```

Then, in your **Typescript** file, you can use the library like this:

```ts
// import library elements
import { rxFileUpload, RxFileUpload, RxFileUploadError, RxFileUploadProgressData, RxFileUploadResponse } from '@akanass/rx-file-upload';
import { Subscription } from 'rxjs';

// create variables to store rxjs subscriptions
let progressSubscription: Subscription;
let uploadSubscription: Subscription;

// get HTML element
const inputFile: HTMLInputElement = document.querySelector(
  '#input-file',
);

// set listener to clean previous files selection
inputFile.addEventListener(
  'click',
  (e: Event) => (e.target['value'] = null),
);

// set listener to upload files
inputFile.addEventListener('change', (e: Event) => {
  // get file list
  const fileList: FileList = e.target['files'];

  // build files array
  const files: Files[] = Array.from(
    { length: fileList.length },
    (_, idx: number) => idx++,
  ).map((i: number) => fileList.item(i));

  // delete previous subscriptions to memory free
  if (!!uploadSubscription) {
    uploadSubscription.unsubscribe();
  }
  if (!!progressSubscription) {
    progressSubscription.unsubscribe();
  }

  // create new instance of RxFileUpload
  const manager: RxFileUpload = rxFileUpload({
    url: 'http://my_api.com/upload'
  });

  // listen on progress to update UI
  progressSubscription = manager.progress$.subscribe({
    next: (_: RxFileUploadProgressData) => {
      // log progress data in the console
      console.log(_);
      // do some UI update based on progress data 
      // updateProgressUI(_);
    },
    complete: () => console.log('PROGRESS ALL FILES COMPLETED'),
  });

  // upload file
  uploadSubscription = manager
    .upload<any>(files)
    .subscribe({
      next: (_: RxFileUploadResponse<any>) => {
        // log server answer in the console
        console.log(_);
        // do some UI update based on server data 
        // updateUI(_);
      },
      error: (e: RxFileUploadError | Error) => {
        // display error in the console
        console.error(e);
        // do some UI update based on error data 
        // updateUIWithError(e);
      },
      complete: () => console.log('UPLOAD ALL FILES COMPLETED'),
    });
});
```

You just have to **compile** your file and insert it in a `script` tag of your **HTML** and you're done.

Of course, you can use **JavaScript** language to create your script file but in this case the **types** will not be available as in the previous example and you will just have to import the method allowing to create the instance of the library.

```ts
import { rxFileUpload } from '@akanass/rx-file-upload';
```

To have a real implementation and test of this library, go to this [project](https://github.com/akanass/upload-file-with-chunks).

[back to top](#table-of-contents)

## API in Details

### `rxFileUpload(config)`

Create a new instance of `RxFileUpload`. An error will be thrown if you aren't in a `browser` environment.

**Parameter:**
> ***{[RxFileUploadConfig](#rxfileuploadconfig-1)} config**: object with only `url` member required.*

**Return:**
> ***{[RxFileUpload](#rxfileupload)}** new instance of `RxFileUpload` with the given configuration.*

**Example:**
```ts
import { rxFileUpload, RxFileUpload } from '@akanass/rx-file-upload';

// create new instance of RxFileUpload
const manager: RxFileUpload = rxFileUpload({
  url: 'http://my_api.com/upload'
});
```

[back to top](#table-of-contents)

### `.progress$`

Progress `Observable` which streams progress data for each file(s)/chunk(s) uploaded.

**Return:**
> ***{Observable\<[RxFileUploadProgressData](#rxfileuploadprogressdata)\>}** the `Observable` which streams progress data `RxFileUploadProgressData` for each file(s)/chunk(s) uploaded.*
 
**Example:**
```ts
import { rxFileUpload, RxFileUpload, RxFileUploadProgressData } from '@akanass/rx-file-upload';

// create new instance of RxFileUpload
const manager: RxFileUpload = rxFileUpload({
  url: 'http://my_api.com/upload'
});

// subscribe to progress stream
manager.progress$.subscribe({
  next: (_: RxFileUploadProgressData) => {
    // log progress data in the console
    console.log(_);
    // do some UI update based on progress data 
    // updateProgressUI(_);
  },
  complete: () => console.log('PROGRESS ALL FILES COMPLETED'),
});
```

[back to top](#table-of-contents)

### `.upload<T>(oneFileOrMultipleFiles[,additionalFormData])`

Function to upload **one** or **multiple** files, with or without chunks, to the server with **optional** additional data and returns the `Observable` which streams the response from the server after each file has been uploaded.

> NOTES:
> 
> This function will do a `POST` request to the server by default. Only `POST` and `PUT` requests are allowed. See [RxFileUploadConfig](#rxfileuploadconfig-1) to change the `method`.
> 
> For each uploaded file, a **unique** identifier will be inserted in the `X-RxFileUpload-ID` **header** and in the `rxFileUploadId` attribute of the [FormData](#data-sent-in-the-formdata) in order to be able to trace the transaction.
> This **unique** value will be present in **all new requests** and will be, of course, the **same** when sending the file in several **chunks**.
> You can therefore associate them easily with their main file without having to look at the additional data inserted in the [FormData](#data-sent-in-the-formdata).

**Parameters:**
> ***{File | File[]} oneFileOrMultipleFiles** (required): the file(s) to upload to the server.*
> 
> ***{[RxFileUploadAdditionalFormData](#rxfileuploadadditionalformdata)} additionalFormData** (optional): object representing additional data added in the `FormData` before sending to the server.*

**Return:**
> ***{Observable\<[RxFileUploadResponse\<T\>](#rxfileuploadresponset)\>}** the `Observable` which streams the response `RxFileUploadResponse<T>`, from the server, after each file has been uploaded. `<T>` is a generic value that corresponds to the type of the response sent by the server.*

**Example:**
```ts
import { rxFileUpload, RxFileUpload, RxFileUploadResponse, RxFileUploadError } from '@akanass/rx-file-upload';

// create new instance of RxFileUpload
const manager: RxFileUpload = rxFileUpload({
  url: 'http://my_api.com/upload'
});

// subscribe to upload stream
manager.upload<any>(files)
  .subscribe({
    next: (_: RxFileUploadResponse<any>) => {
      // log server answer in the console
      console.log(_);
      // do some UI update based on server data 
      // updateUI(_);
    },
    error: (e: RxFileUploadError | Error) => {
      // display error in the console
      console.error(e);
      // do some UI update based on error data 
      // updateUIWithError(e);
    },
    complete: () => console.log('UPLOAD ALL FILES COMPLETED'),
});
```

#### Data sent in the FormData

The data sent to the server will be included in a `FormData` object of which here are the details:

```ts
// data object built and inserted in a FormData object
const data: any = {
  rxFileUploadId: [string], // unique identifier used to identify a transaction. This value is the same as in the `X-RxFileUpload-ID` header.
  fileData: {
    name: [File.name], // name property of the current file to upload
    size: [File.size], // size property of the current file to upload
    lastModified: [File.lastModified], // lastModified property of the current file to upload
    type: [File.type], // type property of the current file to upload
    sha256Checksum?: [checksum] // generated only if config.addChecksum === true
  },
  [additionalFormData.fieldName]?: [additionalFormData.data], // generated only if `additionalFormData` object is passed in parameter of the upload method
  chunkData?: { // generated only if config.useChunks === true
    sequence: [number], // the current chunk number
    totalChunks: [number], // the total number of chunks
    startByte: [number], // the start byte number of the chunk
    endByte: [number] // the end byte number of the chunk
  },
  file: [File], // the file object to upload which is the binary data. For a file upload, it's the file itself and for chunks upload, it's the chunk part split as the sequence described in chunkData
};

// FormData instance
const formData = new FormData();

formData.append('rxFileUploadId', data.rxFileUploadId);
formData.append('fileData', JSON.stringify(data.fileData));
formData.append('[additionalFormData.fieldName]', JSON.stringify(data['[additionalFormData.fieldName]'])); // optional
formData.append('chunkData', JSON.stringify(data.chunkData)); // optional
formData.append('file', data.file);
```

[back to top](#table-of-contents)

### `supportsRxFileUpload()`

Method that will allow you to **easily verify** if you are in a **compatible environment** before performing your treatments.

This can be very useful in the case of components rendered on the server side (SSR).

This method is called when you instantiate `RxFileUpload` and **throw an error** if you can't use the library.

**Return:**
> ***{boolean}** the flag to know if we can use `RxFileUpload` library.*

**Example:**
```ts
import { supportsRxFileUpload } from '@akanass/rx-file-upload';

// check if the library is supported
if (!!supportsRxFileUpload()) {
  // then do your stuff
}
```

[back to top](#table-of-contents)

## Types in Details

### *RxFileUpload:*

Represents the instance of the object to upload file to the server. This is the **main** type of the library.

> - ***{Observable\<[RxFileUploadProgressData](#rxfileuploadprogressdata)\>} .progress$**: the `Observable` which streams progress data `RxFileUploadProgressData` for each file(s)/chunk(s) uploaded.*
> 
> - ***{Observable<[RxFileUploadResponse\<T\>](#rxfileuploadresponset)>} .upload\<T\>(oneFileOrMultipleFiles: File | File[], additionalFormData?: [RxFileUploadAdditionalFormData](#rxfileuploadadditionalformdata))**: the function to upload file to the server and returns the `Observable` which streams the response `RxFileUploadResponse<T>`, from the server, after each file has been uploaded.*

### *RxFileUploadConfig:*

Represents the object to configure a new instance of [`RxFileUpload`](#rxfileuploadconfig-1) with the [`rxFileUpload(config)`](#rxfileuploadconfig) method.

> - ***{string} url** (required): The address of the resource to request via HTTP. An error will be thrown if you don't provide it.*
> 
> - ***{string} method** (optional): The HTTP Method to use for the request. Only `POST` and `PUT` are allowed. (default: `POST`).*
> 
> - ***{Readonly\<Record\<string, any\>\>} headers** (optional): The HTTP headers to apply. **NOTE**: `Content-Type` header must not be included because it will be automatically added by the library with the good value.*
> 
> - ***{number} timeout** (optional): The time to wait before causing the underlying `XMLHttpRequest` to timeout. (default: `0`, which is idiomatic for `never timeout`).*
> 
> - ***{string} user** (optional): The user credentials username to send with the HTTP request. (default: `undefined`).*
> 
> - ***{string} password** (optional): The user credentials password to send with the HTTP request. (default: `undefined`).*
> 
> - ***{boolean} crossDomain** (optional): Whether to send the HTTP request as a CORS request. (default: `false`).*
> 
> - ***{boolean} withCredentials** (optional): To send user credentials in a CORS request, set to `true`. To exclude user credentials from a CORS request, OR when cookies are to be ignored by the CORS response, set to `false`. (default: `false`).*
> 
> - ***{string} xsrfCookieName** (optional): The name of your site's `XSRF` cookie. (default: `undefined`).*
> 
> - ***{string} xsrfHeaderName** (optional): The name of a custom header that you can use to send your `XSRF` cookie. (default: `undefined`).*
> 
> - ***{XMLHttpRequestResponseType} responseType** (optional): Can be set to change the response type. Valid values are `"arraybuffer"`, `"blob"`, `"document"`, `"json"`, and `"text"`. Note that the type of `"document"` (such as an XML document) is ignored if the global context is not `Window`. (default: `"json"`).*
> 
> - ***{string | URLSearchParams | Record\<string, string | number | boolean | string[] | number[] | boolean[]\> | [string, string | number | boolean | string[] | number[] | boolean[]][]} queryParams** (optional): Query string parameters to add to the URL in the request. (This will require a polyfill for URL and URLSearchParams in Internet Explorer!). Accepts either a query string, a `URLSearchParams` object, a dictionary of key/value pairs, or an array of key/value entry tuples. (Essentially, it takes anything that new `URLSearchParams` would normally take). If, for some reason you have a query string in the url argument, this will append to the query string in the url, but it will also overwrite the value of any keys that are an exact match. In other words, an url of `/test?a=1&b=2`, with queryParams of `{ b: 5, c: 6 }` will result in a url of roughly `/test?a=1&b=5&c=6`. (default: `undefined`).*
> 
> - ***{boolean} useChunks** (optional): The flag to indicate if the file(s) should be split into several chunks before sending to the server and not sending the full file. (default: `false`).*
> 
> - ***{number} chunkSize** (optional): The size in `bytes` of a chunk. The size of a chunk must be a multiple of `1024` bytes (1 Kb) else an error will be thrown when the library is instantiated. (default: `1048576` (1 Mb)).*
> 
> - ***{boolean} addChecksum** (optional): The flag to indicate if the file(s) `sha256 checksum` should be calculated before sending to the server. However, you should know that the larger the file, the longer the generation time will be, which will cause a delay before sending it to the server. (default: `false`).*
>
> - ***{boolean} disableProgressCompletion** (optional): The flag to indicate if the [`.progress$`](#progress) Observable completion will be disabled at the end of the upload process. If you want to keep the same instance of [`RxFileUpload`](#rxfileupload) and use the [`.upload<T>(oneFileOrMultipleFiles[,additionalFormData])`](#uploadtonefileormultiplefilesadditionalformdata) method several times without having to subscribe again to the [`.progress$`](#progress) Observable, you must therefore deactivate its completion. (default: `false`).*

### *RxFileUploadAdditionalFormData:*

Represents the object to add additional data inside the `FormData` before sending the file(s) to the server with the [`.upload<T>(oneFileOrMultipleFiles[,additionalFormData])`](#uploadtonefileormultiplefilesadditionalformdata) method.

> - ***{string} fieldName** (required): The key of the `FormData` key/pair data - `Read-Only`.*
> 
> - ***{string | object} data** (required): The value of the `FormData` key/pair data - `Read-Only`. This value will be automatically serialized, if it's an object, with a `JSON.stringify()`.*

### *RxFileUploadProgressData:*

Represents the object sent by the progress `Observable` when subscribing to the [`.progress$`](#progress) attribute.

> - ***{number} progress** (required): The current progress value for the upload of a file - `Read-Only`. It does not matter if the file is sent totally or in chunks, the value of progress will be calculated according to the type of send.*
> 
> - ***{number} fileIndex** (optional): The file index in the array of files for a multiple files upload - `Read-Only`. (default: `undefined`).*

### *RxFileUploadResponse\<T\>:*

Represents the response, from the server, streamed by the `Observable`, after each file has been uploaded, when subscribing to the [`.upload<T>(oneFileOrMultipleFiles[,additionalFormData])`](#uploadtonefileormultiplefilesadditionalformdata) method. `<T>` is a generic value that corresponds to the type of the response sent by the server.

> - ***{number} status** (required): The HTTP status code - `Read-Only`.*
> 
> - ***{T} response** (required): The response data, if any. Note that this will automatically be converted to the proper type - `Read-Only`.*
> 
> - ***{Record\<string, string\>} responseHeaders** (required): A dictionary of the response headers - `Read-Only`.*
> 
> - ***{number} fileIndex** (optional): The file index in the array of files for a multiple files upload - `Read-Only`. (default: `undefined`).*

### *RxFileUploadError:*

Represents the error response, from the server, streamed by the `Observable`, during each file upload, when subscribing to the [`.upload<T>(oneFileOrMultipleFiles[,additionalFormData])`](#uploadtonefileormultiplefilesadditionalformdata) method.

> - ***{number} status** (required): The HTTP status code, if the request has completed. If not, it is set to `0`.*
> 
> - ***{any} response** (required): The error response data.*

[back to top](#table-of-contents)

## Building for Production

Two unbundled versions of this library are offered for your convenience, one targeting `ES5` and a second targeting `ESNEXT`.

### *ES5:*

The `ES5` version is suitable for use when **deprecated browsers** like `IE10+` or `Edge Legacy` need to be supported. This version is also the **default** version that gets pulled in as the `"main"` entry in **package.json**.

**TypeScript** and **JavaScript** codebases alike can import and use this library without any special build configuration considerations.

However, you will need to ensure that the `tslib@^2.2.0` dependency gets pulled into your build artifact then you will need to install this package **manually** by adding it to `devDependencies` in your project's **package.json**:

```sh
$> npm install --save-dev tslib

or 

$> yarn add -D tslib
```

### *ESNEXT:*

The `ESNEXT` version is suitable for use when only **modern browsers** need to be supported. **TypeScript** and **JavaScript** codebases alike can import and use this library. However, you will need to ensure that your bundler pulls in the `ESNEXT` version of the library when building your application!

See bundler instructions below.

#### Webpack support

No matter the `"target"` of your build you'll need to indicate additional files for webpack to resolve via the [`"resolve.mainFields"`](https://webpack.js.org/configuration/resolve/#resolvemainfields) property in your config. Resolve the `"main:esnext"` field defined in **package.json**:

```js
module.exports = {
  //...
  resolve: {
    mainFields: [ 'main:esnext', 'module', 'main' ],
  },
};
```

`'main:esnext'` must come first in the list to ensure that the `ESNEXT` version of this library is bundled. Additional values can be added afterwards as needed.

#### Rollup support

Add the [`@rollup/plugin-node-resolve`](https://github.com/rollup/rollup-plugin-node-resolve#usage) plugin to your Rollup config to read in the `"main:esnext"` field from **package.json**:

```js
// rollup.config.js
import resolve from 'rollup-plugin-node-resolve';

export default {
  // input: ...
  // output: ...
  plugins: [
    //...
    resolve({ mainFields: [ 'main:esnext', 'module', 'main' ] }),
  ]
}
```

`'main:esnext'` must come first in the list to ensure that the `ESNEXT` version of this library is bundled. Additional values can be added afterwards as needed.

[back to top](#table-of-contents)

## License

This library is [MIT licensed](LICENSE.md).

[back to top](#table-of-contents)
