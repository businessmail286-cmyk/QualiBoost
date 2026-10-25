# QualiBoost — Real-ESRGAN Backend Service

This directory contains the production-ready Python FastAPI backend for QualiBoost's image enhancement and super-resolution engine powered by Real-ESRGAN.

## Requirements

- Python 3.10+
- PyTorch 2.0+
- CUDA (optional, CPU mode is automatically supported)

## Installation

1. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Server

Start the service on port 8000:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

The service will automatically download the pretrained Real-ESRGAN model weights (`RealESRGAN_x2plus.pth` and `RealESRGAN_x4plus.pth`) into the `weights/` directory on first inference.

## API Contract

### Health Check
- **Endpoint**: `GET /health`
- **Response**: `{"status": "ok"}`

### Image Enhancement
- **Endpoint**: `POST /api/enhance`
- **Request**: `multipart/form-data`
  - `file`: binary image file (JPG, PNG, WebP)
  - `scale`: integer (`2`, `3`, or `4`)
  - `model`: string (`RealESRGAN_x4plus`)
- **Response**: Binary image data (`image/png`) with headers:
  - `Content-Type: image/png`
  - `X-Upscale-Factor: [scale]`
  - `X-Output-Width: [width]`
  - `X-Output-Height: [height]`

## Frontend Configuration

In your frontend root, configure `.env`:
```env
VITE_QUALIBOOST_API_URL="http://127.0.0.1:8000"
```
Or use the pre-configured Vite development proxy which automatically routes `/api` and `/health` requests to `http://127.0.0.1:8000`.
