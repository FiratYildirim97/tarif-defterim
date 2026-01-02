
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
 */
export const parseRecipeFromText = (text: string): ScannedRecipe => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let name = "Taranan Tarif";

    // Heuristic: Identify title
    if (lines.length > 0) {
        const candidate = lines[0];
        // If it doesn't look like a header, assume it's the title
        if (!candidate.match(/malzeme|yapılış|hazırlanış|bölüm|içindekiler|tarif/i)) {
            name = candidate.replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, ' ').trim();
        }
    }

    const ingredients: { name: string; amount: string }[] = [];
    const steps: { description: string; title?: string }[] = [];

    let section: 'unknown' | 'ingredients' | 'steps' = 'unknown';

    // Helper: Normalize Turkish chars to English for easier matching (handling OCR inconsistencies)
    const normalize = (str: string) => str.toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z]/g, ''); // Keep only letters

    // Keywords (Normalized)
    const ingredientKeywords = ['malzeme', 'icindekiler', 'listesi', 'gerekli', 'ihtiyac', 'bilesenler'];
    const stepKeywords = ['yapilisi', 'hazirlanisi', 'tarif', 'yapim', 'nasil', 'hazirlama', 'adimlar', 'pisirme', 'uygulama', 'yontem'];

    const isHeader = (line: string, keywords: string[]) => {
        const clean = normalize(line);
        if (line.length > 40) return false; // Headers are usually short
        return keywords.some(k => clean.includes(k));
    };

    let currentStepGroupTitle = "";

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip title line
        if (i === 0 && line.includes(name) && name !== "Taranan Tarif") continue;

        // Skip short garbage
        if (line.replace(/\s/g, '').length < 3) continue;

        const cleanLine = line.replace(/^[\s-*•·\d\.)]+/, '').trim();

        // 1. Check for Explicit Section Headers
        if (isHeader(line, ingredientKeywords)) {
            section = 'ingredients';
            continue;
        }
        if (isHeader(line, stepKeywords)) {
            section = 'steps';
            continue;
        }

        // 2. Failsafe: Detect section switch based on content format
        if (section === 'ingredients') {
            // If we are in ingredients, but see "1. Do something", it's likely we missed the 'Steps' header
            // Steps usually start with a number followed by a dot, and have a longish description (verb)
            if (line.match(/^\d+[\.\)]\s+/) && line.length > 20) {
                section = 'steps';
                // fall through to process this line as a step
            }
        }

        // 3. Process Content
        if (section === 'ingredients') {
            // Check for Subheader (e.g. "Sosu icin:")
            // Must be short, no number start, either ends with colon or is subheader-like
            const isSubHeader = line.endsWith(':') ||
                (!line.match(/^[\d-*•]/) && line.length < 30 && (line === line.toUpperCase() || line.toLowerCase().includes('için')));

            if (isSubHeader) {
                ingredients.push({ amount: '', name: cleanLine.replace(/:$/, '').trim() });
                continue;
            }

            // Regular Ingredient Parsing
            const parts = cleanLine.split(' ');
            let amount = '';
            let ingName = cleanLine;

            // Heuristic for Amount detection
            if (parts.length > 1 && parts[0].match(/^\d/)) {
                const maybeUnit = normalize(parts[1]);
                const units = ['gr', 'g', 'kg', 'ml', 'cl', 'l', 'lt', 'kasik', 'bardak', 'fincan', 'adet', 'tane', 'kase', 'tutam', 'demet', 'dilim', 'paket', 'cay', 'su', 'yemek', 'tatli'];

                if (units.some(u => maybeUnit.includes(u))) {
                    // e.g. "1 su bardagi"
                    // Check if unit is 2 words (su bardagi)
                    if (['su', 'cay', 'yemek', 'tatli'].some(p => maybeUnit.includes(p)) && parts.length > 2) {
                        amount = parts.slice(0, 3).join(' ');
                        ingName = parts.slice(3).join(' ');
                    } else {
                        amount = parts.slice(0, 2).join(' ');
                        ingName = parts.slice(2).join(' ');
                    }
                } else {
                    // No unit found, just number (e.g. "2 Yumurta")
                    amount = parts[0];
                    ingName = parts.slice(1).join(' ');
                }
            }

            if (ingName.trim()) {
                ingredients.push({ amount, name: ingName });
            }

        } else if (section === 'steps') {
            // Subheader detection in steps
            if ((line.toLowerCase().includes('için') || line.endsWith(':')) && line.length < 40 && !line.match(/^\d/)) {
                currentStepGroupTitle = cleanLine.replace(/:$/, '');
                continue;
            }

            let description = line;
            let note = '';

            // Extract Note in Parentheses
            const parenMatch = line.match(/\((.*?)\)/);
            if (parenMatch) {
                note = parenMatch[1];
                // Remove from description to clean it up
                description = description.replace(parenMatch[0], '').replace(/\s{2,}/g, ' ').trim();
                if (note) {
                    description = `${description} (Not: ${note})`;
                }
            }

            // Remove numbering (1., 2.)
            description = description.replace(/^\d+[\.\-]\s*/, '').trim();

            if (description) {
                steps.push({
                    description,
                    title: currentStepGroupTitle || `Adım ${steps.length + 1}`
                });
            }
        } else {
            // Unknown section (top of file)
            // Heuristics to auto-detect Start
            if (line.match(/^[-*•]/)) {
                section = 'ingredients';
                ingredients.push({ amount: '', name: cleanLine });
            } else if (line.match(/^\d+[\.\)]/)) {
                section = 'steps';
                steps.push({ description: cleanLine.replace(/^\d+[\.\-]\s*/, ''), title: `Adım 1` });
            }
        }
    }

    // Fallback if nothing parsed
    if (ingredients.length === 0 && steps.length === 0) {
        steps.push({ description: text, title: 'Tüm Tarif' });
    }

    return { name, ingredients, steps, originalText: text, time: '?? dk', servings: '?? Kişilik', category: 'Genel' };
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
