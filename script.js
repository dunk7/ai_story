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
    
    // Auto-advance from genre selection
    setTimeout(() => {
        if (currentStep === 1 && selectedGenre) {
            goToStep(2);
        }
    }, 1000);
}

function selectGenre(card) {
    // Remove previous selection
    genreCards.forEach(c => c.classList.remove('selected'));
    
    // Add selection to clicked card
    card.classList.add('selected');
    selectedGenre = card.dataset.genre;
    
    // Add smooth transition effect
    card.style.transform = 'scale(1.05)';
    setTimeout(() => {
        card.style.transform = '';
    }, 200);
    
    // Auto-advance after selection
    setTimeout(() => {
        goToStep(2);
    }, 800);
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
        // Generate the story pages
        updateLoadingText('Creating your story book...');
        const storyPages = await generateStoryPages(storyData);
        
        // Generate images if requested
        if (storyData.includeImages) {
            // Generate title image
            const titleImage = await generateTitleImage(storyData, storyPages.title);
            
            updateLoadingText('Generating image descriptions...');
            const imagePrompts = await generateImagePrompts(storyPages, storyData);
            
            // Generate page images
            updateLoadingText('Creating illustrations...');
            const images = await generateStoryImages(imagePrompts, storyData);
            
            // Combine story pages with images
            displayStoryBook(storyPages, images, titleImage);
        } else {
            displayStoryBook(storyPages, [], null);
        }
        
        // Go to story display step
        goToStep(4);
        
    } catch (error) {
        console.error('Error generating story:', error);
        showNotification('Failed to generate story. Please try again.', 'error');
        goToStep(2);
    }
}

async function generateStoryPages(data) {
    const prompt = createStoryPrompt(data);
    
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
            throw new Error(`Story API Error: ${response.status}`);
        }

        const result = await response.json();
        const content = result.choices[0].message.content;
        
        try {
            // Try to parse as JSON first
            const parsed = JSON.parse(content);
            if (parsed.title && parsed.pages) {
                return parsed;
            }
        } catch (e) {
            // Fallback: parse manually
            return parseStoryManually(content, data.pages);
        }
        
    } catch (error) {
        console.error('Error generating story pages:', error);
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
                            content: 'You are an expert at analyzing story content and determining the best visual representation for illustration. You must decide whether to show: 1) The main character in action, 2) The environment/setting, or 3) A close-up of an important object/detail. Always choose what would be most visually compelling and story-relevant.'
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
    // Determine image focus type with strong bias toward environments and settings
    const totalPages = storyData.pages;
    let focusType;
    
    // 70% environment/setting focus, 20% objects/details, 10% atmosphere/mood
    const rand = Math.random();
    if (pageNumber === 1) {
        focusType = 'wide-establishing'; // Always start with establishing shot
    } else if (pageNumber === totalPages) {
        focusType = 'atmosphere'; // Final page - mood/conclusion
    } else if (rand < 0.4) {
        focusType = 'environment'; // Close environment shots
    } else if (rand < 0.7) {
        focusType = 'wide-establishing'; // Wide landscape/setting shots
    } else if (rand < 0.9) {
        focusType = 'object'; // Important objects/details
    } else {
        focusType = 'atmosphere'; // Weather/mood
    }
    
    let focusInstruction;
    switch (focusType) {
        case 'wide-establishing':
            focusInstruction = "Create a WIDE ESTABLISHING SHOT of the setting or location. Show expansive landscapes, cityscapes, vast interiors, or grand architectural views. Focus on scale, grandeur, and the overall environment. Avoid close-ups of people - show the world itself.";
            break;
        case 'environment':
            focusInstruction = "Focus on specific environmental details and setting elements. Show detailed views of buildings, rooms, natural features, or technological environments. Capture the texture, atmosphere, and character of the location itself.";
            break;
        case 'object':
            focusInstruction = "Focus on an important object, artifact, vehicle, or architectural detail mentioned in the page. Show detailed close-ups of significant items, magical artifacts, technology, or environmental features that drive the story.";
            break;
        case 'atmosphere':
            focusInstruction = "Focus on weather, lighting, mood, and atmospheric conditions. Show dramatic skies, lighting effects, weather phenomena, or environmental conditions that enhance the emotional tone of the scene.";
            break;
    }
    
    return `Create a detailed image prompt for this story page:

PAGE ${pageNumber} CONTENT:
"${pageContent}"

STORY CONTEXT:
- Genre: ${storyData.genre}
- Setting: ${storyData.setting}
- Art Style: ${storyData.artStyle}

FOCUS INSTRUCTION: ${focusInstruction}

CRITICAL REQUIREMENTS:
- PRIORITIZE environments, settings, and locations over character close-ups
- NEVER use character names or pronouns (he, she, they, him, her, his, hers, their)
- If people must be included, show them as small figures within the larger environment
- ${focusInstruction}
- Emphasize architectural details, natural features, and world-building elements
- Include rich environmental textures, lighting, and atmospheric effects
- Make the setting itself the star of the image
- Create cinematic, visually striking compositions
- Be detailed and descriptive (aim for 120-180 words)

Create ONLY the detailed image prompt, no explanation.`;
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

async function generateTitleImage(storyData, storyTitle) {
    try {
        updateLoadingText('Creating title page illustration...');
        const titlePrompt = `Create a beautiful title page illustration for a ${storyData.genre} story called "${storyTitle}". 
        Show the main environment of ${storyData.setting}. 
        Make it magical and inviting, like the cover of a storybook. Include the mood: ${storyData.tone}. 
        Perfect for a title page with text overlay. Focus on the world and setting rather than characters.`;
        
        const enhancedPrompt = enhanceImagePrompt(titlePrompt, storyData);
        const imageUrl = await callNovitaImageAPI(enhancedPrompt, storyData);
        return {
            url: imageUrl,
            prompt: enhancedPrompt
        };
    } catch (error) {
        console.error('Error generating title image:', error);
        return {
            url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzA0IiBoZWlnaHQ9IjQ0OCIgdmlld0JveD0iMCAwIDcwNCA0NDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI3MDQiIGhlaWdodD0iNDQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNTIgMjAwVjI0OCIgc3Ryb2tlPSIjOUI5QkEwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8cGF0aCBkPSJNMzI4IDIyNEgzNzYiIHN0cm9rZT0iIzlCOUJBMCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcT0icm91bmQiLz4KPHRleHQgeD0iMzUyIiB5PSIyODAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlCOUJBMCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VGl0bGUgSW1hZ2UgRmFpbGVkPC90ZXh0Pgo8L3N2Zz4=',
            prompt: titlePrompt
        };
    }
}

async function generateStoryImages(imagePrompts, storyData) {
    const images = [];
    
    for (let i = 0; i < imagePrompts.length; i++) {
        updateLoadingText(`Generating image ${i + 1} of ${imagePrompts.length}...`);
        
        try {
            const enhancedPrompt = enhanceImagePrompt(imagePrompts[i], storyData);
            const imageUrl = await callNovitaImageAPI(enhancedPrompt, storyData);
            
            images.push({
                url: imageUrl,
                prompt: enhancedPrompt
            });
        } catch (error) {
            console.error(`Error generating image ${i + 1}:`, error);
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
        console.log('🎨 IMAGE PROMPT (original):', prompt);
        console.log('🎯 STYLE:', storyData.artStyle);
        
        // Truncate prompt if it's too long
        const truncatedPrompt = truncatePrompt(prompt, 400);
        if (truncatedPrompt !== prompt) {
            console.log('✂️ Prompt truncated to:', truncatedPrompt);
        }
        
        // Create negative prompt to avoid unwanted elements
        const negativePrompt = "lowres, bad anatomy, bad hands, text, missing finger, extra digits, fewer digits, blurry, mutated hands and fingers, poorly drawn face, mutation, deformed face, ugly, bad proportions, extra limbs, extra face, double head, extra head, extra feet, monster, logo, cropped, worst quality, low quality, normal quality, jpeg, humpbacked, long body, long neck, jpeg artifacts, monochrome, limited palette, blush, nsfw, realistic, photorealistic, photograph";
        
        const requestBody = {
            "extra": {
                "response_image_type": "jpeg",
                "enable_nsfw_detection": false
            },
            "request": {
                "model_name": "anythingelseV4_v45_5768.safetensors",
                "prompt": truncatedPrompt,
                "negative_prompt": negativePrompt,
                "width": 704,
                "height": 448,
                "image_num": 1,
                "steps": 50,
                "guidance_scale": 7,
                "sampler_name": "DPM++ 2S a Karras",
                "seed": Math.floor(Math.random() * 1000000000),
                "loras": [],
                "embeddings": []
            }
        };
        
        console.log('📤 Sending request to Novita API...');
        
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
            console.error('❌ API Error Response:', errorText);
            throw new Error(`HTTP error! status: ${createResponse.status}, body: ${errorText}`);
        }
        
        const createResult = await createResponse.json();
        
        if (createResult && createResult.task_id) {
            console.log('⏳ Task created:', createResult.task_id);
            
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
                            console.log('✅ Image generation finished!', progressRes.images);
                            clearInterval(timer);
                            if (progressRes.images && progressRes.images.length > 0) {
                                resolve(progressRes.images[0].image_url);
                            } else {
                                reject(new Error('No images returned'));
                            }
                        }
                        
                        if (progressRes.task.status === 'TASK_STATUS_FAILED') {
                            console.warn('❌ Image generation failed!', progressRes.task.reason);
                            clearInterval(timer);
                            reject(new Error(progressRes.task.reason || 'Image generation failed'));
                        }
                        
                        if (progressRes.task.status === 'TASK_STATUS_QUEUED') {
                            console.log('⏳ Queued - waiting...');
                        }
                        
                        if (progressRes.task.status === 'TASK_STATUS_PROCESSING') {
                            console.log('🔄 Processing...');
                        }
                        
                    } catch (err) {
                        console.error('❌ Progress check error:', err);
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
        console.error('❌ Novita API Error:', error);
        
        // Return blank/error image instead of random placeholders
        console.log('🔄 Image generation failed - using blank image');
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