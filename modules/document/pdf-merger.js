// modules/document/pdf-merger.js
// PDF Merger Tool - Merge, split, extract, reorder PDF pages

const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: "PDF Merger",
    slug: "pdf-merger",
    type: "api",
    version: "1.0.0",
    description: "Merge PDFs, extract pages, reorder, split documents",
    
    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'merge':
                    return await mergePdfs(params);
                case 'extract-pages':
                    return await extractPages(params);
                case 'reorder-pages':
                    return await reorderPages(params);
                case 'split':
                    return await splitPdf(params);
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            throw error;
        }
    }
};

// Merge multiple PDFs
async function mergePdfs(params) {
    try {
        const { pdfPaths, outputPath } = params;

        if (!Array.isArray(pdfPaths) || pdfPaths.length === 0) {
            throw new Error('pdfPaths array is required');
        }

        if (!outputPath) {
            throw new Error('outputPath is required');
        }

        const mergedPdf = await PDFDocument.create();

        for (const pdfPath of pdfPaths) {
            if (!fs.existsSync(pdfPath)) {
                throw new Error(`PDF not found: ${pdfPath}`);
            }

            const pdfBytes = fs.readFileSync(pdfPath);
            const pdf = await PDFDocument.load(pdfBytes);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }

        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        const mergedBytes = await mergedPdf.save();
        fs.writeFileSync(outputPath, mergedBytes);

        return {
            status: true,
            action: 'merge',
            inputFiles: pdfPaths.length,
            outputPath,
            outputSize: mergedBytes.length,
            totalPages: mergedPdf.getPageCount(),
            files: pdfPaths.map(p => path.basename(p)),
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`PDF merge error: ${error.message}`);
    }
}

// Extract specific pages from PDF
async function extractPages(params) {
    try {
        const { pdfPath, pageNumbers, outputPath } = params;

        if (!pdfPath || !fs.existsSync(pdfPath)) {
            throw new Error('PDF not found');
        }

        if (!Array.isArray(pageNumbers) || pageNumbers.length === 0) {
            throw new Error('pageNumbers array is required');
        }

        if (!outputPath) {
            throw new Error('outputPath is required');
        }

        const pdfBytes = fs.readFileSync(pdfPath);
        const pdf = await PDFDocument.load(pdfBytes);
        const extractedPdf = await PDFDocument.create();

        // Convert 1-based page numbers to 0-based indices
        const indices = pageNumbers.map(p => p - 1).filter(i => i >= 0 && i < pdf.getPageCount());

        if (indices.length === 0) {
            throw new Error('No valid page numbers provided');
        }

        const copiedPages = await extractedPdf.copyPages(pdf, indices);
        copiedPages.forEach(page => extractedPdf.addPage(page));

        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        const extractedBytes = await extractedPdf.save();
        fs.writeFileSync(outputPath, extractedBytes);

        return {
            status: true,
            action: 'extract-pages',
            inputFile: path.basename(pdfPath),
            totalPages: pdf.getPageCount(),
            extractedPages: indices.length,
            pageNumbers: pageNumbers,
            outputPath,
            outputSize: extractedBytes.length,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Page extraction error: ${error.message}`);
    }
}

// Reorder pages in PDF
async function reorderPages(params) {
    try {
        const { pdfPath, pageOrder, outputPath } = params;

        if (!pdfPath || !fs.existsSync(pdfPath)) {
            throw new Error('PDF not found');
        }

        if (!Array.isArray(pageOrder) || pageOrder.length === 0) {
            throw new Error('pageOrder array is required');
        }

        if (!outputPath) {
            throw new Error('outputPath is required');
        }

        const pdfBytes = fs.readFileSync(pdfPath);
        const pdf = await PDFDocument.load(pdfBytes);
        const reorderedPdf = await PDFDocument.create();

        // Convert 1-based page numbers to 0-based indices
        const indices = pageOrder.map(p => p - 1).filter(i => i >= 0 && i < pdf.getPageCount());

        if (indices.length === 0) {
            throw new Error('No valid page order provided');
        }

        const copiedPages = await reorderedPdf.copyPages(pdf, indices);
        copiedPages.forEach(page => reorderedPdf.addPage(page));

        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        const reorderedBytes = await reorderedPdf.save();
        fs.writeFileSync(outputPath, reorderedBytes);

        return {
            status: true,
            action: 'reorder-pages',
            inputFile: path.basename(pdfPath),
            totalPages: pdf.getPageCount(),
            newOrder: pageOrder,
            outputPath,
            outputSize: reorderedBytes.length,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Page reordering error: ${error.message}`);
    }
}

// Split PDF into individual pages or page ranges
async function splitPdf(params) {
    try {
        const { pdfPath, outputDirectory, splitSize } = params;

        if (!pdfPath || !fs.existsSync(pdfPath)) {
            throw new Error('PDF not found');
        }

        if (!outputDirectory) {
            throw new Error('outputDirectory is required');
        }

        const pdfBytes = fs.readFileSync(pdfPath);
        const pdf = await PDFDocument.load(pdfBytes);
        const totalPages = pdf.getPageCount();
        const size = splitSize || 1; // Pages per split document

        fs.mkdirSync(outputDirectory, { recursive: true });

        const results = [];
        const baseName = path.basename(pdfPath, path.extname(pdfPath));

        for (let i = 0; i < totalPages; i += size) {
            const endIdx = Math.min(i + size, totalPages);
            const splitPdf = await PDFDocument.create();

            const indices = Array.from({ length: endIdx - i }, (_, j) => i + j);
            const copiedPages = await splitPdf.copyPages(pdf, indices);
            copiedPages.forEach(page => splitPdf.addPage(page));

            const filename = `${baseName}_pages_${i + 1}-${endIdx}.pdf`;
            const filepath = path.join(outputDirectory, filename);

            const splitBytes = await splitPdf.save();
            fs.writeFileSync(filepath, splitBytes);

            results.push({
                filename,
                filepath,
                pages: `${i + 1}-${endIdx}`,
                pageCount: endIdx - i,
                filesize: splitBytes.length
            });
        }

        return {
            status: true,
            action: 'split',
            inputFile: path.basename(pdfPath),
            totalPages,
            splitSize: size,
            outputDirectory,
            documentCount: results.length,
            results,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`PDF split error: ${error.message}`);
    }
}
