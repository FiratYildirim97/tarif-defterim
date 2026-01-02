
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF worker
// Note: In a Vite environment, we need to handle the worker source correctly.
// This approach uses the URL constructor which Vite supports for asset handling.
// Use CDN for worker to avoid build/path issues on Vercel
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface ScannedRecipe {
    name: string;
    ingredients: { name: string; amount: string }[];
    steps: { description: string }[];
    originalText: string;
}

/**
 * Extracts text from an image using Tesseract.js
 */
export const extractTextFromImage = async (base64Image: string): Promise<string | null> => {
    try {
        const worker = await Tesseract.createWorker('tur'); // Use Turkish language
        const ret = await worker.recognize(`data:image/jpeg;base64,${base64Image}`);
        await worker.terminate();
        return ret.data.text;
    } catch (error) {
        console.error("OCR Error:", error);
        // Fallback to English if Turkish fails or isn't downloaded
        try {
            const worker = await Tesseract.createWorker('eng');
            const ret = await worker.recognize(`data:image/jpeg;base64,${base64Image}`);
            await worker.terminate();
            return ret.data.text;
        } catch (e) {
            console.error("OCR Fallback Error:", e);
            return null;
        }
    }
};

/**
 * Extracts text from a PDF file using pdfjs-dist
 * Returns an array of strings, where each string is the text of a page/recipe candidate.
 */
export const extractTextFromPDF = async (base64Data: string): Promise<string[]> => {
    try {
        // pdfjs-dist expects binary data, so we might need to convert base64 to Uint8Array
        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        const pagesText: string[] = [];

        // Limit to 20 pages for performance preventing browser crash on huge books
        const maxPages = Math.min(numPages, 20);

        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');

            // If clear text is found, use it. 
            // If the PDF is scanned images, pageText will be empty or garbage.
            // In that case, we would technically need to render the page to canvas and OCR it.
            // For now, let's assume selectable text PDFs or good enough extraction.
            // Implementing full PDF-to-Image-to-OCR in browser is heavy.

            if (pageText.trim().length > 50) {
                pagesText.push(pageText);
            }
        }

        return pagesText;
    } catch (error) {
        console.error("PDF Parse Error:", error);
        return [];
    }
};

/**
 * Heuristic parser to convert raw text into a Recipe structure.
 * This is "dumb" parsing looking for keywords.
 */
export const parseRecipeFromText = (text: string): ScannedRecipe => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let name = "Taranan Tarif";
    // Try to find a title. Usually the first line that is not a header.
    if (lines.length > 0) {
        // Heuristic: If first line is very short, it might be noise.
        const candidate = lines[0];
        if (candidate.length > 3) {
            name = candidate.replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, ' ').trim();
        } else if (lines.length > 1) {
            name = lines[1].replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, ' ').trim();
        }
    }

    const ingredients: { name: string; amount: string }[] = [];
    const steps: { description: string }[] = [];

    let section: 'unknown' | 'ingredients' | 'steps' = 'unknown';

    // Enhanced Keywords
    const ingredientKeywords = ['malzeme', 'içindekiler', 'listesi', 'gerekli', 'ihtiyaç', 'bileşenler'];
    const stepKeywords = ['yapılışı', 'hazırlanışı', 'tarif', 'yapım', 'nasıl', 'hazırlama', 'adımlar', 'pişirme', 'uygulama', 'yöntem'];

    // Helper to check if line looks like a header
    const isHeader = (line: string, keywords: string[]) => {
        const lower = line.toLowerCase();
        // Remove common non-alpha characters for checking
        const clean = lower.replace(/[^a-zğüşıöç]/g, '');
        return keywords.some(k => clean.includes(k));
    };

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Clean bullet points and excessive symbols
        const cleanLine = line.replace(/^[\s-*•·\d\.)]+/, '').trim();

        // Skip very short garbage lines
        if (line.replace(/\s/g, '').length < 3) continue;

        // Check for section headers
        // We relax the length constraint a bit and check content
        if (isHeader(line, ingredientKeywords) && line.length < 50) {
            section = 'ingredients';
            continue;
        }
        if (isHeader(line, stepKeywords) && line.length < 50) {
            section = 'steps';
            continue;
        }

        if (section === 'ingredients') {
            // Smart Ingredient Parsing
            // Try to separate amount from name
            // Regex for amount: starts with digits, fractions (1/2), or decimal (1.5) followed by space
            const amountMatch = cleanLine.match(/^(\d+([.,]\d+)?(\/\d+)?)\s*([a-zA-ZğüşıöçĞÜŞİÖÇ]+)?/);

            let amount = '';
            let name = cleanLine;

            // If found a number at start
            if (amountMatch) {
                // heuristics to see if the first word is a unit
                // For now, simpler approach: leave users to edit the amount if it's complex 
                // But we can try to guess "1 su bardağı"

                // Let's just put the whole line in name for now, but if it starts with digit, put first word in amount?
                // Actually the UI separates amount and name.

                // Let's try splitting by first space
                const parts = cleanLine.split(' ');
                if (parts.length > 1 && parts[0].match(/\d/)) {
                    amount = parts[0];
                    // Check if second word is a unit like "bardak", "kaşık", "g", "kg"
                    const unitCandidate = parts[1].toLowerCase();
                    if (['gr', 'g', 'kg', 'ml', 'cl', 'l', 'lt', 'kaşık', 'bardak', 'fincan', 'adet', 'tane', 'kase', 'tutam', 'demet', 'dilim'].some(u => unitCandidate.includes(u))) {
                        amount += ' ' + parts[1];
                        name = parts.slice(2).join(' ');
                    } else {
                        name = parts.slice(1).join(' ');
                    }
                }
            }

            if (name.trim()) {
                ingredients.push({ amount, name });
            }

        } else if (section === 'steps') {
            // Avoid adding header-like lines to steps if they were missed
            if (!isHeader(line, stepKeywords)) {
                steps.push({ description: line });
            }
        } else {
            // Still in unknown section. 
            // If it starts with a bullet/dash, treat as ingredient or step based on likelihood?
            // Usually ingredients come first.
            // Or maybe it's part of the description/title.

            // Heuristic A: If line starts with a number (1., 2.), likely a step
            if (line.match(/^\d+\./)) {
                steps.push({ description: line });
                section = 'steps'; // Switch to steps implicitly
            }
            // Heuristic B: If line starts with bullet, likely ingredient
            else if (line.match(/^[-*•]/)) {
                ingredients.push({ amount: '', name: cleanLine });
                section = 'ingredients'; // Switch to ingredients implicitly
            }
        }
    }

    // Fallback: If no headers found, just dump everything into steps
    if (section === 'unknown' && ingredients.length === 0 && steps.length === 0) {
        steps.push({ description: text });
    }

    return {
        name,
        ingredients,
        steps,
        originalText: text,
        time: '?? dk',
        servings: '?? Kişilik',
        // Assuming we return these (interface defines them?) - The original code didn't have difficulty/calories in ScannedRecipe but they are safe to add if only used here
    } as any;
};

// Main Service Functions (replacing the old Gemini ones)

export const analyzeRecipeImage = async (base64Image: string) => {
    const text = await extractTextFromImage(base64Image);
    if (!text) return null;
    return parseRecipeFromText(text);
};

export const analyzeMultipleRecipesFromDoc = async (files: { mimeType: string, data: string }[]) => {
    const allRecipes: any[] = [];

    for (const file of files) {
        if (file.mimeType === 'application/pdf') {
            const pageTexts = await extractTextFromPDF(file.data);
            pageTexts.forEach(text => {
                const recipe = parseRecipeFromText(text);
                if (recipe.ingredients.length > 0 || recipe.steps.length > 0) {
                    // Add category heuristic? Not easy without AI. Default to General.
                    allRecipes.push({ ...recipe, category: 'Genel', time: '?? dk', servings: '?? Kişilik' });
                }
            });
        } else if (file.mimeType.startsWith('image/')) {
            const text = await extractTextFromImage(file.data);
            if (text) {
                const recipe = parseRecipeFromText(text);
                allRecipes.push({ ...recipe, category: 'Genel', time: '?? dk', servings: '?? Kişilik' });
            }
        }
    }

    return allRecipes;
};
