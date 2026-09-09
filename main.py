from fastapi import FastAPI, File, UploadFile, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from tensorflow.keras.models import load_model
from PIL import Image
import numpy as np

import uvicorn
import webbrowser
import threading
import os


# =========================================================
# 1. FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="PneumoAI - Pneumonia Detection API",
    description="AI-powered Pneumonia Detection from Chest X-Ray Images using VGG16",
    version="1.0.0"
)


# =========================================================
# 2. CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# =========================================================
# 3. PROJECT PATHS
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "pneumonia_vgg16_final.keras"
)

TEMPLATES_DIR = os.path.join(
    BASE_DIR,
    "templates"
)

STATIC_DIR = os.path.join(
    BASE_DIR,
    "static"
)


# =========================================================
# 4. STATIC FILES
# =========================================================

app.mount(
    "/static",
    StaticFiles(directory=STATIC_DIR),
    name="static"
)


# =========================================================
# 5. HTML TEMPLATES
# =========================================================

templates = Jinja2Templates(
    directory=TEMPLATES_DIR
)


# =========================================================
# 6. LOAD VGG16 MODEL
# =========================================================

print("\n==========================================")
print("        PNEUMOAI STARTING...")
print("==========================================")

print("Loading VGG16 model...")

try:

    model = load_model(MODEL_PATH)

    print("✅ VGG16 MODEL LOADED SUCCESSFULLY")
    print("Model:", MODEL_PATH)

except Exception as e:

    print("❌ MODEL LOADING FAILED")
    print("Error:", e)

    model = None


print("==========================================\n")


# =========================================================
# 7. HOME PAGE
# =========================================================

@app.get(
    "/",
    response_class=HTMLResponse,
    tags=["Frontend"]
)
async def home(request: Request):

    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "request": request
        }
    )


# =========================================================
# 8. HEALTH CHECK
# =========================================================

@app.get(
    "/health",
    tags=["System"]
)
async def health_check():

    if model is None:

        return {
            "status": "error",
            "model": "VGG16",
            "message": "Model is not loaded"
        }

    return {
        "status": "healthy",
        "model": "VGG16",
        "message": "Pneumonia Detection API is ready"
    }


# =========================================================
# 9. PREDICTION API
# =========================================================

@app.post(
    "/predict",
    tags=["Prediction"]
)
async def predict(
    file: UploadFile = File(...)
):

    # -----------------------------------------------------
    # Check model
    # -----------------------------------------------------

    if model is None:

        raise HTTPException(
            status_code=500,
            detail="Model is not loaded."
        )


    # -----------------------------------------------------
    # Allowed image formats
    # -----------------------------------------------------

    allowed_types = {
        "image/jpeg",
        "image/jpg",
        "image/png"
    }


    if file.content_type not in allowed_types:

        raise HTTPException(
            status_code=400,
            detail="Please upload JPG, JPEG or PNG image."
        )


    try:

        # =================================================
        # STEP 1: OPEN IMAGE
        # =================================================

        image = Image.open(file.file)


        # =================================================
        # STEP 2: CONVERT TO RGB
        # =================================================

        image = image.convert("RGB")


        # =================================================
        # STEP 3: RESIZE
        # VGG16 INPUT = 224 x 224
        # =================================================

        image = image.resize(
            (224, 224)
        )


        # =================================================
        # STEP 4: CONVERT IMAGE TO NUMPY ARRAY
        # =================================================

        image_array = np.array(
            image,
            dtype=np.float32
        )


        # =================================================
        # STEP 5: NORMALIZATION
        #
        # Pixel values:
        # 0 - 255
        #
        # After normalization:
        # 0 - 1
        # =================================================

        image_array = image_array / 255.0


        # =================================================
        # STEP 6: ADD BATCH DIMENSION
        #
        # (224,224,3)
        #       ↓
        # (1,224,224,3)
        # =================================================

        image_array = np.expand_dims(
            image_array,
            axis=0
        )


        # =================================================
        # STEP 7: MODEL PREDICTION
        # =================================================

        prediction = model.predict(
            image_array,
            verbose=0
        )[0][0]


        prediction = float(prediction)


        # =================================================
        # STEP 8: CLASSIFICATION
        #
        # 0 = NORMAL
        # 1 = PNEUMONIA
        # =================================================

        if prediction >= 0.50:

            result = "PNEUMONIA"

            confidence = prediction

        else:

            result = "NORMAL"

            confidence = 1.0 - prediction


        # =================================================
        # STEP 9: RESPONSE
        # =================================================

        return {
            "filename": file.filename,
            "prediction": result,
            "confidence": f"{confidence * 100:.2f}%"
        }


    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )


# =========================================================
# 10. AUTOMATIC BROWSER OPEN
# =========================================================

def open_browser():

    webbrowser.open(
        "http://127.0.0.1:8000/"
    )


# =========================================================
# 11. RUN SERVER
# =========================================================

if __name__ == "__main__":

    print("\n==========================================")
    print("🚀 PNEUMOAI FASTAPI SERVER")
    print("==========================================")
    print("Frontend : http://127.0.0.1:8000/")
    print("Swagger  : http://127.0.0.1:8000/docs")
    print("Health   : http://127.0.0.1:8000/health")
    print("==========================================\n")


    # Open browser automatically after server starts
    threading.Timer(
        2.0,
        open_browser
    ).start()


    # Start FastAPI
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        reload=False
    )