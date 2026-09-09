// =========================================================
// PNEUMOAI — FRONTEND JAVASCRIPT
// =========================================================


// =========================================================
// ELEMENTS
// =========================================================

const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const browseBtn = document.getElementById("browseBtn");

const previewContainer = document.getElementById("previewContainer");
const previewImage = document.getElementById("previewImage");
const fileName = document.getElementById("fileName");
const removeBtn = document.getElementById("removeBtn");

const analyzeBtn = document.getElementById("analyzeBtn");
const loading = document.getElementById("loading");

const diagnosisEmpty = document.getElementById("diagnosisEmpty");
const resultContainer = document.getElementById("resultContainer");

const resultIcon = document.getElementById("resultIcon");
const predictionResult = document.getElementById("predictionResult");
const predictionMessage = document.getElementById("predictionMessage");

const confidenceValue = document.getElementById("confidenceValue");
const confidenceFill = document.getElementById("confidenceFill");

const resultDescription = document.getElementById("resultDescription");
const warningBox = document.getElementById("warningBox");

const historyList = document.getElementById("historyList");


// =========================================================
// SELECTED FILE
// =========================================================

let selectedFile = null;


// =========================================================
// INITIALIZATION
// =========================================================

document.addEventListener("DOMContentLoaded", function () {

    analyzeBtn.disabled = true;

    previewContainer.style.display = "none";

    resultContainer.style.display = "none";

    loading.style.display = "none";

    diagnosisEmpty.style.display = "block";

});


// =========================================================
// BROWSE BUTTON
// =========================================================

browseBtn.addEventListener("click", function (event) {

    event.stopPropagation();

    fileInput.click();

});


// =========================================================
// CLICK UPLOAD AREA
// =========================================================

uploadArea.addEventListener("click", function () {

    fileInput.click();

});


// =========================================================
// FILE INPUT
// =========================================================

fileInput.addEventListener("change", function () {

    if (fileInput.files.length > 0) {

        handleFile(fileInput.files[0]);

    }

});


// =========================================================
// DRAG OVER
// =========================================================

uploadArea.addEventListener("dragover", function (event) {

    event.preventDefault();

    uploadArea.classList.add("dragover");

});


// =========================================================
// DRAG LEAVE
// =========================================================

uploadArea.addEventListener("dragleave", function () {

    uploadArea.classList.remove("dragover");

});


// =========================================================
// DROP FILE
// =========================================================

uploadArea.addEventListener("drop", function (event) {

    event.preventDefault();

    uploadArea.classList.remove("dragover");

    const files = event.dataTransfer.files;

    if (files.length > 0) {

        handleFile(files[0]);

    }

});


// =========================================================
// HANDLE FILE
// =========================================================

function handleFile(file) {

    // Allowed image types
    const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png"
    ];


    // Check file type
    if (!allowedTypes.includes(file.type)) {

        alert(
            "Invalid file type.\n\n" +
            "Please upload a JPG, JPEG or PNG chest X-ray."
        );

        return;
    }


    // Maximum file size = 10 MB
    const maxSize = 10 * 1024 * 1024;


    if (file.size > maxSize) {

        alert(
            "File is too large.\n\n" +
            "Please upload an image smaller than 10 MB."
        );

        return;
    }


    // Save selected file
    selectedFile = file;


    // =====================================================
    // IMAGE PREVIEW
    // =====================================================

    const reader = new FileReader();

    reader.onload = function (event) {

        previewImage.src = event.target.result;

        previewContainer.style.display = "block";

    };

    reader.readAsDataURL(file);


    // =====================================================
    // FILE NAME
    // =====================================================

    fileName.textContent =
        `${file.name} • ${formatFileSize(file.size)}`;


    // =====================================================
    // ENABLE ANALYZE BUTTON
    // =====================================================

    analyzeBtn.disabled = false;


    // =====================================================
    // RESET OLD RESULT
    // =====================================================

    resetDiagnosis();

}


// =========================================================
// FORMAT FILE SIZE
// =========================================================

function formatFileSize(bytes) {

    if (bytes < 1024) {

        return bytes + " B";

    }


    if (bytes < 1024 * 1024) {

        return (bytes / 1024).toFixed(1) + " KB";

    }


    return (bytes / (1024 * 1024)).toFixed(1) + " MB";

}


// =========================================================
// REMOVE SELECTED FILE
// =========================================================

removeBtn.addEventListener("click", function (event) {

    event.stopPropagation();

    selectedFile = null;

    fileInput.value = "";

    previewImage.src = "";

    fileName.textContent = "";

    previewContainer.style.display = "none";

    analyzeBtn.disabled = true;

    resetDiagnosis();

});


// =========================================================
// ANALYZE BUTTON
// =========================================================

analyzeBtn.addEventListener("click", async function () {

    // No file selected
    if (!selectedFile) {

        alert(
            "Please select a chest X-ray first."
        );

        return;
    }


    // =====================================================
    // CREATE FORM DATA
    // =====================================================

    const formData = new FormData();

    formData.append(
        "file",
        selectedFile
    );


    // =====================================================
    // UI — LOADING STATE
    // =====================================================

    analyzeBtn.disabled = true;

    loading.style.display = "block";

    diagnosisEmpty.style.display = "none";

    resultContainer.style.display = "none";


    try {

        // =================================================
        // SEND IMAGE TO FASTAPI
        // =================================================

        const response = await fetch(
            "/predict",
            {
                method: "POST",
                body: formData
            }
        );


        // =================================================
        // HTTP ERROR CHECK
        // =================================================

        if (!response.ok) {

            throw new Error(
                `Server error: ${response.status}`
            );

        }


        // =================================================
        // CONVERT RESPONSE TO JSON
        // =================================================

        const data = await response.json();


        // =================================================
        // API ERROR CHECK
        // =================================================

        if (data.error) {

            throw new Error(
                data.message || "Prediction failed."
            );

        }


        // =================================================
        // DISPLAY RESULT
        // =================================================

        showResult(data);

    }


    catch (error) {

        console.error(
            "Prediction Error:",
            error
        );


        alert(
            "Prediction failed.\n\n" +
            "Make sure FastAPI server is running.\n\n" +
            "Error: " +
            error.message
        );


        diagnosisEmpty.style.display = "block";

        resultContainer.style.display = "none";

    }


    finally {

        loading.style.display = "none";

        analyzeBtn.disabled = false;

    }

});


// =========================================================
// SHOW RESULT
// =========================================================

function showResult(data) {

    const prediction = data.prediction;

    const confidenceText = data.confidence;


    // =====================================================
    // CONVERT CONFIDENCE
    // Example: "83.45%" → 83.45
    // =====================================================

    const confidence = parseFloat(
        String(confidenceText).replace("%", "")
    );


    // =====================================================
    // SHOW RESULT CONTAINER
    // =====================================================

    diagnosisEmpty.style.display = "none";

    resultContainer.style.display = "block";


    // Remove previous danger state
    resultContainer.classList.remove(
        "danger-result"
    );


    // =====================================================
    // CONFIDENCE
    // =====================================================

    confidenceValue.textContent =
        confidenceText;


    confidenceFill.style.width =
        Math.max(
            0,
            Math.min(100, confidence)
        ) + "%";


    // =====================================================
    // NORMAL RESULT
    // =====================================================

    if (prediction === "NORMAL") {

        resultIcon.textContent = "✓";

        predictionResult.textContent =
            "NORMAL";

        predictionResult.style.color =
            "#63e6a5";


        predictionMessage.textContent =
            "✓ No Pneumonia Detected";

        predictionMessage.style.color =
            "#63e6a5";


        resultDescription.textContent =
            "X-ray appears normal according to the AI model.";


        warningBox.style.display =
            "none";


        confidenceFill.style.background =
            "linear-gradient(90deg, #19b8e9, #61e5a2)";

    }


    // =====================================================
    // PNEUMONIA RESULT
    // =====================================================

    else if (prediction === "PNEUMONIA") {

        resultContainer.classList.add(
            "danger-result"
        );


        resultIcon.textContent = "⚠";

        predictionResult.textContent =
            "PNEUMONIA";

        predictionResult.style.color =
            "#ff6878";


        predictionMessage.textContent =
            "⚠ Possible Pneumonia Detected";

        predictionMessage.style.color =
            "#ff6878";


        resultDescription.textContent =
            "The AI model detected possible signs of pneumonia in this X-ray.";


        warningBox.style.display =
            "block";


        confidenceFill.style.background =
            "linear-gradient(90deg, #ff8a65, #ff4f68)";

    }


    // =====================================================
    // UNKNOWN RESULT
    // =====================================================

    else {

        predictionResult.textContent =
            prediction;

        predictionResult.style.color =
            "#67ddff";

        predictionMessage.textContent =
            "AI prediction completed.";

        predictionMessage.style.color =
            "#67ddff";

        resultIcon.textContent = "✓";

        resultDescription.textContent =
            "The AI model has completed the analysis.";

        warningBox.style.display =
            "none";

    }


    // =====================================================
    // ADD TO HISTORY
    // =====================================================

    addToHistory(
        data.filename || selectedFile.name,
        prediction,
        confidenceText
    );


    // =====================================================
    // SCROLL TO RESULT
    // =====================================================

    setTimeout(function () {

        resultContainer.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    }, 200);

}


// =========================================================
// ADD RESULT TO HISTORY
// =========================================================

function addToHistory(
    filename,
    prediction,
    confidence
) {

    // Remove empty history message
    const emptyMessage =
        historyList.querySelector(
            ".history-empty"
        );


    if (emptyMessage) {

        emptyMessage.remove();

    }


    // Create history item
    const item =
        document.createElement("div");

    item.className =
        "history-item";


    // Result type
    const resultClass =
        prediction === "NORMAL"
            ? "normal"
            : "pneumonia";


    // Result icon
    const icon =
        prediction === "NORMAL"
            ? "✓"
            : "⚠";


    // Current time
    const currentTime =
        new Date().toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );


    // =====================================================
    // HISTORY HTML
    // =====================================================

    item.innerHTML = `

        <div class="history-left">

            <div class="history-icon">
                ${icon}
            </div>

            <div>

                <div class="history-name">
                    ${escapeHtml(filename)}
                </div>

                <div class="history-time">
                    ${currentTime}
                    • Confidence ${escapeHtml(confidence)}
                </div>

            </div>

        </div>


        <div class="history-result ${resultClass}">
            ${escapeHtml(prediction)}
        </div>

    `;


    // Newest result at top
    historyList.prepend(item);

}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent =
        String(text);

    return div.innerHTML;

}


// =========================================================
// RESET DIAGNOSIS
// =========================================================

function resetDiagnosis() {

    diagnosisEmpty.style.display =
        "block";


    resultContainer.style.display =
        "none";


    loading.style.display =
        "none";


    // Reset prediction
    predictionResult.textContent =
        "NORMAL";


    predictionResult.style.color =
        "#63e6a5";


    predictionMessage.textContent =
        "✓ No Pneumonia Detected";


    predictionMessage.style.color =
        "#63e6a5";


    // Reset confidence
    confidenceValue.textContent =
        "0%";


    confidenceFill.style.width =
        "0%";


    confidenceFill.style.background =
        "linear-gradient(90deg, #19b8e9, #61e5a2)";


    // Reset description
    resultDescription.textContent =
        "X-ray appears normal according to the AI model.";


    // Hide warning
    warningBox.style.display =
        "none";


    // Remove danger state
    resultContainer.classList.remove(
        "danger-result"
    );

}