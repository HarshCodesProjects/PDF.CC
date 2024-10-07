const uploadPDF = document.getElementById("uploadPDF");
const canvasContainer = document.getElementById("canvasContainer");
const filterContainer = document.getElementById("filterContainer");
let pdfDoc = null;

// Load PDF and render it
uploadPDF.addEventListener("change", handlePDFUpload);

async function handlePDFUpload(event) {
    const file = event.target.files[0];
    const fileReader = new FileReader();

    fileReader.onload = async function () {
        const typedarray = new Uint8Array(this.result);
        pdfDoc = await pdfjsLib.getDocument(typedarray).promise;
        renderPDF();
        generateFilterButtons(); // Generate filter buttons after PDF is loaded
    };

    fileReader.readAsArrayBuffer(file);
}

async function renderPDF() {
    canvasContainer.innerHTML = ""; // Clear previous canvases

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport: viewport }).promise;
        canvasContainer.appendChild(canvas);
    }
}

// Function to generate filter buttons
function generateFilterButtons() {
    const filters = [
        "invert", "blackAndWhite", "sepia", 
        "brightness", "contrast", "blur", "sharpen", 
        "threshold", "hueRotate", "saturate", "colorize"
    ];  // Added more filters
    filterContainer.innerHTML = ""; // Clear existing buttons

    filters.forEach(filter => {
        const button = document.createElement("button");
        button.textContent = filter.charAt(0).toUpperCase() + filter.slice(1);
        button.addEventListener("click", () => applyFilter(filter));
        filterContainer.appendChild(button);
    });
}

// Apply selected filter
function applyFilter(filter) {
    const canvases = canvasContainer.getElementsByTagName("canvas");
    for (let canvas of canvases) {
        const context = canvas.getContext("2d");
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        switch (filter) {
            case "invert":
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = 255 - data[i];       // R
                    data[i + 1] = 255 - data[i + 1]; // G
                    data[i + 2] = 255 - data[i + 2]; // B
                }
                break;
            case "blackAndWhite":
                for (let i = 0; i < data.length; i += 4) {
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    data[i] = avg;       // R
                    data[i + 1] = avg;   // G
                    data[i + 2] = avg;   // B
                }
                break;
            case "sepia":
                for (let i = 0; i < data.length; i += 4) {
                    const tr = 0.35 * data[i] + 0.68 * data[i + 1] + 0.17 * data[i + 2]; // Lowered
                    const tg = 0.34 * data[i] + 0.65 * data[i + 1] + 0.15 * data[i + 2]; // Lowered
                    const tb = 0.27 * data[i] + 0.53 * data[i + 1] + 0.13 * data[i + 2]; // Lowered
                    data[i] = Math.min(255, tr);   // R
                    data[i + 1] = Math.min(255, tg); // G
                    data[i + 2] = Math.min(255, tb); // B
                }
                break;
            case "brightness":
                const brightnessValue = 1.2; // Lowered brightness
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, data[i] * brightnessValue);     // R
                    data[i + 1] = Math.min(255, data[i + 1] * brightnessValue); // G
                    data[i + 2] = Math.min(255, data[i + 2] * brightnessValue); // B
                }
                break;
            case "contrast":
                const contrastValue = 1.2; // Lowered contrast
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = (data[i] - 128) * contrastValue + 128;       // R
                    data[i + 1] = (data[i + 1] - 128) * contrastValue + 128; // G
                    data[i + 2] = (data[i + 2] - 128) * contrastValue + 128; // B
                }
                break;
            case "blur":
                const tempData = context.getImageData(0, 0, canvas.width, canvas.height);
                for (let x = 1; x < canvas.width - 1; x++) {
                    for (let y = 1; y < canvas.height - 1; y++) {
                        const idx = (y * canvas.width + x) * 4;
                        data[idx] = (data[idx - 4] + data[idx + 4] + data[idx - canvas.width * 4] + data[idx + canvas.width * 4]) / 4; // R
                        data[idx + 1] = (data[idx - 4 + 1] + data[idx + 4 + 1] + data[idx - canvas.width * 4 + 1] + data[idx + canvas.width * 4 + 1]) / 4; // G
                        data[idx + 2] = (data[idx - 4 + 2] + data[idx + 4 + 2] + data[idx - canvas.width * 4 + 2] + data[idx + canvas.width * 4 + 2]) / 4; // B
                    }
                }
                break;
            case "sharpen":
                const sharpenMatrix = [
                    [0, -1, 0],
                    [-1, 4, -1],  // Lowered sharpening intensity
                    [0, -1, 0]
                ];
                applyConvolutionFilter(data, canvas.width, canvas.height, sharpenMatrix);
                break;
            case "threshold":
                const thresholdValue = 150; // Lowered threshold
                for (let i = 0; i < data.length; i += 4) {
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    const value = avg < thresholdValue ? 100 : 200; // Adjusted threshold
                    data[i] = value;       // R
                    data[i + 1] = value;   // G
                    data[i + 2] = value;   // B
                }
                break;
            case "hueRotate":
                const hueRotationValue = 30; // Reduced hue rotation degrees
                const hue = (hueRotationValue * Math.PI) / 180; // Convert to radians
                const cosHue = Math.cos(hue);
                const sinHue = Math.sin(hue);
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    data[i] = r * cosHue - g * sinHue;   // R
                    data[i + 1] = r * sinHue + g * cosHue; // G
                    // B is unchanged
                }
                break;
            case "saturate":
                const saturationValue = 1.2; // Reduced saturation
                for (let i = 0; i < data.length; i += 4) {
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    data[i] = avg + (data[i] - avg) * saturationValue;     // R
                    data[i + 1] = avg + (data[i + 1] - avg) * saturationValue; // G
                    data[i + 2] = avg + (data[i + 2] - avg) * saturationValue; // B
                }
                break;
            case "colorize":
                const colorizeValue = [80, 50, 120]; // Lowered RGB tint for colorize
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = (data[i] + colorizeValue[0]) / 2;       // R
                    data[i + 1] = (data[i + 1] + colorizeValue[1]) / 2; // G
                    data[i + 2] = (data[i + 2] + colorizeValue[2]) / 2; // B
                }
                break;
        }
        context.putImageData(imageData, 0, 0);
    }
}

// Helper function to apply convolution filters (e.g., sharpen)
function applyConvolutionFilter(data, width, height, kernel) {
    const tempData = new Uint8ClampedArray(data);
    const kernelSize = kernel.length;
    const half = Math.floor(kernelSize / 2);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            let r = 0, g = 0, b = 0;

            for (let ky = 0; ky < kernelSize; ky++) {
                for (let kx = 0; kx < kernelSize; kx++) {
                    const pixelY = y + ky - half;
                    const pixelX = x + kx - half;
                    if (pixelY >= 0 && pixelY < height && pixelX >= 0 && pixelX < width) {
                        const pixelIdx = (pixelY * width + pixelX) * 4;
                        r += tempData[pixelIdx] * kernel[ky][kx];
                        g += tempData[pixelIdx + 1] * kernel[ky][kx];
                        b += tempData[pixelIdx + 2] * kernel[ky][kx];
                    }
                }
            }

            data[idx] = Math.min(255, Math.max(0, r));
            data[idx + 1] = Math.min(255, Math.max(0, g));
            data[idx + 2] = Math.min(255, Math.max(0, b));
        }
    }
}

// Download modified PDF
document.getElementById('download').addEventListener('click', async function () {
    const { jsPDF } = window.jspdf;
    const pdfDoc = new jsPDF();
    const canvases = canvasContainer.getElementsByTagName('canvas');

    for (let i = 0; i < canvases.length; i++) {
        const canvas = canvases[i];
        const imgData = canvas.toDataURL('image/png');
        const width = pdfDoc.internal.pageSize.getWidth();
        const height = (canvas.height * width) / canvas.width;

        pdfDoc.addImage(imgData, 'PNG', 0, 0, width, height);

        if (i < canvases.length - 1) {
            pdfDoc.addPage();
        }
    }

    pdfDoc.save('modified.pdf');
});
