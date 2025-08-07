// Global state
let currentStep = 1;
let selectedGenre = '';
let storyData = {};
import { NovitaSDK, TaskStatus } from "https://cdn.skypack.dev/novita-sdk";

let aiSettings = {
    model: 'grok-3-mini',
    creativity: 70,
    apiKey: '',
    novitaApiKey: ''
};

let novitaClient = null;

// DOM elements
const steps = document.querySelectorAll('.step');
const genreCards = document.querySelectorAll('.genre-card');
const storyForm = document.querySelector('.story-form');
const backBtn = document.getElementById('back-btn');
const generateBtn = document.getElementById('generate-btn');
const newStoryBtn = document.getElementById('new-story-btn');
const editStoryBtn = document.getElementById('edit-story-btn');
const exportPdfBtn = document.getElementById('export-pdf-btn');
const settingsBtn = document.getElementById('settings-btn');
const aiModal = document.getElementById('ai-modal');
const closeModal = document.querySelector('.close-modal');
const saveSettingsBtn = document.getElementById('save-settings');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('Script loaded! Current model:', aiSettings.model);
    initializeApiKeys();
    initializeEventListeners();
    loadSettings();
});

function initializeApiKeys() {
    // Load API keys from config.js
    if (window.API_CONFIG) {
        aiSettings.apiKey = window.API_CONFIG.grokApiKey || '';
        aiSettings.novitaApiKey = window.API_CONFIG.novitaApiKey || '';
        
        if (aiSettings.apiKey && aiSettings.apiKey !== 'your-grok-api-key-here') {
            console.log('✅ Grok API key loaded');
        } else {
            console.warn('⚠️  Grok API key not configured. Please check config.js');
        }
        
        if (aiSettings.novitaApiKey && aiSettings.novitaApiKey !== 'your-novita-api-key-here') {
            console.log('✅ Novita API key loaded');
            novitaClient = new NovitaSDK(aiSettings.novitaApiKey);
        } else {
            console.warn('⚠️  Novita API key not configured. Please check config.js');
        }
    } else {
        console.error('❌ config.js not found! Please copy config.example.js to config.js and add your API keys');
        showNotification('API configuration missing! Please set up your API keys.', 'error');
    }
}

function initializeEventListeners() {
    // Genre selection
    genreCards.forEach(card => {
        card.addEventListener('click', () => selectGenre(card));
    });
    
    // Form submission
    storyForm.addEventListener('submit', handleFormSubmit);
    
    // Navigation buttons
    backBtn.addEventListener('click', () => goToStep(1));
    newStoryBtn.addEventListener('click', resetApp);
    editStoryBtn.addEventListener('click', editStory);
    exportPdfBtn.addEventListener('click', exportToPDF);
    
    // Settings modal
    settingsBtn.addEventListener('click', () => openModal(aiModal));
    closeModal.addEventListener('click', () => closeModalHandler(aiModal));
    saveSettingsBtn.addEventListener('click', saveSettings);
    
    // Close modal on background click
    aiModal.addEventListener('click', (e) => {
        if (e.target === aiModal) closeModalHandler(aiModal);
    });
    
    // Image inclusion change handler
    const includeImagesSelect = document.getElementById('include-images');
    const imageSettings = document.getElementById('image-settings');
    includeImagesSelect.addEventListener('change', function() {
        if (this.value === 'yes') {
            imageSettings.style.display = 'block';
        } else {
            imageSettings.style.display = 'none';
        }
    });
    
    // No auto-advance timeout needed - genre selection advances immediately
}

function selectGenre(card) {
    // Remove previous selection
    genreCards.forEach(c => c.classList.remove('selected'));
    
    // Add selection to clicked card
    card.classList.add('selected');
    selectedGenre = card.dataset.genre;
    
    // Add quick visual feedback
    card.style.transform = 'scale(1.05)';
    setTimeout(() => {
        card.style.transform = '';
    }, 150);
    
    // Advance immediately
    setTimeout(() => {
        goToStep(2);
    }, 200);
}

function goToStep(step) {
    // Hide current step
    steps[currentStep - 1].classList.remove('active');
    
    // Show new step
    currentStep = step;
    steps[currentStep - 1].classList.add('active');
    
    // Update form based on genre
    if (step === 2 && selectedGenre) {
        updateFormForGenre();
    }
}

function updateFormForGenre() {
    const protagonist = document.getElementById('protagonist');
    const setting = document.getElementById('setting');
    const conflict = document.getElementById('conflict');
    
    // Clear placeholder examples to avoid using hardcoded story examples
    protagonist.placeholder = 'Describe your main character...';
    setting.placeholder = 'Describe where your story takes place...';
    conflict.placeholder = 'What challenge or conflict will they face...';
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    // Collect form data
    storyData = {
        genre: selectedGenre,
        protagonist: document.getElementById('protagonist').value,
        setting: document.getElementById('setting').value,
        conflict: document.getElementById('conflict').value,
        tone: document.getElementById('tone').value,
        pages: parseInt(document.getElementById('pages').value),
        inspiration: document.getElementById('inspiration').value,
        textLength: document.getElementById('text-length').value,
        fontStyle: document.getElementById('font-style').value,
        colorTheme: document.getElementById('color-theme').value,
        includeImages: document.getElementById('include-images').value === 'yes',
        artStyle: document.getElementById('art-style').value
    };
    
    // Validate required fields
    if (!storyData.protagonist || !storyData.setting || !storyData.conflict || !storyData.tone || 
        !storyData.pages || !storyData.textLength || !storyData.fontStyle || !storyData.colorTheme) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Validate image settings if images are requested
    if (storyData.includeImages) {
        if (!storyData.artStyle) {
            showNotification('Please choose an art style', 'error');
            return;
        }
    }
    
    // Go to loading step
    goToStep(3);
    
    // Generate story
    generateStory();
}

async function generateStory() {
    try {
        // Clear previous thinking stream
        const thinkingContent = document.getElementById('thinking-content');
        if (thinkingContent) {
            thinkingContent.innerHTML = '<div class="thinking-line">Initializing story generation...</div>';
        }
        
        // Add thinking stream for story generation
        addThinkingLine(`[STORY] Starting generation for ${storyData.genre} story`, 'system');
        addThinkingLine(`[STORY] Protagonist: ${storyData.protagonist}`, 'system');
        addThinkingLine(`[STORY] Setting: ${storyData.setting}`, 'system');
        addThinkingLine(`[STORY] Conflict: ${storyData.conflict}`, 'system');
        updateProgress(10);
        
        // Generate the story pages
        updateLoadingText('Creating your story book...');
        addThinkingLine(`[STORY] Calling Grok API for ${storyData.pages} pages...`, 'system');
        const storyPages = await generateStoryPages(storyData);
        
        addThinkingLine(`[STORY] Generated "${storyPages.title}" successfully`, 'response');
        updateProgress(40);
        
        // Generate images if requested
        if (storyData.includeImages) {
            addThinkingLine(`[IMAGES] Starting image generation for ${storyData.pages + 1} images`, 'system');
            updateProgress(50);
            
            // Generate title image
            updateLoadingText('Creating title illustration...');
            addThinkingLine(`[IMAGES] Creating title image...`, 'system');
            const titleImage = await generateTitleImage(storyData, storyPages.title);
            
            updateProgress(60);
            updateLoadingText('Generating image descriptions...');
            addThinkingLine(`[IMAGES] Generating image prompts...`, 'system');
            const imagePrompts = await generateImagePrompts(storyPages, storyData);
            
            // Generate page images
            updateProgress(70);
            updateLoadingText('Creating illustrations...');
            addThinkingLine(`[IMAGES] Creating ${imagePrompts.length} page illustrations...`, 'system');
            const images = await generateStoryImages(imagePrompts, storyData);
            
            updateProgress(95);
            addThinkingLine(`[COMPLETE] Assembling final story book...`, 'system');
            updateLoadingText('Finalizing your story...');
            
            // Combine story pages with images
            displayStoryBook(storyPages, images, titleImage);
        } else {
            updateProgress(80);
            addThinkingLine(`[COMPLETE] Assembling text-only story book...`, 'system');
            updateLoadingText('Finalizing your story...');
            displayStoryBook(storyPages, [], null);
        }
        
        updateProgress(100);
        addThinkingLine(`[COMPLETE] Story generation finished!`, 'response');
        
        // Wait a moment for user to see completion
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Go to story display step
        goToStep(4);
        
    } catch (error) {
        console.error('Error generating story:', error);
        addThinkingLine(`[ERROR] Generation failed: ${error.message}`, 'system');
        showNotification('Failed to generate story. Please try again.', 'error');
        goToStep(2);
    }
}

async function generateStoryPages(data) {
    const prompt = createStoryPrompt(data);
    
    try {
        addThinkingLine(`[GROK] Connecting to x.ai API...`, 'system');
        addThinkingLine(`[GROK] Model: ${aiSettings.model}`, 'system');
        addThinkingLine(`[GROK] Temperature: ${aiSettings.creativity / 100}`, 'system');
        addThinkingLine(`[GROK] Generating ${data.pages} pages...`, 'prompt');
        
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${aiSettings.apiKey}`
            },
            body: JSON.stringify({
                model: aiSettings.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a creative storyteller who creates illustrated children\'s books and novels. Format your response as a JSON object with a "title" field and a "pages" array. Each page should have 1-2 paragraphs of story content.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 8000,
                temperature: aiSettings.creativity / 100
            })
        });

        if (!response.ok) {
            addThinkingLine(`[ERROR] API request failed: ${response.status}`, 'system');
            throw new Error(`Story API Error: ${response.status}`);
        }

        addThinkingLine(`[GROK] Response received, parsing story...`, 'system');
        const result = await response.json();
        const content = result.choices[0].message.content;
        
        try {
            // Try to parse as JSON first
            const parsed = JSON.parse(content);
            if (parsed.title && parsed.pages) {
                addThinkingLine(`[GROK] Story parsed successfully: "${parsed.title}"`, 'response');
                return parsed;
            }
        } catch (e) {
            addThinkingLine(`[GROK] JSON parse failed, using manual parser...`, 'system');
            // Fallback: parse manually
            const manualParsed = parseStoryManually(content, data.pages);
            addThinkingLine(`[GROK] Manual parse complete: "${manualParsed.title}"`, 'response');
            return manualParsed;
        }
        
    } catch (error) {
        console.error('Error generating story pages:', error);
        addThinkingLine(`[ERROR] Story generation failed: ${error.message}`, 'system');
        addThinkingLine(`[FALLBACK] Using demo story...`, 'system');
        // Fallback to simple demo
        return generateFallbackStory(data);
    }
}

function createStoryPrompt(data) {
    let pageText;
    switch(data.textLength) {
        case 'short':
            pageText = "1-2 sentences";
            break;
        case 'medium':
            pageText = "1-2 paragraphs";
            break;
        case 'long':
            pageText = "2-3 paragraphs";
            break;
        default:
            pageText = "1-2 paragraphs";
    }
    
    let prompt = `Create a ${data.tone} ${data.genre} story with exactly ${data.pages} pages.

Story Details:
- Main character: ${data.protagonist}
- Setting: ${data.setting}
- Conflict/Challenge: ${data.conflict}
- Tone: ${data.tone}
- Number of pages: ${data.pages}
- Text length per page: ${pageText}`;

    if (data.inspiration && data.inspiration.trim()) {
        prompt += `
- Additional inspiration/themes: ${data.inspiration}`;
    }

    prompt += `

Format your response as a JSON object with this structure:
{
  "title": "Story Title",
  "pages": [
    "Page 1 content (${pageText})",
    "Page 2 content (${pageText})",
    ...
  ]
}

Each page should contain ${pageText} that advance the story. The story should have:
1. A compelling opening
2. Character development
3. Rising action and conflict
4. A satisfying climax and resolution
5. Vivid, visual descriptions perfect for illustrations

Make each page engaging and visual, as it will have an accompanying illustration.
- For short text: Focus on key moments, dialogue, and action
- For medium text: Include good detail and scene description
- For long text: Provide rich detail, character thoughts, and atmospheric description`;

    return prompt;
}

async function generateImagePrompts(storyPages, storyData) {
    const imagePrompts = [];
    
    // Process each page individually for better, more specific prompts
    for (let i = 0; i < storyPages.pages.length; i++) {
        updateLoadingText(`Analyzing page ${i + 1} for best illustration...`);
        
        const pageContent = storyPages.pages[i];
        const prompt = createIndividualPagePrompt(pageContent, i + 1, storyData);
        
        try {
            const response = await fetch('https://api.x.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${aiSettings.apiKey}`
                },
                body: JSON.stringify({
                    model: aiSettings.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert at creating compelling image prompts for story illustrations. Analyze the story content and create prompts that show ACTION, CHARACTERS, and EVENTS happening - not empty scenes. If there\'s a bear chasing someone, show the bear chasing the person. If someone is fighting a dragon, show the fight. If there\'s dialogue, show the characters speaking. Always prioritize showing what is actually HAPPENING in the story over just showing empty locations.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.3
                })
            });

            const result = await response.json();
            const imagePrompt = result.choices[0].message.content.trim();
            imagePrompts.push(imagePrompt);
            
        } catch (error) {
            console.error(`Error generating prompt for page ${i + 1}:`, error);
            // Fallback prompt focused on environment
            imagePrompts.push(`Beautiful ${data.setting} landscape in ${data.artStyle} style, atmospheric and detailed`);
        }
    }
    
    return imagePrompts;
}

function createIndividualPagePrompt(pageContent, pageNumber, storyData) {
    return `Analyze this story page and create the most compelling image prompt:

PAGE ${pageNumber} CONTENT:
"${pageContent}"

STORY CONTEXT:
- Main Character: ${storyData.protagonist}
- Setting: ${storyData.setting}
- Main Conflict: ${storyData.conflict}
- Genre: ${storyData.genre}
- Art Style: ${storyData.artStyle}

INSTRUCTIONS FOR CREATING THE BEST IMAGE:
1. READ the page content carefully and identify what is ACTUALLY HAPPENING
2. If there are characters doing things, SHOW them doing those things
3. If there's action (fighting, running, talking, etc.), SHOW the action
4. If there's danger or conflict, SHOW the danger/conflict
5. If characters are interacting, SHOW the interaction
6. Balance action with the environment - show both characters AND setting
7. Use "the character" or "a person" instead of names/pronouns

PRIORITY ORDER:
1st: Show characters performing actions mentioned in the text
2nd: Show important objects or creatures mentioned
3rd: Show the environment that supports the action

CRITICAL REQUIREMENTS:
- Focus on WHAT IS HAPPENING, not just where it's happening
- If someone is being chased, show the chase
- If someone is talking, show them talking
- If someone discovers something, show the discovery
- Include the protagonist/main character when they're involved in the scene
- Make it dramatic and engaging, not static or empty
- Be specific about character actions, expressions, and poses
- Include environmental details that enhance the action

Create a detailed image prompt (150-200 words) that shows the ACTION and CHARACTERS from this page.`;
}

function parseStoryManually(content, pageCount) {
    const lines = content.split('\n').filter(line => line.trim());
    const title = lines[0] || 'Untitled Story';
    
    // Try to split content into pages
    const pages = [];
    let currentPage = '';
    let pageNum = 0;
    
    for (let i = 1; i < lines.length && pageNum < pageCount; i++) {
        const line = lines[i];
        
        if (line.includes('Page') || currentPage.length > 300) {
            if (currentPage.trim()) {
                pages.push(currentPage.trim());
                pageNum++;
                currentPage = '';
            }
        }
        
        if (!line.includes('Page')) {
            currentPage += line + '\n';
        }
    }
    
    if (currentPage.trim() && pageNum < pageCount) {
        pages.push(currentPage.trim());
    }
    
    // Ensure we have the right number of pages
    while (pages.length < pageCount) {
        pages.push('The story continues...');
    }
    
    return { title, pages: pages.slice(0, pageCount) };
}

function generateFallbackStory(data) {
    return {
        title: `The Adventure of ${data.protagonist}`,
        pages: Array(data.pages).fill(0).map((_, i) => 
            `This is page ${i + 1} of the story about ${data.protagonist} in ${data.setting}. The adventure continues as they face ${data.conflict}.`
        )
    };
}

function updateLoadingText(text) {
    const loadingText = document.querySelector('.loading-text');
    if (loadingText) {
        loadingText.textContent = text;
    }
}

function updateProgress(percentage) {
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
}

function addThinkingLine(text, type = 'default') {
    const thinkingContent = document.getElementById('thinking-content');
    if (!thinkingContent) return;
    
    // Remove current cursor from previous line
    const currentLines = thinkingContent.querySelectorAll('.thinking-line.current');
    currentLines.forEach(line => line.classList.remove('current'));
    
    // Create new line
    const line = document.createElement('div');
    line.className = `thinking-line ${type} current`;
    line.textContent = text;
    
    thinkingContent.appendChild(line);
    
    // Auto-scroll to bottom
    thinkingContent.scrollTop = thinkingContent.scrollHeight;
    
    // Animate the line
    setTimeout(() => {
        line.style.animationDelay = '0s';
    }, 50);
}

async function simulateThinking(content, delay = 100) {
    const lines = content.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
        addThinkingLine(line);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}

async function generateTitleImage(storyData, storyTitle) {
    try {
        updateLoadingText('Creating title page illustration...');
        const titlePrompt = `Create a stunning book cover illustration for "${storyTitle}" - a ${storyData.genre} story.

MAIN ELEMENTS TO INCLUDE:
- Main Character: ${storyData.protagonist} (describe their appearance based on common visual traits)
- Setting: ${storyData.setting}
- Conflict/Adventure: ${storyData.conflict}
- Mood: ${storyData.tone}
- Genre: ${storyData.genre}

COMPOSITION REQUIREMENTS:
- Show the main character prominently - describe what they look like based on their description
- Include key elements from the setting in the background
- Hint at the adventure/conflict they'll face
- Make it dynamic and engaging like a movie poster
- Include dramatic lighting and atmospheric effects
- Perfect composition for a book cover with space for title text
- Show character in an action pose or meaningful stance

VISUAL STYLE:
- Epic and cinematic
- Rich colors and dramatic lighting  
- Professional book cover quality
- Captures the essence of the ${storyData.genre} genre
- ${storyData.tone} mood and atmosphere

Create a detailed prompt (200+ words) that describes the character's appearance, pose, setting, and the dramatic scene for this book cover.`;
        
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${aiSettings.apiKey}`
            },
            body: JSON.stringify({
                model: aiSettings.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert at creating detailed book cover image prompts. Focus on describing characters visually and creating epic, dramatic scenes perfect for book covers.'
                    },
                    {
                        role: 'user',
                        content: titlePrompt
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        let enhancedTitlePrompt;
        if (response.ok) {
            const result = await response.json();
            enhancedTitlePrompt = result.choices[0].message.content.trim();
        } else {
            // Fallback if API fails
            enhancedTitlePrompt = `Epic book cover showing ${storyData.protagonist} in ${storyData.setting}, facing ${storyData.conflict}, ${storyData.tone} mood, ${storyData.genre} style`;
        }
        
        const finalPrompt = enhanceImagePrompt(enhancedTitlePrompt, storyData);
        const imageUrl = await callNovitaImageAPI(finalPrompt, storyData);
        return {
            url: imageUrl,
            prompt: finalPrompt
        };
    } catch (error) {
        console.error('Error generating title image:', error);
        return {
            url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzA0IiBoZWlnaHQ9IjQ0OCIgdmlld0JveD0iMCAwIDcwNCA0NDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI3MDQiIGhlaWdodD0iNDQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNTIgMjAwVjI0OCIgc3Ryb2tlPSIjOUI5QkEwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8cGF0aCBkPSJNMzI4IDIyNEgzNzYiIHN0cm9rZT0iIzlCOUJBMCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPHRleHQgeD0iMzUyIiB5PSIyODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlCOUJBMCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VGl0bGUgSW1hZ2UgRmFpbGVkPC90ZXh0Pgo8L3N2Zz4=',
            prompt: titlePrompt
        };
    }
}

async function generateStoryImages(imagePrompts, storyData) {
    const images = [];
    const totalImages = imagePrompts.length;
    
    for (let i = 0; i < imagePrompts.length; i++) {
        updateLoadingText(`Generating image ${i + 1} of ${imagePrompts.length}...`);
        addThinkingLine(`[IMAGES] Starting image ${i + 1}/${totalImages}...`, 'system');
        
        // Update progress: 70% base + (25% * progress through images)
        const imageProgress = 70 + (25 * (i / totalImages));
        updateProgress(imageProgress);
        
        try {
            const enhancedPrompt = enhanceImagePrompt(imagePrompts[i], storyData);
            const imageUrl = await callNovitaImageAPI(enhancedPrompt, storyData);
            
            images.push({
                url: imageUrl,
                prompt: enhancedPrompt
            });
            
            addThinkingLine(`[IMAGES] Image ${i + 1}/${totalImages} completed`, 'response');
        } catch (error) {
            console.error(`Error generating image ${i + 1}:`, error);
            addThinkingLine(`[ERROR] Image ${i + 1} failed, using placeholder`, 'system');
            // Add blank image for failed generation
            images.push({
                url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzA0IiBoZWlnaHQ9IjQ0OCIgdmlld0JveD0iMCAwIDcwNCA0NDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI3MDQiIGhlaWdodD0iNDQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNTIgMjAwVjI0OCIgc3Ryb2tlPSIjOUI5QkEwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8cGF0aCBkPSJNMzI4IDIyNEgzNzYiIHN0cm9rZT0iIzlCOUJBMCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPHRleHQgeD0iMzUyIiB5PSIyODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlCOUJBMCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2UgR2VuZXJhdGlvbiBGYWlsZWQ8L3RleHQ+Cjwvc3ZnPg==',
                prompt: imagePrompts[i]
            });
        }
    }
    
    return images;
}

function enhanceImagePrompt(basePrompt, storyData) {
    const styleMap = {
        // Cartoon & Animated styles
        'disney-pixar': 'Disney Pixar style, 3D cartoon animation, expressive characters, warm lighting',
        'comic-book': 'comic book style, bold outlines, vibrant colors, dynamic composition',
        'anime-manga': 'anime manga style, expressive eyes, detailed backgrounds, cel shading',
        'watercolor-cartoon': 'watercolor cartoon style, soft brush strokes, flowing colors, artistic',
        'hand-drawn': 'hand-drawn illustration, sketchy lines, traditional art feel',
        'childrens-book': 'children\'s book illustration style, whimsical, colorful, friendly',
        'vector-art': 'vector art style, clean lines, flat colors, geometric shapes',
        'sketch-style': 'pencil sketch style, grayscale, artistic shading, hand-drawn feel',
        
        // Realistic & Artistic styles
        'photorealistic': 'photorealistic, ultra detailed, professional photography, cinematic lighting',
        'cinematic': 'cinematic photography, dramatic lighting, film composition, high detail',
        'fantasy-realistic': 'fantasy realistic art, detailed digital painting, magical atmosphere',
        'oil-painting': 'oil painting style, traditional art, rich textures, masterpiece quality',
        'digital-art': 'digital art, concept art style, detailed illustration, professional quality',
        'concept-art': 'concept art style, detailed environment design, atmospheric lighting',
        'matte-painting': 'matte painting style, epic landscape, cinematic composition, detailed',
        'vintage-photo': 'vintage photography style, film grain, nostalgic atmosphere, retro'
    };
    
    const style = styleMap[storyData.artStyle] || 'illustration style';
    
    // For cartoon styles, clean up realistic terms; for realistic styles, enhance them
    let cleanedPrompt = basePrompt;
    if (storyData.artStyle && ['disney-pixar', 'comic-book', 'anime-manga', 'watercolor-cartoon', 
                               'hand-drawn', 'childrens-book', 'vector-art', 'sketch-style'].includes(storyData.artStyle)) {
        // Cartoon styles - remove realistic terms
        cleanedPrompt = basePrompt
            .replace(/photorealistic|realistic|photograph/gi, 'cartoon')
            .replace(/photo/gi, 'illustration');
        return `${cleanedPrompt}, ${style}, high quality cartoon illustration, no text or words`;
    } else {
        // Realistic styles - keep or enhance realistic terms
        return `${cleanedPrompt}, ${style}, high quality illustration, no text or words`;
    }
}

function truncatePrompt(prompt, maxLength = 500) {
    if (prompt.length <= maxLength) return prompt;
    
    // Find the last complete sentence within the limit
    const truncated = prompt.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastComma = truncated.lastIndexOf(',');
    
    // Use the last period or comma, whichever comes later
    const cutPoint = Math.max(lastPeriod, lastComma);
    
    if (cutPoint > 100) { // Make sure we don't cut too short
        return truncated.substring(0, cutPoint + 1);
    } else {
        return truncated + '...';
    }
}

async function callNovitaImageAPI(prompt, storyData) {
    try {
        if (!novitaClient) {
            throw new Error('Novita client not initialized');
        }

        addThinkingLine(`[IMAGE] Sending prompt to Novita AI...`, 'system');
        addThinkingLine(`[IMAGE] Model: cyberrealistic_v31`, 'system');
        addThinkingLine(`[IMAGE] Prompt: ${prompt.substring(0, 80)}...`, 'prompt');

        const truncatedPrompt = truncatePrompt(prompt, 400);
        const negativePrompt = "blurry, low quality, distorted, text, watermark, signature, bad anatomy";

        const params = {
            request: {
                model_name: "cyberrealistic_v31_62396.safetensors",
                prompt: truncatedPrompt,
                negative_prompt: negativePrompt,
                width: 1024,
                height: 768,
                sampler_name: "DPM++ 2S a Karras",
                guidance_scale: 7.5,
                steps: 20,
                image_num: 1,
                clip_skip: 1,
                seed: -1,
                loras: [],
            },
        };

        const response = await novitaClient.txt2ImgV3(params);
        
        if (!response || !response.task_id) {
            throw new Error('No task ID received from Novita API');
        }

        addThinkingLine(`[IMAGE] Task queued: ${response.task_id}`, 'system');
        addThinkingLine(`[IMAGE] Waiting for image generation...`, 'system');

        // Poll for completion
        return await pollForImageCompletion(response.task_id);
        
    } catch (error) {
        console.error('Error calling Novita API:', error);
        addThinkingLine(`[ERROR] Image generation failed: ${error.message}`, 'system');
        // Return blank/error image instead of random placeholders
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzA0IiBoZWlnaHQ9IjQ0OCIgdmlld0JveD0iMCAwIDcwNCA0NDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI3MDQiIGhlaWdodD0iNDQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNTIgMjAwVjI0OCIgc3Ryb2tlPSIjOUI5QkEwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8cGF0aCBkPSJNMzI4IDIyNEgzNzYiIHN0cm9rZT0iIzlCOUJBMCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPHRleHQgeD0iMzUyIiB5PSIyODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlCOUJBMCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2UgR2VuZXJhdGlvbiBGYWlsZWQ8L3RleHQ+Cjwvc3ZnPg==';
    }
}

async function pollForImageCompletion(taskId) {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        try {
            const progressRes = await novitaClient.progress({ task_id: taskId });
            
            if (progressRes.task.status === TaskStatus.SUCCEED) {
                addThinkingLine(`[IMAGE] Generation completed successfully!`, 'response');
                if (progressRes.images && progressRes.images.length > 0) {
                    return progressRes.images[0].image_url;
                } else {
                    throw new Error('No images in successful response');
                }
            } else if (progressRes.task.status === TaskStatus.FAILED) {
                addThinkingLine(`[ERROR] Image generation failed: ${progressRes.task.reason}`, 'system');
                throw new Error(`Image generation failed: ${progressRes.task.reason || 'Unknown error'}`);
            } else if (progressRes.task.status === TaskStatus.QUEUED) {
                if (attempts % 6 === 0) { // Show every 30 seconds
                    addThinkingLine(`[IMAGE] Still in queue... (${Math.floor(attempts * 5 / 60)}m ${(attempts * 5) % 60}s)`, 'system');
                }
            }
            
            // Still processing, wait and try again
            await new Promise(resolve => setTimeout(resolve, 5000));
            attempts++;
            
        } catch (error) {
            console.error(`Polling attempt ${attempts + 1} failed:`, error);
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    throw new Error('Image generation timed out after 5 minutes');
}

function displayStoryBook(storyPages, images, titleImage) {
    const bookContainer = document.getElementById('story-book');
    const storyTitle = document.getElementById('story-title');
    const wordCount = document.getElementById('word-count');
    
    // Update title and metadata
    storyTitle.textContent = storyPages.title;
    const totalWords = storyPages.pages.join(' ').split(' ').filter(word => word.length > 0).length;
    wordCount.textContent = `${storyPages.pages.length} pages • ${totalWords} words`;
    
    // Apply theme and font classes to book container
    bookContainer.className = `story-book font-${storyData.fontStyle} theme-${storyData.colorTheme}`;
    
    // Clear and rebuild book
    bookContainer.innerHTML = '';
    
    // Create title page
    const titlePage = document.createElement('div');
    titlePage.className = 'story-page story-title-page';
    let titleHTML = '';
    
    // Add title image if available
    if (titleImage && titleImage.url) {
        titleHTML += `<img src="${titleImage.url}" alt="Title illustration" class="page-image">`;
    }
    
    titleHTML += `
        <h1>${storyPages.title}</h1>
        <div class="story-subtitle">An AI-Generated Story</div>
        <div class="story-meta-page">
            ${storyPages.pages.length} pages • ${storyData.genre.charAt(0).toUpperCase() + storyData.genre.slice(1)}
        </div>
    `;
    titlePage.innerHTML = titleHTML;
    bookContainer.appendChild(titlePage);
    
    // Create story pages
    storyPages.pages.forEach((pageContent, index) => {
        const pageDiv = document.createElement('div');
        pageDiv.className = 'story-page';
        
        let pageHTML = '';
        
        // Add image if available
        if (images[index]) {
            pageHTML += `
                <div class="image-container">
                    <img src="${images[index].url}" alt="Illustration for page ${index + 1}" class="page-image">
                    <button class="regenerate-image-btn" onclick="regenerateImage(${index})" title="Regenerate this image">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>`;
        }
        
        // Add text content with appropriate length class
        pageHTML += `
            <div class="page-text text-${storyData.textLength}">
                ${pageContent.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('')}
            </div>
            <div class="page-number">Page ${index + 1}</div>
        `;
        
        pageDiv.innerHTML = pageHTML;
        bookContainer.appendChild(pageDiv);
    });
}

function resetApp() {
    currentStep = 1;
    selectedGenre = '';
    storyData = {};
    
    // Reset form
    storyForm.reset();
    
    // Clear selections
    genreCards.forEach(card => card.classList.remove('selected'));
    
    // Go to first step
    goToStep(1);
}

function editStory() {
    // Go back to the form to edit story parameters
    goToStep(2);
    showNotification('Edit your story settings and regenerate', 'info');
}

async function regenerateImage(pageIndex) {
    try {
        const imageContainer = document.querySelectorAll('.image-container')[pageIndex];
        const img = imageContainer.querySelector('.page-image');
        const btn = imageContainer.querySelector('.regenerate-image-btn');
        
        // Show loading state
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
        
        // Get the current story pages data
        const storyPages = getCurrentStoryPages();
        if (!storyPages || !storyPages.pages[pageIndex]) {
            throw new Error('Story data not available');
        }
        
        // Generate new image prompt for this page
        const pageContent = storyPages.pages[pageIndex];
        const prompt = createIndividualPagePrompt(pageContent, pageIndex + 1, storyData);
        
        // Generate new image
        const enhancedPrompt = enhanceImagePrompt(prompt, storyData);
        const newImageUrl = await callNovitaImageAPI(enhancedPrompt, storyData);
        
        // Update the image
        img.src = newImageUrl;
        
        // Reset button
        btn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        btn.disabled = false;
        
        showNotification('Image regenerated successfully!', 'success');
        
    } catch (error) {
        console.error('Error regenerating image:', error);
        
        // Reset button on error
        const btn = document.querySelectorAll('.regenerate-image-btn')[pageIndex];
        if (btn) {
            btn.innerHTML = '<i class="fas fa-sync-alt"></i>';
            btn.disabled = false;
        }
        
        showNotification('Failed to regenerate image. Please try again.', 'error');
    }
}

function getCurrentStoryPages() {
    // Extract current story pages from the displayed content
    const storyTitle = document.getElementById('story-title').textContent;
    const pageTexts = Array.from(document.querySelectorAll('.page-text')).map(el => el.textContent.trim());
    
    return {
        title: storyTitle,
        pages: pageTexts
    };
}

async function exportToPDF() {
    showNotification('Preparing PDF export...', 'info');
    
    try {
        // Use browser's print functionality for now
        // This will capture the story pages in a printable format
        const originalTitle = document.title;
        const storyTitle = document.getElementById('story-title').textContent;
        document.title = storyTitle;
        
        // Hide non-essential elements for printing
        const elementsToHide = [
            '.story-actions',
            '.settings-btn',
            '.header'
        ];
        
        elementsToHide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => el.style.display = 'none');
        });
        
        // Trigger print dialog
        window.print();
        
        // Restore elements after printing
        setTimeout(() => {
            elementsToHide.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => el.style.display = '');
            });
            document.title = originalTitle;
        }, 1000);
        
        showNotification('PDF export completed! Use your browser\'s print dialog.', 'success');
        
    } catch (error) {
        console.error('Error exporting PDF:', error);
        showNotification('PDF export failed. Please try again.', 'error');
    }
}

function openModal(modal) {
    modal.classList.add('active');
}

function closeModalHandler(modal) {
    modal.classList.remove('active');
}

function saveSettings() {
    aiSettings.creativity = document.getElementById('creativity').value;
    
    localStorage.setItem('aiSettings', JSON.stringify(aiSettings));
    closeModalHandler(aiModal);
    showNotification('Settings saved!', 'success');
}

function loadSettings() {
    const saved = localStorage.getItem('aiSettings');
    if (saved) {
        const savedSettings = JSON.parse(saved);
        aiSettings.creativity = savedSettings.creativity || 70;
        document.getElementById('creativity').value = aiSettings.creativity;
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '12px',
        color: 'white',
        fontWeight: '600',
        zIndex: '10000',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease',
        maxWidth: '300px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
    });
    
    // Set background color based on type
    const colors = {
        success: 'linear-gradient(135deg, #48bb78, #38a169)',
        error: 'linear-gradient(135deg, #f56565, #e53e3e)',
        info: 'linear-gradient(135deg, #4299e1, #3182ce)',
        warning: 'linear-gradient(135deg, #ed8936, #dd6b20)'
    };
    notification.style.background = colors[type] || colors.info;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Export functions for potential future use
window.StoryApp = {
    generateStory,
    resetApp,
    exportToPDF,
    showNotification
};