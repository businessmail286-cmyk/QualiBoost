
# QualiBoost + Real-ESRGAN backend wrapper

This folder adds a small HTTP API around the existing Real-ESRGAN command-line inference script. It does not modify the original frontend (the frontend project was not included in the ZIP provided).

## What it provides

- `GET /health` — checks that the API starts and the inference script exists.
- `POST /api/enhance` — accepts multipart form fields `file`, optional `scale` (2, 3, or 4), and optional `model`; responds with the enhanced PNG.
- Validates the uploaded image content and enforces a 15 MB default upload limit.
- Uses a temporary folder per request and removes it after processing.
- Restricts browser origins using `QUALIBOOST_ALLOWED_ORIGINS`.

## Windows quick start

1. Install Python 3.10 or 3.11 (64-bit) and ensure the Python launcher `py` works in Command Prompt.
2. Open this `qualiboost_backend` folder in File Explorer.
3. Double-click `run_windows.bat`. It installs the API wrapper dependencies and starts the API at `http://127.0.0.1:8000`.
4. Open `http://127.0.0.1:8000/docs` to try the endpoint.
5. On the first enhancement, Real-ESRGAN may download its model weights automatically. Internet access is needed. If the download fails, read the upstream Real-ESRGAN README and obtain the model weights from the official project release links.

## Important: engine dependencies

The API wrapper dependencies are separate from the Real-ESRGAN engine dependencies. The original project's requirements may need to be installed into the same Python environment. If the inference script reports missing modules (for example `torch`, `basicsr`, `realesrgan`, or `cv2`), install the engine requirements from the project root:

```bat
cd ..
py -m pip install -r requirements.txt
```

For some Windows/Python combinations, PyTorch and BasicSR may require version-specific setup. Follow the official Real-ESRGAN repository instructions if installation fails. GPU acceleration is optional; CPU processing may be slow.

## Connect the existing QualiBoost interface

The existing Google AI Studio frontend was not part of the supplied ZIP, so its button cannot be patched automatically in this archive. In the existing frontend's Enhance Image handler, send the selected file to this endpoint:

```js
const body = new FormData();
body.append("file", selectedFile); // the actual File object from the upload input
body.append("scale", "4");
body.append("model", "RealESRGAN_x4plus");

const response = await fetch("http://127.0.0.1:8000/api/enhance", {
  method: "POST",
  body,
});

if (!response.ok) {
  const error = await response.json().catch(() => ({}));
  throw new Error(error.detail || "Image enhancement failed");
}

const enhancedBlob = await response.blob();
const enhancedUrl = URL.createObjectURL(enhancedBlob);
// Set enhancedUrl as the enhanced result preview/download URL in your existing UI.
```

Do not manually set the `Content-Type` header when sending `FormData`; the browser adds the multipart boundary.

### Local versus public website

`127.0.0.1` points to the visitor's own computer. It works only when the API is running on that same computer, so it is not a public deployment URL. For a public QualiBoost website, deploy this Python API to a server that supports the engine and configure the frontend to use that server's HTTPS URL. Add the exact frontend origin to `QUALIBOOST_ALLOWED_ORIGINS`. GPU hosting may cost money; free services can have sleep, memory, runtime, or CPU limits.

## API request fields

- `file`: required image file
- `scale`: `2`, `3`, or `4` (default `4`)
- `model`: `RealESRGAN_x4plus` (default), `RealESRGAN_x4plus_anime_6B`, `RealESRGAN_x2plus`, or `realesr-general-x4v3`

