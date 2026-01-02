
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF worker
// Note: In a Vite environment, we need to handle the worker source correctly.
// This approach uses the URL constructor which Vite supports for asset handling.
// Use CDN for worker to avoid build/path issues on Vercel
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface ScannedRecipe {
    name: string;
    ingredients: { name: string; amount: string; group?: string }[];
    steps: { description: string; title?: string }[];
    originalText: string;
    time: string;
    servings: string;
    category: string;
}

/**
 * Extracts text from an image using Tesseract.js
 * Returns the full Tesseract result object to allow font analysis (bold detection).
 */
export const extractTextFromImage = async (base64Image: string): Promise<any | null> => {
    try {
        const worker = await Tesseract.createWorker('tur'); // Use Turkish language
        const ret = await worker.recognize(`data:image/jpeg;base64,${base64Image}`);
        await worker.terminate();
        return ret.data; // Return full data, not just text
    } catch (error) {
        console.error("OCR Error:", error);
        // Fallback to English if Turkish fails or isn't downloaded
        try {
            const worker = await Tesseract.createWorker('eng');
            const ret = await worker.recognize(`data:image/jpeg;base64,${base64Image}`);
            await worker.terminate();
            return ret.data;
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
 * Heuristic parser to convert raw text (or Rich Tesseract Data) into a Recipe structure.
 */
export const parseRecipeFromText = (input: string | any): ScannedRecipe => {
    let lines: { text: string, words?: any[] }[] = [];
    let originalText = "";

    // Normalize input to a standard line structure
    if (typeof input === 'string') {
        originalText = input;
        lines = input.split('\n').map(l => ({ text: l.trim() })).filter(l => l.text.length > 0);
    } else if (input && input.lines) {
        originalText = input.text;
        // Map Tesseract lines to our structure
        lines = input.lines.map((l: any) => ({
            text: l.text.trim(),
            words: l.words // Keep words for font analysis
        })).filter((l: any) => l.text.length > 0);
    }

    let name = "Taranan Tarif";

    // Heuristic: Identify title
    if (lines.length > 0) {
        const candidate = lines[0].text;
        // If it doesn't look like a header, assume it's the title
        if (!candidate.match(/malzeme|yapılış|hazırlanış|bölüm|içindekiler|tarif/i)) {
            name = candidate.replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, ' ').trim();
        }
    }

    const ingredients: { name: string; amount: string; group?: string }[] = [];
    const steps: { description: string; title?: string }[] = [];

    let section: 'unknown' | 'ingredients' | 'steps' = 'unknown';

    // Helper: Normalize Turkish chars to English
    const normalize = (str: string) => str.toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z]/g, '');

    // Keywords
    const ingredientKeywords = ['malzeme', 'icindekiler', 'listesi', 'gerekli', 'ihtiyac', 'bilesenler'];
    const stepKeywords = ['yapilisi', 'hazirlanisi', 'tarif', 'yapim', 'nasil', 'hazirlama', 'adimlar', 'pisirme', 'uygulama'];

    const isHeader = (line: string, keywords: string[]) => {
        const clean = normalize(line);
        if (line.length > 40) return false;
        return keywords.some(k => clean.includes(k));
    };

    let currentStepGroupTitle = "";
    let currentIngredientGroup = "";

    // Accumulator for multi-line steps
    let pendingStep: { description: string, title?: string } | null = null;
    const commitPendingStep = () => {
        if (pendingStep && pendingStep.description.trim()) {
            steps.push({
                description: pendingStep.description.trim()
                // title intentionally removed
            });
            pendingStep = null;
        }
    };
    const pendingStepTitleFromIndex = (idx: number) => `Adım ${idx + 1}`;

    for (let i = 0; i < lines.length; i++) {
        const lineObj = lines[i];
        const lineText = lineObj.text;

        // Skip title line
        if (i === 0 && lineText.includes(name) && name !== "Taranan Tarif") continue;

        // Skip garbage
        if (lineText.replace(/\s/g, '').length < 3) continue;

        // Strip bullets first (for generic cleaning)
        let cleanLine = lineText.replace(/^[\s-*•·>]+/, '').trim();

        // Detect if line starts with a number (for step splitting)
        // We generally look at lineText for structure
        const isNumberedLine = /^\d+[\.\)]\s/.test(cleanLine) || /^\d+[\.\)]\s/.test(lineText.trim());

        // Strip numbering like "1." or "1)"
        cleanLine = cleanLine.replace(/^\d+[\.\)]\s+/, '');

        // 1. Check for Explicit Section Headers
        if (isHeader(lineText, ingredientKeywords)) {
            commitPendingStep();
            section = 'ingredients';
            continue;
        }
        if (isHeader(lineText, stepKeywords)) {
            commitPendingStep();
            section = 'steps';
            continue;
        }

        // 2. Failsafe: Detect section switch
        if (section === 'ingredients') {
            if (isNumberedLine && lineText.length > 20) {
                commitPendingStep();
                section = 'steps';
            }
        }

        // 3. Process Content
        if (section === 'ingredients') {
            // Check for Subheader
            const isSubHeader = lineText.endsWith(':') ||
                (!lineText.match(/^[\d-*•]/) && lineText.length < 30 && (lineText === lineText.toUpperCase() || lineText.toLowerCase().includes('için')));

            if (isSubHeader) {
                currentIngredientGroup = cleanLine.replace(/:$/, '').trim();
                continue;
            }

            // Regular Ingredient Parsing

            // BOLD DETECTION STRATEGY
            let amount = '';
            let ingName = cleanLine;
            let boldDetected = false;

            if (lineObj.words && lineObj.words.length > 0) {
                const isBold = (w: any) => {
                    const fp = w.font_properties;
                    return fp && (fp.is_bold || fp.bold || (fp.font_weight && fp.font_weight > 600));
                };

                const boldWords = lineObj.words.filter((w: any) => isBold(w));
                // Filter regular words: exclude those that look like list bullets (e.g. "1.")
                const regularWords = lineObj.words.filter((w: any) => !isBold(w) && !/^\d+[\.\)]$/.test(w.text));

                // User logic: "Kalın olan name, kalın olmayan amount"
                if (boldWords.length > 0 && regularWords.length > 0) {
                    amount = regularWords.map((w: any) => w.text).join(' ');
                    ingName = boldWords.map((w: any) => w.text).join(' ');
                    boldDetected = true;
                }
            }

            // Fallback to text analysis
            if (!boldDetected) {
                const parts = cleanLine.split(' ');
                const modifiers = ['orta', 'boy', 'büyük', 'küçük', 'yarım', 'çeyrek', 'tam', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz', 'on'];
                const units = ['gr', 'g', 'kg', 'ml', 'cl', 'l', 'lt', 'kaşık', 'bardak', 'fincan', 'adet', 'tane', 'kase', 'tutam', 'demet', 'dilim', 'paket', 'çay', 'su', 'yemek', 'tatlı', 'kutu', 'kavanoz', 'diş'];
                const prepMethods = ['rende', 'doğranmış', 'kıyılmış', 'ezilmiş', 'haşlanmış', 'rendelenmiş', 'soyulmuş', 'eritilmiş', 'kızarmış'];

                let cutoffIndex = 0;

                if (parts.length > 0) {
                    const first = normalize(parts[0]);
                    if (parts[0].match(/^\d/) || prepMethods.some(p => first.includes(p)) || modifiers.some(m => first === m)) {
                        cutoffIndex = 1;
                        for (let i = 1; i < parts.length; i++) {
                            const p = normalize(parts[i]);
                            if (units.some(u => p.includes(u)) || modifiers.some(m => p === m) || prepMethods.some(pm => p.includes(pm)) || parts[i].match(/^\d/)) {
                                cutoffIndex = i + 1;
                            } else {
                                break;
                            }
                        }
                    }
                }

                if (cutoffIndex > 0) {
                    amount = parts.slice(0, cutoffIndex).join(' ');
                    ingName = parts.slice(cutoffIndex).join(' ');
                } else {
                    amount = '';
                    ingName = cleanLine;
                }
            }

            if (ingName.trim()) {
                ingredients.push({ amount: amount.trim(), name: ingName.trim(), group: currentIngredientGroup });
            }

        } else if (section === 'steps') {
            // Subheader detection in steps
            if ((lineText.toLowerCase().includes('için') || lineText.endsWith(':')) && lineText.length < 40 && !lineText.match(/^\d/)) {
                commitPendingStep();
                currentStepGroupTitle = cleanLine.replace(/:$/, '');
                continue;
            }

            let description = cleanLine;
            let note = '';

            const parenMatch = description.match(/\((.*?)\)/);
            if (parenMatch) {
                note = parenMatch[1];
                description = description.replace(parenMatch[0], '').replace(/\s{2,}/g, ' ').trim();
                if (note) {
                    description = `${description} (Not: ${note})`;
                }
            }

            if (isNumberedLine) {
                commitPendingStep();
                pendingStep = {
                    description: description,
                    title: currentStepGroupTitle
                };
            } else {
                if (pendingStep) {
                    pendingStep.description += " " + description;
                } else {
                    // Implicit first step
                    pendingStep = {
                        description: description,
                        title: currentStepGroupTitle
                    };
                }
            }
        } else {
            // Unknown section
            if (lineText.match(/^[-*•]/)) {
                section = 'ingredients';
                ingredients.push({ amount: '', name: cleanLine });
            } else if (isNumberedLine) {
                section = 'steps';
                pendingStep = {
                    description: cleanLine,
                    title: ''
                };
            }
        }
    }

    commitPendingStep();

    if (ingredients.length === 0 && steps.length === 0) {
        steps.push({ description: originalText, title: 'Tüm Tarif' });
    }

    return {
        name,
        ingredients,
        steps,
        originalText,
        time: '?? dk',
        servings: '?? Kişilik',
        category: 'Genel'
    };
};

// Main Service Functions

export const analyzeRecipeImage = async (base64Image: string) => {
    const data = await extractTextFromImage(base64Image);
    if (!data) return null;
    return parseRecipeFromText(data);
};

export const analyzeMultipleRecipesFromDoc = async (files: { mimeType: string, data: string }[]) => {
    const allRecipes: any[] = [];

    for (const file of files) {
        if (file.mimeType === 'application/pdf') {
            const pageTexts = await extractTextFromPDF(file.data);
            pageTexts.forEach(text => {
                const recipe = parseRecipeFromText(text);
                if (recipe.ingredients.length > 0 || recipe.steps.length > 0) {
                    allRecipes.push({ ...recipe, category: 'Genel', time: '?? dk', servings: '?? Kişilik' });
                }
            });
        } else if (file.mimeType.startsWith('image/')) {
            const data = await extractTextFromImage(file.data);
            if (data) {
                const recipe = parseRecipeFromText(data);
                allRecipes.push({ ...recipe, category: 'Genel', time: '?? dk', servings: '?? Kişilik' });
            }
        }
    }
    return allRecipes;
};
