# Local PDF.js assets (optional)

This folder lets you self-host the [Mozilla pdf.js](https://github.com/mozilla/pdf.js) runtime when the app is used in environments that block CDN requests or strip Subresource Integrity headers.

Place copies of `pdf.min.js` and `pdf.worker.min.js` from the same pdf.js release inside this directory. When present, the app will prefer these files before falling back to CDN copies. Files should keep their original names:

```
vendor/pdfjs/pdf.min.js
vendor/pdfjs/pdf.worker.min.js
```

The repository does not include the binaries so you can decide which version to ship and keep the bundle lightweight. If neither local nor remote copies are reachable, the import workflow will show an error explaining that the PDF parser could not be loaded.
