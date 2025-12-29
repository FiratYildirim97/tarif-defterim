
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
    if (lines.length > 0) {
        // First line is often the title in a recipe card
        name = lines[0].replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, ' ').trim();
    }

    const ingredients: { name: string; amount: string }[] = [];
    const steps: { description: string }[] = [];

    let section: 'unknown' | 'ingredients' | 'steps' = 'unknown';

    const ingredientKeywords = ['malzeme', 'içindekiler', 'listesi'];
    const stepKeywords = ['yapılışı', 'hazırlanışı', 'tarif', 'yapım', 'nasıl yapılır'];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const lowerLine = line.toLowerCase();

        // Check for section headers
        if (ingredientKeywords.some(k => lowerLine.includes(k)) && lowerLine.length < 30) {
            section = 'ingredients';
            continue;
        }
        if (stepKeywords.some(k => lowerLine.includes(k)) && lowerLine.length < 30) {
            section = 'steps';
            continue;
        }

        if (section === 'ingredients') {
            // Try to split amount and name if possible, otherwise put whole line in name
            // Heuristic: First number+unit is amount?
            // Simple fallback: take the whole line
            ingredients.push({ amount: '', name: line });
        } else if (section === 'steps') {
            steps.push({ description: line });
        } else {
            // If we haven't found a section yet, maybe these are still parts of title or description
            // For safety, let's treat early lines as potential ingredients if they start with a bullet or number
            if (line.match(/^[-*•\d]/)) {
                ingredients.push({ amount: '', name: line });
            }
        }
    }

    // Fallback: If no headers found, just dump everything into steps
    if (section === 'unknown') {
        steps.push({ description: text });
    }

    return { name, ingredients, steps, originalText: text, time: '?? dk', servings: '?? Kişilik' };
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
