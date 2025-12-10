// modules/document/pdf-watermarker.js
// PDF Watermarking Tool - Add text/image stamps to PDFs

const { PDFDocument, rgb } = require('pdfkit');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: "PDF Watermarker",
    slug: "pdf-watermark",
    type: "api",
    version: "1.0.0",
    description: "Add text watermarks or stamps to PDF pages (e.g., LUNAS, RAHASIA, DRAFT)",
    
    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'add-text-watermark':
                    return await addTextWatermark(params);
                case 'add-image-watermark':
                    return await addImageWatermark(params);
                case 'batch-watermark':
                    return await batchWatermark(params);
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            throw error;
        }
    }
};

// Add text watermark to PDF
async function addTextWatermark(params) {
    const { 
        inputPath, 
        text = "WATERMARK", 
        opacity = 0.3, 
        angle = 45,
        fontSize = 60,
        color = "red"
    } = params;

    if (!inputPath || !fs.existsSync(inputPath)) {
        throw new Error('Input PDF file not found');
    }

    try {
        // Read existing PDF
        const pdfBytes = fs.readFileSync(inputPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        const pages = pdfDoc.getPages();
        
        // Color mapping
        const colorMap = {
            'red': rgb(1, 0, 0),
            'blue': rgb(0, 0, 1),
            'black': rgb(0, 0, 0),
            'gray': rgb(0.5, 0.5, 0.5),
            'green': rgb(0, 1, 0)
        };
        
        const selectedColor = colorMap[color] || colorMap.red;

        for (const page of pages) {
            const { width, height } = page.getSize();
            
            page.drawText(text, {
                x: width / 2 - (text.length * fontSize) / 8,
                y: height / 2,
                size: fontSize,
                color: selectedColor,
                opacity: opacity,
                rotate: angle
            });
        }

        const pdfBytes2 = await pdfDoc.save();
        const outputPath = inputPath.replace('.pdf', '_watermarked.pdf');
        
        fs.writeFileSync(outputPath, pdfBytes2);

        return {
            status: true,
            action: 'add-text-watermark',
            message: `Watermark "${text}" added successfully`,
            input: inputPath,
            output: outputPath,
            pages: pages.length,
            watermark: {
                text,
                opacity,
                angle,
                fontSize,
                color
            },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`PDF processing error: ${error.message}`);
    }
}

// Add image watermark (logo) to PDF
async function addImageWatermark(params) {
    const {
        inputPath,
        imagePath,
        position = "center", // center, top-left, top-right, bottom-left, bottom-right
        scale = 0.5,
        opacity = 0.5
    } = params;

    if (!inputPath || !fs.existsSync(inputPath)) {
        throw new Error('Input PDF file not found');
    }

    if (!imagePath || !fs.existsSync(imagePath)) {
        throw new Error('Watermark image not found');
    }

    try {
        // Read PDF and image
        const pdfBytes = fs.readFileSync(inputPath);
        const imageBytes = fs.readFileSync(imagePath);
        
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        let image;
        const ext = path.extname(imagePath).toLowerCase();
        
        if (ext === '.png') {
            image = await pdfDoc.embedPng(imageBytes);
        } else if (ext === '.jpg' || ext === '.jpeg') {
            image = await pdfDoc.embedJpg(imageBytes);
        } else {
            throw new Error('Only PNG and JPG images supported');
        }

        const pages = pdfDoc.getPages();
        const imageDims = image.scale(scale);

        for (const page of pages) {
            const { width, height } = page.getSize();
            
            let x, y;
            switch (position) {
                case 'top-left':
                    x = 20;
                    y = height - imageDims.height - 20;
                    break;
                case 'top-right':
                    x = width - imageDims.width - 20;
                    y = height - imageDims.height - 20;
                    break;
                case 'bottom-left':
                    x = 20;
                    y = 20;
                    break;
                case 'bottom-right':
                    x = width - imageDims.width - 20;
                    y = 20;
                    break;
                case 'center':
                default:
                    x = (width - imageDims.width) / 2;
                    y = (height - imageDims.height) / 2;
            }

            page.drawImage(image, {
                x,
                y,
                width: imageDims.width,
                height: imageDims.height,
                opacity
            });
        }

        const pdfBytes2 = await pdfDoc.save();
        const outputPath = inputPath.replace('.pdf', '_logo_watermarked.pdf');
        
        fs.writeFileSync(outputPath, pdfBytes2);

        return {
            status: true,
            action: 'add-image-watermark',
            message: 'Image watermark added successfully',
            input: inputPath,
            output: outputPath,
            pages: pages.length,
            watermark: {
                image: path.basename(imagePath),
                position,
                scale,
                opacity
            },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Image watermarking error: ${error.message}`);
    }
}

// Batch watermark multiple PDFs
async function batchWatermark(params) {
    const {
        inputDirectory,
        text = "WATERMARK",
        opacity = 0.3,
        outputDirectory
    } = params;

    if (!inputDirectory || !fs.existsSync(inputDirectory)) {
        throw new Error('Input directory not found');
    }

    const outDir = outputDirectory || path.join(inputDirectory, 'watermarked');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    const files = fs.readdirSync(inputDirectory).filter(f => f.endsWith('.pdf'));
    const results = [];

    for (const file of files) {
        try {
            const inputPath = path.join(inputDirectory, file);
            const pdfBytes = fs.readFileSync(inputPath);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            
            const pages = pdfDoc.getPages();

            for (const page of pages) {
                const { width, height } = page.getSize();
                page.drawText(text, {
                    x: width / 2 - (text.length * 60) / 8,
                    y: height / 2,
                    size: 60,
                    color: rgb(1, 0, 0),
                    opacity: opacity,
                    rotate: 45
                });
            }

            const pdfBytes2 = await pdfDoc.save();
            const outputFile = file.replace('.pdf', '_watermarked.pdf');
            const outputPath = path.join(outDir, outputFile);
            
            fs.writeFileSync(outputPath, pdfBytes2);
            
            results.push({
                file,
                status: 'success',
                output: outputFile
            });
        } catch (error) {
            results.push({
                file,
                status: 'failed',
                error: error.message
            });
        }
    }

    return {
        status: true,
        action: 'batch-watermark',
        message: `Processed ${files.length} PDFs`,
        inputDirectory,
        outputDirectory: outDir,
        total: files.length,
        success: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length,
        results,
        timestamp: new Date().toISOString()
    };
}
