// modules/data/excel-converter.js
// Excel to JSON Converter - Convert XLSX/CSV to JSON format

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: "Excel Converter",
    slug: "excel-converter",
    type: "api",
    version: "1.0.0",
    description: "Convert XLSX/CSV files to JSON (with preview, validation, batch)",
    
    handler: async (req, res) => {
        const { action, ...params } = req.body;

        try {
            switch (action) {
                case 'convert-xlsx':
                    return convertXlsx(params);
                case 'convert-csv':
                    return convertCsv(params);
                case 'preview-data':
                    return previewData(params);
                case 'batch-convert':
                    return batchConvert(params);
                case 'get-sheets':
                    return getSheets(params);
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            throw error;
        }
    }
};

// Convert XLSX to JSON
function convertXlsx(params) {
    const { filePath, sheetName = 0, outputPath, prettyPrint = true, includeEmpty = false } = params;

    if (!filePath || !fs.existsSync(filePath)) {
        throw new Error('XLSX file not found: ' + filePath);
    }

    try {
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
        
        if (!sheet) {
            throw new Error('Sheet not found');
        }

        let json = XLSX.utils.sheet_to_json(sheet, { defval: includeEmpty ? '' : undefined });

        // Remove empty rows if not requested
        if (!includeEmpty) {
            json = json.filter(row => Object.values(row).some(v => v !== undefined && v !== ''));
        }

        const filename = path.basename(filePath, path.extname(filePath)) + '.json';
        const output = prettyPrint ? JSON.stringify(json, null, 2) : JSON.stringify(json);

        if (outputPath) {
            const filepath = path.join(outputPath, filename);
            fs.mkdirSync(outputPath, { recursive: true });
            fs.writeFileSync(filepath, output);

            return {
                status: true,
                action: 'convert-xlsx',
                file: path.basename(filePath),
                sheet: sheetName || 0,
                rowsConverted: json.length,
                columnsConverted: json.length > 0 ? Object.keys(json[0]).length : 0,
                saved: true,
                outputPath: filepath,
                outputSize: output.length,
                timestamp: new Date().toISOString()
            };
        } else {
            return {
                status: true,
                action: 'convert-xlsx',
                file: path.basename(filePath),
                sheet: sheetName || 0,
                rowsConverted: json.length,
                columnsConverted: json.length > 0 ? Object.keys(json[0]).length : 0,
                saved: false,
                data: json,
                timestamp: new Date().toISOString()
            };
        }
    } catch (error) {
        throw new Error(`XLSX conversion error: ${error.message}`);
    }
}

// Convert CSV to JSON
function convertCsv(params) {
    const { filePath, outputPath, prettyPrint = true, delimiter = ',' } = params;

    if (!filePath || !fs.existsSync(filePath)) {
        throw new Error('CSV file not found: ' + filePath);
    }

    try {
        // Read CSV as workbook (XLSX can handle CSV)
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);

        const filename = path.basename(filePath, path.extname(filePath)) + '.json';
        const output = prettyPrint ? JSON.stringify(json, null, 2) : JSON.stringify(json);

        if (outputPath) {
            const filepath = path.join(outputPath, filename);
            fs.mkdirSync(outputPath, { recursive: true });
            fs.writeFileSync(filepath, output);

            return {
                status: true,
                action: 'convert-csv',
                file: path.basename(filePath),
                rowsConverted: json.length,
                columnsConverted: json.length > 0 ? Object.keys(json[0]).length : 0,
                saved: true,
                outputPath: filepath,
                timestamp: new Date().toISOString()
            };
        } else {
            return {
                status: true,
                action: 'convert-csv',
                file: path.basename(filePath),
                rowsConverted: json.length,
                columnsConverted: json.length > 0 ? Object.keys(json[0]).length : 0,
                saved: false,
                data: json,
                timestamp: new Date().toISOString()
            };
        }
    } catch (error) {
        throw new Error(`CSV conversion error: ${error.message}`);
    }
}

// Preview data without conversion
function previewData(params) {
    const { filePath, sheetName = 0, maxRows = 5 } = params;

    if (!filePath || !fs.existsSync(filePath)) {
        throw new Error('File not found: ' + filePath);
    }

    try {
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
        let json = XLSX.utils.sheet_to_json(sheet);

        const preview = json.slice(0, maxRows);
        const columns = json.length > 0 ? Object.keys(json[0]) : [];

        return {
            status: true,
            action: 'preview-data',
            file: path.basename(filePath),
            sheets: workbook.SheetNames,
            currentSheet: sheetName || workbook.SheetNames[0],
            totalRows: json.length,
            columns,
            columnCount: columns.length,
            preview: preview,
            previewRows: Math.min(maxRows, json.length),
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Preview error: ${error.message}`);
    }
}

// Get sheet names from file
function getSheets(params) {
    const { filePath } = params;

    if (!filePath || !fs.existsSync(filePath)) {
        throw new Error('File not found: ' + filePath);
    }

    try {
        const workbook = XLSX.readFile(filePath);
        
        const sheets = workbook.SheetNames.map(name => {
            const sheet = workbook.Sheets[name];
            const json = XLSX.utils.sheet_to_json(sheet);
            return {
                name,
                rowCount: json.length,
                columnCount: json.length > 0 ? Object.keys(json[0]).length : 0,
                columns: json.length > 0 ? Object.keys(json[0]) : []
            };
        });

        return {
            status: true,
            action: 'get-sheets',
            file: path.basename(filePath),
            sheetCount: sheets.length,
            sheets,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(`Get sheets error: ${error.message}`);
    }
}

// Batch convert multiple files
function batchConvert(params) {
    const { directory, outputDirectory, format = 'xlsx' } = params;

    if (!directory || !fs.existsSync(directory)) {
        throw new Error('Directory not found: ' + directory);
    }

    if (!outputDirectory) {
        throw new Error('Output directory is required');
    }

    fs.mkdirSync(outputDirectory, { recursive: true });

    const results = [];
    const ext = format === 'csv' ? '.csv' : '.xlsx';
    const files = fs.readdirSync(directory)
        .filter(f => f.endsWith(ext));

    for (const file of files) {
        try {
            const filePath = path.join(directory, file);
            const result = format === 'csv' 
                ? convertCsv({ filePath, outputPath: outputDirectory })
                : convertXlsx({ filePath, outputPath: outputDirectory });

            results.push({
                file,
                status: 'success',
                rowsConverted: result.rowsConverted,
                outputPath: result.outputPath
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
        action: 'batch-convert',
        directory,
        outputDirectory,
        format,
        filesProcessed: results.filter(r => r.status === 'success').length,
        filesFailed: results.filter(r => r.status === 'failed').length,
        totalFiles: results.length,
        results,
        timestamp: new Date().toISOString()
    };
}
