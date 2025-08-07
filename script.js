// Global state
let currentStep = 1;
let selectedGenre = '';
let storyData = {};
let aiSettings = {
    model: 'grok-3-mini',
    creativity: 70,
    apiKey: '',
    novitaApiKey: ''
};

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
        artStyle: document.getElementById('art-style').value,
        imageModel: document.getElementById('image-model').value || 'cyberrealistic'
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
            
            // Use AI-generated image prompts if available, otherwise fallback to manual generation
            let imagePrompts;
            if (storyPages.imagePrompts && storyPages.imagePrompts.length > 0) {
                addThinkingLine(`[IMAGES] Using AI-generated image prompts from Grok`, 'system');
                console.log('🎨 AI-Generated Image Prompts:', storyPages.imagePrompts);
                imagePrompts = storyPages.imagePrompts;
            } else {
                updateLoadingText('Generating image descriptions...');
                addThinkingLine(`[IMAGES] Fallback: Generating image prompts manually...`, 'system');
                imagePrompts = await generateImagePrompts(storyPages, storyData);
            }
            
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
        addThinkingLine(`[ERROR] Generation failed: ${error.message}`, 'error');
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
                        content: 'You are a creative storyteller who creates illustrated children\'s books and novels. Format your response as a JSON object with "title", "pages", and "imagePrompts" fields. Each page should have 1-2 paragraphs of story content, and you must generate a 10-50 word image prompt for each page.'
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
            addThinkingLine(`[ERROR] API request failed: ${response.status}`, 'error');
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
                if (parsed.imagePrompts && parsed.imagePrompts.length > 0) {
                    addThinkingLine(`[GROK] Found ${parsed.imagePrompts.length} AI-generated image prompts`, 'response');
                } else {
                    addThinkingLine(`[GROK] No image prompts found, will use fallback method`, 'system');
                }
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
                    addThinkingLine(`[ERROR] Story generation failed: ${error.message}`, 'error');
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
  ],
  "imagePrompts": [
    "10-50 word image prompt for page 1",
    "10-50 word image prompt for page 2",
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
- For long text: Provide rich detail, character thoughts, and atmospheric description

IMPORTANT: For each page, generate a corresponding image prompt (10-50 words) that captures the key visual elements, characters, setting, and mood of that specific page. Consider the ${data.artStyle || 'illustration'} art style and ${data.tone} tone when creating these prompts. Each image prompt should be specific enough to generate a compelling illustration that matches the story content.`;

    return prompt;
}

async function generateImagePrompts(storyPages, storyData) {
    const imagePrompts = [];
    
    // Generate direct prompts for each page without using AI
    for (let i = 0; i < storyPages.pages.length; i++) {
        updateLoadingText(`Creating prompt for page ${i + 1}...`);
        addThinkingLine(`[PROMPTS] Creating direct prompt for page ${i + 1}`, 'system');
        
        const pageContent = storyPages.pages[i];
        const imagePrompt = createIndividualPagePrompt(pageContent, i + 1, storyData);
        console.log(`🎨 Manual Image Prompt ${i + 1}:`, imagePrompt);
        imagePrompts.push(imagePrompt);
    }
    
    addThinkingLine(`[PROMPTS] Generated ${imagePrompts.length} image prompts`, 'response');
    return imagePrompts;
}

function createIndividualPagePrompt(pageContent, pageNumber, storyData) {
    // Create a direct 20-word image prompt without using AI
    const key_elements = [];
    
    // Always include character description
    key_elements.push(`${storyData.protagonist}`);
    
    // Extract action words and important nouns from the page content
    const content = pageContent.toLowerCase();
    const actionWords = ['running', 'fighting', 'talking', 'walking', 'flying', 'chasing', 'hiding', 'discovering', 'climbing', 'jumping', 'swimming', 'dancing', 'singing', 'crying', 'laughing', 'screaming'];
    const importantNouns = ['dragon', 'castle', 'forest', 'mountain', 'river', 'cave', 'treasure', 'sword', 'magic', 'wizard', 'princess', 'knight', 'monster', 'palace', 'village'];
    
    // Find relevant actions
    const foundActions = actionWords.filter(word => content.includes(word));
    if (foundActions.length > 0) {
        key_elements.push(foundActions[0]);
    }
    
    // Find relevant objects/places
    const foundNouns = importantNouns.filter(word => content.includes(word));
    if (foundNouns.length > 0) {
        key_elements.push(foundNouns[0]);
    }
    
    // Add setting
    key_elements.push(`in ${storyData.setting}`);
    
    // Add style
    key_elements.push(`${storyData.artStyle} style`);
    
    // Add dramatic descriptors based on tone
    const toneDescriptors = {
        'epic': 'dramatic cinematic lighting',
        'lighthearted': 'bright cheerful colors',
        'dramatic': 'intense dramatic atmosphere',
        'mysterious': 'dark moody shadows'
    };
    
    if (toneDescriptors[storyData.tone]) {
        key_elements.push(toneDescriptors[storyData.tone]);
    }
    
    // Create prompt around 20 words
    return key_elements.join(', ');
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
        // Create a direct title image prompt without using AI
        const titlePrompt = `Epic book cover, ${storyData.protagonist} character, ${storyData.setting}, ${storyData.conflict}, ${storyData.tone} mood, ${storyData.artStyle} style, dramatic lighting, cinematic composition, detailed character design`;
        
        addThinkingLine(`[TITLE] Creating book cover image...`, 'system');
        
        const finalPrompt = enhanceImagePrompt(titlePrompt, storyData);
        const imageUrl = await callNovitaImageAPI(finalPrompt, storyData);
        return {
            url: imageUrl,
            prompt: finalPrompt
        };
    } catch (error) {
        console.error('Error generating title image:', error);
        return {
            url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzA0IiBoZWlnaHQ9IjQ0OCIgdmlld0JveD0iMCAwIDcwNCA0NDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI3MDQiIGhlaWdodD0iNDQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNTIgMjAwVjI0OCIgc3Ryb2tlPSIjOUI5QkEwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8cGF0aCBkPSJNMzI4IDIyNEgzNzYiIHN0cm9rZT0iIzlCOUJBMCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPHRleHQgeD0iMzUyIiB5PSIyODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlCOUJBMCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VGl0bGUgSW1hZ2UgRmFpbGVkPC90ZXh0Pgo8L3N2Zz4=',
            prompt: 'Title image generation failed'
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
            addThinkingLine(`[ERROR] Image ${i + 1} failed, using placeholder`, 'error');
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

function getModelName(modelKey) {
    const models = {
        'cyberrealistic': 'cyberrealistic_v31_62396.safetensors',
        'anythingelse': 'anythingelseV4_v45_5768.safetensors'
    };
    return models[modelKey] || models['cyberrealistic'];
}

async function callNovitaImageAPI(prompt, storyData) {
    try {
        addThinkingLine(`[IMAGE] Sending prompt to Novita AI...`, 'system');
        addThinkingLine(`[IMAGE] Model: ${getModelName(storyData.imageModel)}`, 'system');
        addThinkingLine(`[IMAGE] Prompt: ${prompt.substring(0, 80)}...`, 'prompt');

        const truncatedPrompt = truncatePrompt(prompt, 400);
        const negativePrompt = "blurry, low quality, distorted, text, watermark, signature, bad anatomy, deformed, ugly, mutated, extra limbs, poorly drawn, amateur";

        const requestBody = {
            "extra": {
                "response_image_type": "jpeg",
                "enable_nsfw_detection": false
            },
            "request": {
                "model_name": getModelName(storyData.imageModel),
                "prompt": truncatedPrompt,
                "negative_prompt": negativePrompt,
                "width": 1024,
                "height": 768,
                "image_num": 1,
                "steps": 25,
                "guidance_scale": 8.0,
                "sampler_name": "DPM++ 2M Karras",
                "seed": Math.floor(Math.random() * 1000000000),
                "loras": [],
                "embeddings": []
            }
        };

        // Create the task
        const createResponse = await fetch('https://api.novita.ai/v3/async/txt2img', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${aiSettings.novitaApiKey}`
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            addThinkingLine(`[ERROR] API request failed: ${createResponse.status}`, 'error');
            throw new Error(`HTTP error! status: ${createResponse.status}, body: ${errorText}`);
        }
        
        const createResult = await createResponse.json();
        
        if (createResult && createResult.task_id) {
            addThinkingLine(`[IMAGE] Task queued: ${createResult.task_id}`, 'system');
            addThinkingLine(`[IMAGE] Waiting for image generation...`, 'system');
            
            return new Promise((resolve, reject) => {
                const timer = setInterval(async () => {
                    try {
                        // Check task status
                        const statusResponse = await fetch(`https://api.novita.ai/v3/async/task-result?task_id=${createResult.task_id}`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${aiSettings.novitaApiKey}`
                            }
                        });
                        
                        if (!statusResponse.ok) {
                            throw new Error(`Status check failed: ${statusResponse.status}`);
                        }
                        
                        const progressRes = await statusResponse.json();
                        
                        if (progressRes.task.status === 'TASK_STATUS_SUCCEED') {
                            addThinkingLine(`[IMAGE] Generation completed successfully!`, 'response');
                            clearInterval(timer);
                            if (progressRes.images && progressRes.images.length > 0) {
                                resolve(progressRes.images[0].image_url);
                            } else {
                                reject(new Error('No images returned'));
                            }
                        }
                        
                        if (progressRes.task.status === 'TASK_STATUS_FAILED') {
                            addThinkingLine(`[ERROR] Image generation failed: ${progressRes.task.reason}`, 'error');
                            clearInterval(timer);
                            reject(new Error(progressRes.task.reason || 'Image generation failed'));
                        }
                        
                        if (progressRes.task.status === 'TASK_STATUS_QUEUED') {
                            // Only show queue status occasionally to avoid spam
                            // addThinkingLine(`[IMAGE] Still in queue...`, 'system');
                        }
                        
                        if (progressRes.task.status === 'TASK_STATUS_PROCESSING') {
                            // addThinkingLine(`[IMAGE] Processing...`, 'system');
                        }
                        
                    } catch (err) {
                        console.error('Progress check error:', err);
                        clearInterval(timer);
                        reject(err);
                    }
                }, 2000); // Check every 2 seconds
                
                // Timeout after 5 minutes
                setTimeout(() => {
                    clearInterval(timer);
                    reject(new Error('Image generation timeout'));
                }, 300000);
            });
        } else {
            throw new Error('Failed to create image generation task');
        }
        
    } catch (error) {
        console.error('Error calling Novita API:', error);
        addThinkingLine(`[ERROR] Image generation failed: ${error.message}`, 'error');
        // Return blank/error image instead of random placeholders
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzA0IiBoZWlnaHQ9IjQ0OCIgdmlld0JveD0iMCAwIDcwNCA0NDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI3MDQiIGhlaWdodD0iNDQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNTIgMjAwVjI0OCIgc3Ryb2tlPSIjOUI5QkEwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8cGF0aCBkPSJNMzI4IDIyNEgzNzYiIHN0cm9rZT0iIzlCOUJBMCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcT0icm91bmQiLz4KPHRleHQgeD0iMzUyIiB5PSIyODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlCOUJBMCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2UgR2VuZXJhdGlvbiBGYWlsZWQ8L3RleHQ+Cjwvc3ZnPg==';
    }
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
    
    // Set back to default values
    document.getElementById('tone').value = 'epic';
    document.getElementById('pages').value = '5';
    document.getElementById('text-length').value = 'medium';
    document.getElementById('font-style').value = 'classic';
    document.getElementById('color-theme').value = 'enchanted';
    document.getElementById('include-images').value = 'yes';
    document.getElementById('image-model').value = 'cyberrealistic';
    document.getElementById('art-style').value = 'photorealistic';
    
    // Show image settings since images are enabled by default
    const imageSettings = document.getElementById('image-settings');
    if (imageSettings) {
        imageSettings.style.display = 'block';
    }
    
    // Clear selections
    genreCards.forEach(card => card.classList.remove('selected'));
    
    // Clear story display
    const storyBook = document.getElementById('story-book');
    if (storyBook) {
        storyBook.innerHTML = '';
    }
    
    // Go to first step
    goToStep(1);
    
    showNotification('Ready to create a new story!', 'success');
}

function editStory() {
    // Enable inline editing of story text
    const storyPages = document.querySelectorAll('.story-page .page-text');
    const editBtn = document.getElementById('edit-story-btn');
    
    if (editBtn.textContent.includes('Edit')) {
        // Enter edit mode
        storyPages.forEach((pageText, index) => {
            const currentText = pageText.textContent;
            const textarea = document.createElement('textarea');
            textarea.value = currentText;
            textarea.className = 'edit-textarea';
            textarea.style.cssText = `
                width: 100%;
                min-height: 100px;
                padding: 1rem;
                border: 2px solid #667eea;
                border-radius: 8px;
                font-family: inherit;
                font-size: inherit;
                line-height: 1.6;
                resize: vertical;
                background: #f8fafc;
            `;
            pageText.style.display = 'none';
            pageText.parentNode.insertBefore(textarea, pageText.nextSibling);
        });
        
        editBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        editBtn.className = 'btn btn-primary';
        showNotification('Edit mode enabled. Modify your story text and click Save.', 'info');
    } else {
        // Save changes
        const textareas = document.querySelectorAll('.edit-textarea');
        textareas.forEach((textarea, index) => {
            const pageText = textarea.previousSibling;
            pageText.textContent = textarea.value;
            pageText.style.display = 'block';
            textarea.remove();
        });
        
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit Story';
        editBtn.className = 'btn btn-outline';
        showNotification('Story changes saved!', 'success');
    }
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