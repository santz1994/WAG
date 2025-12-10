// modules/document/image-to-pdf.js
// Image to PDF Converter - Convert images to PDF documents

const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: "Image to PDF",
    slug: "image-to-pdf",
    type: "api",
    version: "1.0.0",
    description: "Convert images to PDF (single/batch), add watermark",
    
    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'images-to-pdf':
                    return await imagesToPdf(params);
                case 'bulk-convert':
                    return await bulkConvert(params);
                case 'add-watermark':
                    return await addImageWatermark(params);
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            throw error;
        }
    }
};

// Convert single or multiple images to PDF
async function imagesToPdf(params) {
    try {
        const { imagePaths, outputPath, pageSize = 'A4', margin = 10 } = params;

        if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
            throw new Error('imagePaths array is required');
        }

        if (!outputPath) {
            throw new Error('outputPath is required');
        }

        const pdfDoc = await PDFDocument.create();

        // Page sizes (width, height in points, 72 points = 1 inch)
        const sizes = {
            'A4': [595, 842],
            'Letter': [612, 792],
            'A3': [842, 1191],
            'A5': [420, 595]
        };

        const [pdfWidth, pdfHeight] = sizes[pageSize] || sizes['A4'];

        for (const imagePath of imagePaths) {
            if (!fs.existsSync(imagePath)) {
                throw new Error(`Image not found: ${imagePath}`);
            }

            // Get image metadata
            const metadata = await sharp(imagePath).metadata();
            const imageBuffer = fs.readFileSync(imagePath);

            // Embed image in PDF
            let embeddedImage;
            const ext = path.extname(imagePath).toLowerCase();

            if (ext === '.png') {
                embeddedImage = await pdfDoc.embedPng(imageBuffer);
            } else if (['.jpg', '.jpeg'].includes(ext)) {
                embeddedImage = await pdfDoc.embedJpg(imageBuffer);
            } else {
                // Convert other formats to JPEG
                const jpegBuffer = await sharp(imagePath).jpeg({ quality: 90 }).toBuffer();
                embeddedImage = await pdfDoc.embedJpg(jpegBuffer);
            }

            // Calculate scaling to fit page
            const contentWidth = pdfWidth - (margin * 2);
            const contentHeight = pdfHeight - (margin * 2);

            let imgWidth = contentWidth;
            let imgHeight = (imgWidth * metadata.height) / metadata.width;

            if (imgHeight > contentHeight) {
                imgHeight = contentHeight;
                imgWidth = (imgHeight * metadata.width) / metadata.height;
            }

            // Center image on page
            const x = (pdfWidth - imgWidth) / 2;
            const y = (pdfHeight - imgHeight) / 2;

            // Add new page and draw image
            const page = pdfDoc.addPage([pdfWidth, pdfHeight]);
            page.drawImage(embeddedImage, {
                x,
                y,
                width: imgWidth,
                height: imgHeight
            });
        }

        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(outputPath, pdfBytes);

        return {
            status: true,
            action: 'images-to-pdf',
            inputImages: imagePaths.length,
            outputPath,
            outputSize: pdfBytes.length,
            pageSize,
            margin,
            images: imagePaths.map(p => path.basename(p)),
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Image to PDF error: ${error.message}`);
    }
}

// Bulk convert images from directory
async function bulkConvert(params) {
    try {
        const { directory, outputPath, pageSize = 'A4', imagesPerPdf = 0 } = params;

        if (!directory || !fs.existsSync(directory)) {
            throw new Error('Directory not found');
        }

        if (!outputPath) {
            throw new Error('outputPath is required');
        }

        // Get all image files
        const files = fs.readdirSync(directory).filter(f => {
            const ext = path.extname(f).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext);
        });

        if (files.length === 0) {
            throw new Error('No image files found in directory');
        }

        fs.mkdirSync(outputPath, { recursive: true });
        const results = [];

        if (imagesPerPdf > 0 && imagesPerPdf < files.length) {
            // Create multiple PDFs with limited images each
            for (let i = 0; i < files.length; i += imagesPerPdf) {
                const batch = files.slice(i, i + imagesPerPdf);
                const imagePaths = batch.map(f => path.join(directory, f));
                const filename = `images_${Math.floor(i / imagesPerPdf) + 1}.pdf`;
                const filepath = path.join(outputPath, filename);

                await imagesToPdf({ imagePaths, outputPath: filepath, pageSize });

                results.push({
                    filename,
                    filepath,
                    imagesIncluded: batch.length,
                    filesize: fs.statSync(filepath).size
                });
            }
        } else {
            // Create single PDF with all images
            const imagePaths = files.map(f => path.join(directory, f));
            const filename = 'merged_images.pdf';
            const filepath = path.join(outputPath, filename);

            await imagesToPdf({ imagePaths, outputPath: filepath, pageSize });

            results.push({
                filename,
                filepath,
                imagesIncluded: files.length,
                filesize: fs.statSync(filepath).size
            });
        }

        return {
            status: true,
            action: 'bulk-convert',
            inputDirectory: directory,
            totalImages: files.length,
            outputDirectory: outputPath,
            pdfCount: results.length,
            pageSize,
            results,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Bulk conversion error: ${error.message}`);
    }
}

// Add image watermark to PDF
async function addImageWatermark(params) {
    try {
        const { pdfPath, imagePath, position = 'center', scale = 0.5, opacity = 0.5, outputPath } = params;

        if (!pdfPath || !fs.existsSync(pdfPath)) {
            throw new Error('PDF not found');
        }

        if (!imagePath || !fs.existsSync(imagePath)) {
            throw new Error('Watermark image not found');
        }

        const pdfBytes = fs.readFileSync(pdfPath);
        const imageBytes = fs.readFileSync(imagePath);

        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        // Embed watermark image
        let embeddedImage;
        const ext = path.extname(imagePath).toLowerCase();

        if (ext === '.png') {
            embeddedImage = await pdfDoc.embedPng(imageBytes);
        } else if (['.jpg', '.jpeg'].includes(ext)) {
            embeddedImage = await pdfDoc.embedJpg(imageBytes);
        } else {
            const jpegBuffer = await sharp(imagePath).jpeg({ quality: 90 }).toBuffer();
            embeddedImage = await pdfDoc.embedJpg(jpegBuffer);
        }

        const imgWidth = embeddedImage.width * scale;
        const imgHeight = embeddedImage.height * scale;

        // Add watermark to each page
        for (const page of pages) {
            const { width, height } = page.getSize();

            let x, y;
            switch (position) {
                case 'top-left':
                    x = 20;
                    y = height - imgHeight - 20;
                    break;
                case 'top-right':
                    x = width - imgWidth - 20;
                    y = height - imgHeight - 20;
                    break;
                case 'bottom-left':
                    x = 20;
                    y = 20;
                    break;
                case 'bottom-right':
                    x = width - imgWidth - 20;
                    y = 20;
                    break;
                case 'center':
                default:
                    x = (width - imgWidth) / 2;
                    y = (height - imgHeight) / 2;
            }

            page.drawImage(embeddedImage, {
                x,
                y,
                width: imgWidth,
                height: imgHeight,
                opacity
            });
        }

        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        const outputBytes = await pdfDoc.save();
        fs.writeFileSync(outputPath, outputBytes);

        return {
            status: true,
            action: 'add-watermark',
            pdfFile: path.basename(pdfPath),
            watermarkImage: path.basename(imagePath),
            position,
            scale,
            opacity,
            pageCount: pages.length,
            outputPath,
            outputSize: outputBytes.length,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Watermark error: ${error.message}`);
    }
}
