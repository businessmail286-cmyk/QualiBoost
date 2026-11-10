# -------------------------------------------------------------------------
# TorchVision / BasicSR compatibility shim
# In torchvision >= 0.15, torchvision.transforms.functional_tensor was removed.
# BasicSR 1.4.2 imports rgb_to_grayscale from torchvision.transforms.functional_tensor.
# Register torchvision.transforms.functional as functional_tensor in sys.modules.
# -------------------------------------------------------------------------
import sys
import torchvision.transforms.functional as tv_functional

if not hasattr(tv_functional, "rgb_to_grayscale"):
    raise AttributeError("torchvision.transforms.functional does not provide rgb_to_grayscale")

sys.modules.setdefault("torchvision.transforms.functional_tensor", tv_functional)
sys.modules["torchvision.transforms.functional_tensor"] = tv_functional

import os
import uuid
import shutil
import tempfile
import threading
import time
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image, UnidentifiedImageError

ROOT = Path(__file__).resolve().parent.parent
INFERENCE_SCRIPT = ROOT / "inference_realesrgan.py"
MAX_UPLOAD_BYTES = int(os.getenv("QUALIBOOST_MAX_UPLOAD_MB", "15")) * 1024 * 1024
ALLOWED_MODELS = {
    "RealESRGAN_x4plus",
    "RealESRGAN_x4plus_anime_6B",
    "RealESRGAN_x2plus",
    "realesr-general-x4v3",
}

app = FastAPI(
    title="QualiBoost Image Enhancement API",
    version="1.0.0",
    description="Local/server API wrapper for the Real-ESRGAN inference script.",
)

# CORS configuration - default to allow all origins when credentials are not used
origins_setting = os.getenv("QUALIBOOST_ALLOWED_ORIGINS", "*").strip()
if origins_setting == "*" or not origins_setting:
    cors_origins = ["*"]
else:
    cors_origins = [item.strip() for item in origins_setting.split(",") if item.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.run\.app|https://.*\.trycloudflare\.com|http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# In-memory job store (simple, suitable for single-process deployment)
# Each job: {job_id: {"status": str, "progress": int, "error": Optional[str], "result_path": Optional[Path], "created_at": float, "updated_at": float}}
jobs: dict = {}


def validate_scale(scale: int) -> None:
    if scale not in (2, 3, 4):
        raise HTTPException(status_code=400, detail="Scale must be 2, 3, or 4.")


def validate_model(model: str) -> None:
    if model not in ALLOWED_MODELS:
        raise HTTPException(status_code=400, detail="Unsupported model selected.")


def cleanup_old_jobs():
    """Remove jobs older than 24 hours to prevent memory growth."""
    now = time.time()
    to_remove = []
    for job_id, job in jobs.items():
        if now - job.get("created_at", 0) > 86400:
            to_remove.append(job_id)
    for job_id in to_remove:
        # Clean up temp dir if present
        job = jobs.pop(job_id, None)
        if job and job.get("temp_dir"):
            shutil.rmtree(job["temp_dir"], ignore_errors=True)


def process_enhance_job(job_id: str, file_bytes: bytes, scale: int, model: str):
    """Background worker that runs Real-ESRGAN inference with live progress tracking."""
    job = jobs[job_id]
    job["status"] = "processing"
    job["progress"] = 5
    job["progress_label"] = "Preparing image workspace..."
    job["updated_at"] = time.time()

    temp_dir = Path(tempfile.mkdtemp(prefix="qualiboost_job_"))
    job["temp_dir"] = str(temp_dir)
    input_path = temp_dir / "input.png"
    output_dir = temp_dir / "output"
    output_dir.mkdir(exist_ok=True)

    try:
        # Save input image
        with open(input_path, "wb") as f:
            f.write(file_bytes)

        # Validate image content using PIL
        try:
            from io import BytesIO
            with Image.open(BytesIO(file_bytes)) as check:
                check.verify()
            with Image.open(BytesIO(file_bytes)) as opened:
                if opened.format not in ("JPEG", "PNG", "WEBP", "BMP", "TIFF"):
                    raise HTTPException(status_code=415, detail="Use a JPG, PNG, WEBP, BMP, or TIFF image.")
                image = opened.convert("RGBA" if "A" in opened.getbands() else "RGB")
                # Save as PNG for the inference script
                image.save(input_path, format="PNG")
        except HTTPException:
            raise
        except (UnidentifiedImageError, OSError, ValueError) as e:
            raise HTTPException(status_code=415, detail=f"The uploaded file is not a valid supported image: {e}")

        job["progress"] = 10
        job["progress_label"] = "Launching Real-ESRGAN engine..."
        job["updated_at"] = time.time()

        # Run Real-ESRGAN inference script with -u for unbuffered stdout
        command = [
            sys.executable,
            "-u",
            str(INFERENCE_SCRIPT),
            "-n", model,
            "-i", str(input_path),
            "-o", str(output_dir),
            "-s", str(scale),
            "--ext", "png",
            "--fp32",
        ]

        import subprocess as sp
        timeout_seconds = int(os.getenv("QUALIBOOST_PROCESS_TIMEOUT_SECONDS", "600"))
        start_proc_time = time.time()

        proc = sp.Popen(
            command,
            cwd=str(ROOT),
            stdout=sp.PIPE,
            stderr=sp.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True,
        )

        stdout_lines = []
        for line in iter(proc.stdout.readline, ''):
            stdout_lines.append(line)
            line_str = line.strip()
            if line_str.startswith("PROGRESS:"):
                parts = line_str.split(":", 2)
                if len(parts) >= 2:
                    try:
                        pct = max(0, min(99, int(parts[1])))
                        job["progress"] = pct
                        if len(parts) > 2 and parts[2]:
                            job["progress_label"] = parts[2]
                        job["updated_at"] = time.time()
                    except ValueError:
                        pass
            if time.time() - start_proc_time > timeout_seconds:
                proc.kill()
                raise HTTPException(status_code=504, detail="Image processing timed out. Try a smaller image.")

        proc.stdout.close()
        return_code = proc.wait()

        if return_code != 0:
            details = "".join(stdout_lines)[-3000:]
            raise HTTPException(
                status_code=500,
                detail=f"Real-ESRGAN could not process this image. Check that dependencies and model weights are available. Error: {details}",
            )

        # Find result file
        result_path = output_dir / "input_out.png"
        if not result_path.is_file():
            candidates = list(output_dir.glob("*.png"))
            if not candidates:
                raise HTTPException(
                    status_code=500,
                    detail="No output image was produced. Real-ESRGAN output captured but no PNG found.",
                )
            result_path = candidates[0]

        job["status"] = "completed"
        job["result_path"] = str(result_path)
        job["progress"] = 100
        job["progress_label"] = "Image enhancement complete"
        job["completed_at"] = time.time()
    except HTTPException:
        job["status"] = "failed"
        job["error"] = HTTPException.__dict__.get("detail", "Unknown error")
        raise
    except Exception as e:
        job["status"] = "failed"
        job["error"] = str(e)
    finally:
        job["updated_at"] = time.time()


def subprocess_run_with_timeout(cmd, cwd, timeout):
    """Run subprocess with timeout, returning the CompletedProcess."""
    import subprocess as sp
    # Run in a thread with timeout
    result = {}

    def target():
        try:
            result["proc"] = sp.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        except sp.TimeoutExpired:
            result["proc"] = None  # signal timeout

    thread = threading.Thread(target=target, daemon=True)
    thread.start()
    thread.join(timeout=timeout + 10)  # give a little extra time

    if thread.is_alive():
        # Thread still running after timeout
        raise TimeoutError("Process timed out")

    if result.get("proc") is None:
        raise TimeoutError("Process timed out")

    return result["proc"]


def background_process_job(job_id: str, file_bytes: bytes, scale: int, model: str):
    """Run the job processing in a background thread."""
    try:
        process_enhance_job(job_id, file_bytes, scale, model)
    except HTTPException as e:
        # This is expected - just update job status
        if job_id in jobs:
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["error"] = e.detail
    except Exception as e:
        if job_id in jobs:
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["error"] = str(e)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "engine_source_found": INFERENCE_SCRIPT.is_file(),
        "active_jobs": len(jobs),
        "message": "API is running. Use POST /api/jobs/enhance to submit enhancement jobs.",
    }


@app.post("/api/jobs/enhance")
async def create_enhance_job(
    file: UploadFile = File(...),
    scale: int = Form(4),
    model: str = Form("RealESRGAN_x4plus"),
):
    """Submit an image enhancement job. Returns HTTP 202 with job ID."""
    validate_scale(scale)
    validate_model(model)

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Image is too large. Maximum upload size is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
        )

    # Validate content type/size at ingestion
    try:
        from io import BytesIO
        with Image.open(BytesIO(raw)) as check:
            check.verify()
        with Image.open(BytesIO(raw)) as opened:
            if opened.format not in ("JPEG", "PNG", "WEBP", "BMP", "TIFF"):
                raise HTTPException(status_code=415, detail="Use a JPG, PNG, WEBP, BMP, or TIFF image.")
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(status_code=415, detail="The uploaded file is not a valid supported image.")

    # Generate unique job ID
    job_id = str(uuid.uuid4())

    # Initialize job state
    jobs[job_id] = {
        "status": "queued",
        "progress": 0,
        "created_at": time.time(),
        "updated_at": time.time(),
    }

    # Start background worker thread
    thread = threading.Thread(
        target=background_process_job,
        args=(job_id, raw, scale, model),
        daemon=True,
    )
    thread.start()

    return {
        "job_id": job_id,
        "status": "queued",
        "message": "Enhancement job submitted. Use GET /api/jobs/{job_id} to check status.",
    }


@app.get("/api/jobs/{job_id}")
def get_job_status(job_id: str):
    """Check the status of an enhancement job."""
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    response = {
        "job_id": job_id,
        "status": job["status"],
        "progress": job.get("progress", 0),
        "progress_label": job.get("progress_label"),
    }
    if job.get("error"):
        response["error"] = job["error"]
    if job.get("result_path"):
        response["result_path"] = job["result_path"]
    if job.get("completed_at"):
        response["completed_at"] = job["completed_at"]

    return response


@app.get("/api/jobs/{job_id}/result")
def get_job_result(job_id: str):
    """Get the enhanced image result for a completed job."""
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    if job["status"] != "completed":
        if job["status"] == "failed":
            raise HTTPException(status_code=500, detail=job.get("error", "Job failed"))
        raise HTTPException(status_code=202, detail="Job still processing. Poll /api/jobs/{job_id} for status.")

    result_path = Path(job["result_path"])
    if not result_path.is_file():
        raise HTTPException(status_code=500, detail="Result file no longer available.")

    return FileResponse(
        path=str(result_path),
        media_type="image/png",
        filename="qualiboost-enhanced.png",
        headers={"Cache-Control": "no-store"},
    )


# Startup cleanup of old jobs
@app.on_event("startup")
def on_startup():
    # Run cleanup once on startup
    cleanup_old_jobs()
    # Schedule periodic cleanup (simple approach - in production use proper scheduler)
    # For now, just ensure the function is available
