"""
QualiBoost — Real-ESRGAN Inference Backend
FastAPI server implementing the QualiBoost image enhancement contract:
- GET /health -> {"status": "ok"}
- POST /api/enhance -> multipart/form-data with 'file' and 'scale' (2 or 4)
Returns processed image as binary image/png.
"""

import io
import os
import sys
import logging
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import numpy as np
from PIL import Image

# Setup logging (do not log image contents or secrets)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("qualiboost-backend")

app = FastAPI(
    title="QualiBoost Real-ESRGAN Backend",
    description="Professional Super-Resolution and Image Restoration Inference Service",
    version="1.0.0"
)

# Configure CORS for frontend access
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    os.getenv("FRONTEND_ORIGIN", "*")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Maximum upload limit: 25 MB
MAX_FILE_SIZE = 25 * 1024 * 1024
SUPPORTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]

# Global Real-ESRGAN models cache
esrgan_models = {}

def get_upsampler(scale: int = 4, model_name: str = "RealESRGAN_x4plus"):
    """
    Initializes and returns RealESRGANer instance for the requested scale factor and model.
    Supports scale 2, 3, and 4.
    """
    if scale not in (2, 3, 4):
        raise ValueError(f"Unsupported scale factor: {scale}. Must be 2, 3, or 4.")

    cache_key = (model_name, scale)
    if cache_key in esrgan_models:
        return esrgan_models[cache_key]

    try:
        import torch
        from basicsr.archs.rrdbnet_arch import RRDBNet
        from realesrgan import RealESRGANer

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Loading Real-ESRGAN model={model_name} for scale={scale} on device={device}...")

        if "x2" in model_name or scale == 2:
            model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=2)
            model_url = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth"
            weight_file = "RealESRGAN_x2plus.pth"
            base_scale = 2
        else:
            model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
            model_url = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth"
            weight_file = "RealESRGAN_x4plus.pth"
            base_scale = 4

        model_path = os.path.join(os.path.dirname(__file__), "weights", weight_file)
        os.makedirs(os.path.dirname(model_path), exist_ok=True)

        if not os.path.exists(model_path):
            logger.info(f"Downloading model weights from {model_url}...")
            import urllib.request
            urllib.request.urlretrieve(model_url, model_path)

        upsampler = RealESRGANer(
            scale=base_scale,
            model_path=model_path,
            model=model,
            tile=400,
            tile_pad=10,
            pre_pad=0,
            half=torch.cuda.is_available(),
            device=device,
        )
        esrgan_models[cache_key] = upsampler
        return upsampler
    except Exception as e:
        logger.error(f"Failed to load Real-ESRGAN model: {e}")
        raise e


@app.get("/health")
async def health_check():
    """
    Health check endpoint conforming to the QualiBoost contract.
    Returns: {"status": "ok"}
    """
    return {"status": "ok"}


@app.post("/api/enhance")
async def enhance_image(
    file: UploadFile = File(..., description="Binary image file to upscale"),
    scale: int = Form(4, description="Target upscale factor (2, 3, or 4)"),
    model: str = Form("RealESRGAN_x4plus", description="Real-ESRGAN model name")
):
    """
    Inference endpoint conforming to the QualiBoost contract.
    Expects multipart/form-data:
      - 'file': binary image file (JPG, PNG, WebP)
      - 'scale': 2, 3, or 4
      - 'model': Real-ESRGAN model (e.g., RealESRGAN_x4plus)
    Returns:
      Binary PNG image bytes with Content-Type: image/png
    """
    if scale not in (2, 3, 4):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported scale factor: {scale}. Supported scale values are 2, 3, and 4."
        )

    # Validate Content-Type
    if file.content_type not in SUPPORTED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{file.content_type}'. Please upload JPEG, PNG, or WebP."
        )

    # Read binary bytes
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE // (1024 * 1024)} MB."
        )

    try:
        # Decode image using PIL / OpenCV
        pil_image = Image.open(io.BytesIO(contents))
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")
        
        cv_image = np.array(pil_image)
        # Convert RGB to BGR for OpenCV / Real-ESRGAN
        cv_image = cv_image[:, :, ::-1]
    except Exception as e:
        logger.error(f"Failed to decode uploaded image: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Corrupted or invalid image file. Please provide a valid photographic image."
        )

    try:
        # Run real inference
        upsampler = get_upsampler(scale=scale, model_name=model)
        output, _ = upsampler.enhance(cv_image, outscale=scale)

        # Convert back BGR to RGB for PIL export
        output_rgb = output[:, :, ::-1]
        out_pil = Image.fromarray(output_rgb)

        output_buffer = io.BytesIO()
        out_pil.save(output_buffer, format="PNG", compress_level=4)
        output_bytes = output_buffer.getvalue()

        logger.info(
            f"Successfully upscaled image ({cv_image.shape[1]}x{cv_image.shape[0]} -> {out_pil.width}x{out_pil.height}) at {scale}x scale."
        )

        return Response(
            content=output_bytes,
            media_type="image/png",
            headers={
                "Content-Type": "image/png",
                "X-Upscale-Factor": str(scale),
                "X-Output-Width": str(out_pil.width),
                "X-Output-Height": str(out_pil.height),
            }
        )
    except Exception as e:
        logger.error(f"Inference error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Real-ESRGAN inference failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
