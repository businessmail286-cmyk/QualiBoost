# QualiBoost Real-ESRGAN Backend Fixes

This package contains the verified compatibility and deployment fixes for the QualiBoost Real-ESRGAN backend deployed on Render.

## Summary of Fixes Included

1. **TorchVision Compatibility Shim** (`inference_realesrgan.py`, `inference_realesrgan_video.py`, `cog_predict.py`, `qualiboost_backend/app.py`):
   - In TorchVision >= 0.15, `torchvision.transforms.functional_tensor` was removed.
   - BasicSR 1.4.2 imports `rgb_to_grayscale` from `torchvision.transforms.functional_tensor`.
   - The shim registers `torchvision.transforms.functional` as `functional_tensor` in `sys.modules` before any BasicSR imports run.
   - Tested and verified with real `RealESRGAN_x4plus` enhancement (exit code 0, 128x128 PNG output).

2. **Python 3.11.17 Configuration** (`.python-version`, `render.yaml`):
   - Fixes the `KeyError: '__version__'` build crash on Render caused by Python 3.14.
   - Pins the Render pyenv runtime explicitly to `3.11.17`.

3. **CORS & CPU Dependency Pins** (`render.yaml`, `requirements.txt`, `qualiboost_backend/app.py`):
   - Allows cross-origin browser access from QualiBoost frontend preview domains.
   - Pins PyTorch 2.1.2 CPU, TorchVision 0.16.2 CPU, and NumPy <2.0.0.

---

## File Structure

```text
├── .python-version               <- Sets Python 3.11.17 for Render pyenv
├── render.yaml                   <- Render service config (Python 3.11.17, CPU build)
├── requirements.txt              <- Pinned CPU PyTorch, BasicSR 1.4.2, Real-ESRGAN
├── inference_realesrgan.py       <- Root inference script with TorchVision shim
├── inference_realesrgan_video.py <- Video inference script with TorchVision shim
├── cog_predict.py                <- Cog predictor script with TorchVision shim
├── README.md                     <- This instruction guide
└── qualiboost_backend/
    └── app.py                    <- FastAPI server with CORS & compatibility shim
```

---

## Instructions for Applying to Your GitHub Repository (Windows)

### Option 1: Git Bash or PowerShell / Command Prompt (Recommended)

1. Extract the contents of this ZIP file.
2. Open your cloned repository on your Windows computer:
   ```powershell
   cd C:\path\to\your\qualiboost-realesrgan-backend
   ```
3. Copy and overwrite the extracted files into the root of your repository:
   - Copy `.python-version` to the repository root.
   - Copy `render.yaml` to the repository root.
   - Copy `requirements.txt` to the repository root.
   - Copy `inference_realesrgan.py` to the repository root.
   - Copy `inference_realesrgan_video.py` to the repository root.
   - Copy `cog_predict.py` to the repository root.
   - Copy `qualiboost_backend/app.py` into the `qualiboost_backend` folder.

4. Stage, commit, and push using Git:
   ```bash
   git status
   git add .python-version render.yaml requirements.txt inference_realesrgan.py inference_realesrgan_video.py cog_predict.py qualiboost_backend/app.py
   git commit -m "fix(realesrgan): add torchvision functional_tensor shim and pin python 3.11.17"
   git push origin master
   ```

---

### Option 2: Directly via GitHub Web UI (No Git CLI Required)

If you prefer uploading directly through your browser:

1. Go to your repository on GitHub:
   `https://github.com/businessmail286-cmyk/qualiboost-realesrgan-backend`
2. Ensure you are on the `master` branch.
3. Click **Add file** -> **Upload files**.
4. Drag and drop the following files into the repository root:
   - `.python-version`
   - `render.yaml`
   - `requirements.txt`
   - `inference_realesrgan.py`
   - `inference_realesrgan_video.py`
   - `cog_predict.py`
5. Commit the files to `master`.
6. Navigate into the `qualiboost_backend` directory on GitHub, click **Add file** -> **Upload files**, drag and drop `app.py`, and commit to `master`.

---

## Verifying Deployment on Render

1. After pushing to GitHub, open the **Render Dashboard**:
   `https://dashboard.render.com`
2. Select your `qualiboost-realesrgan-backend` service.
3. Check the **Logs** tab:
   - Confirm Python version:
     `==> Using Python version 3.11.17`
   - Confirm requirements install cleanly without `KeyError: '__version__'`.
4. Trigger an enhancement job from your QualiBoost frontend to verify full end-to-end operation.
