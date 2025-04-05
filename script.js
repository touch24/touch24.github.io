document.addEventListener('DOMContentLoaded', () => { // Ensure DOM is loaded

    // --- Elements ---
    const messageDisplay = document.getElementById('message-display');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const typingIndicator = document.getElementById('typing-indicator');
    const interactiveChoicesContainer = document.getElementById('interactive-choices');
    const starterPromptsContainer = document.getElementById('starter-prompts');
    const themeToggleButton = document.getElementById('theme-toggle-button');
    // Sidebar Buttons
    const showTipsButton = document.getElementById('show-tips-button');
    const inspirationButton = document.getElementById('inspiration-button');
    const clearChatButton = document.getElementById('clear-chat-button');

    // --- API Configuration ---
    // 🚨🚨🚨 WARNING: DO NOT USE REAL API KEYS IN CLIENT-SIDE CODE FOR PRODUCTION! 🚨🚨🚨
    // This key is exposed in the browser and is insecure. Use a backend proxy.
    const API_KEY = "AIzaSyDRUdvRQdrIsWDNkYAKt7PyyHrY-bfhESg"; // User provided key - INSECURE!
    const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    // --- State ---
    let chatHistory = [];
    let isWaitingForResponse = false;
    let currentChoices = []; // Store currently displayed interactive choices

    // --- Constants ---
    const STARTER_PROMPTS = [
        "Ideas for a birthday gift",
        "How to wrap a bottle?",
        "Make it look elegant",
        "Wrapping for a kid's gift",
        "Eco-friendly wrapping ideas",
        "Use fabric for wrapping",
        "Need something quick and easy",
        "Wrapping a huge present",
        "Ideas for Christmas wrapping"
    ];

    const INITIAL_CHOICES = {
        question: "Hi there! 👋 I'm GiftWrap Genius, ready to spark some creativity! To get started, what kind of item are you wrapping?",
        options: ["Book", "Clothes / Fabric", "Bottle / Cylinder", "Awkward Shape", "Something Else"]
    };

    // --- Core Functions ---

    function formatMessageText(text) {
         // Basic Markdown-like formatting
        let formattedText = text
            .replace(/</g, "<") // Escape HTML tags first
            .replace(/>/g, ">")
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>')     // Italics
            .replace(/```([\s\S]*?)```/g, (match, code) => `<pre><code>${code.trim()}</code></pre>`) // Code blocks
            .replace(/`(.*?)`/g, '<code>$1</code>')     // Inline code
            .replace(/^# (.*$)/gm, '<h2>$1</h2>')      // H2
            .replace(/^## (.*$)/gm, '<h3>$1</h3>')     // H3
            .replace(/^### (.*$)/gm, '<h4>$1</h4>')    // H4
            .replace(/^- (.*$)/gm, '<li>$1</li>')      // Basic list items
            .replace(/^[1-9]\. (.*$)/gm, '<li>$1</li>') // Ordered list items (basic) - needs number handling for true ordered lists
            .replace(/(\r\n|\n|\r)/gm, "<br>");       // Newlines

        // Wrap list items in <ul> or <ol> if any exist (improved logic)
        formattedText = formattedText.replace(/(?:<br>\s*)*<li>(.*?)<\/li>/gs, '<li>$1</li>'); // Clean up breaks before li
        // Very basic check for ordered vs unordered list start
        if (/<li>/.test(formattedText) && !/<ol>/.test(formattedText) && !/<ul>/.test(formattedText)) {
            // Simple wrap - assumes blocks of LIs belong together
             formattedText = formattedText.replace(/((<li>.*?<\/li>\s*)+)/gs, '<ul>$1</ul>');
             // A more robust solution would identify markers like '1.', 'a.' etc.
        }
         formattedText = formattedText.replace(/<\/ul>\s*<br>\s*<ul>/g, ''); // Merge adjacent lists
         formattedText = formattedText.replace(/<\/ol>\s*<br>\s*<ol>/g, ''); // Merge adjacent lists (if using OL)


        return formattedText;
    }


    function addMessageToDisplay(text, sender) {
        const bubble = document.createElement('div');
        bubble.classList.add('chat-bubble', sender);
        bubble.innerHTML = formatMessageText(text);
        messageDisplay.appendChild(bubble);
        scrollToBottom();
    }

    function scrollToBottom() {
        setTimeout(() => {
             messageDisplay.scrollTop = messageDisplay.scrollHeight;
        }, 50);
    }

    function showTyping(show) {
        typingIndicator.style.display = show ? 'flex' : 'none';
        sendButton.disabled = show;
        userInput.disabled = show;
        isWaitingForResponse = show;
        document.querySelectorAll('.choice-button').forEach(btn => btn.disabled = show);
    }

    function clearChat() {
        messageDisplay.innerHTML = '';
        interactiveChoicesContainer.innerHTML = '';
        chatHistory = [];
        currentChoices = [];
        addInitialGreetingAndChoices();
        userInput.value = '';
        showTyping(false);
        console.log("Chat cleared.");
    }

    // --- Theme Switching ---
    function applyTheme(theme) {
        document.body.className = theme + '-theme'; // Set body class
        localStorage.setItem('chatTheme', theme); // Save preference
         console.log(`Theme applied: ${theme}`);
    }

    function toggleTheme() {
        const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    }

    // --- Interactive & Starter Elements ---

    function displayInteractiveChoices(options) {
        interactiveChoicesContainer.innerHTML = '';
        if (!options || options.length === 0) {
            currentChoices = [];
            return;
        }
        currentChoices = options;

        options.forEach(optionText => {
            const button = document.createElement('button');
            button.classList.add('choice-button');
            button.textContent = optionText;
            button.addEventListener('click', () => handleChoiceClick(optionText));
            interactiveChoicesContainer.appendChild(button);
        });
        scrollToBottom();
    }

     function handleChoiceClick(choiceText) {
         if (isWaitingForResponse) return;
         addMessageToDisplay(choiceText, 'user');
         chatHistory.push({ role: 'user', parts: [{ text: choiceText }] });
         interactiveChoicesContainer.innerHTML = '';
         currentChoices = [];
         sendMessageToAI(choiceText);
     }

    function displayStarterPrompts() {
        starterPromptsContainer.innerHTML = '';
        STARTER_PROMPTS.forEach(promptText => {
            const button = document.createElement('button');
            button.classList.add('starter-prompt-button');
            button.textContent = promptText;
            button.addEventListener('click', () => {
                userInput.value = promptText;
                userInput.focus();
                clearInteractiveElements(); // Clear choices if starter is clicked
            });
            starterPromptsContainer.appendChild(button);
        });
    }

     function clearInteractiveElements() {
         interactiveChoicesContainer.innerHTML = '';
         currentChoices = [];
     }

    // --- AI Interaction ---

    async function sendMessageToAI(userText) {
        clearInteractiveElements();
        showTyping(true);

        // Refined System Prompt for the AI
        const systemInstruction = `You are GiftWrap Genius, an upbeat, friendly, and super-helpful AI assistant specializing in uniquely creative and practical gift wrapping ideas. Your main goal is to inspire users and give them actionable advice! ✨

        **Your Personality:** Enthusiastic, encouraging, a little bit playful, and always focused on being helpful. Use emojis like 🎁🎀✨🎉✂️ sparingly to add warmth.

        **Interaction Flow:**
        1.  You probably already asked about the **item** being wrapped. If not, do that first!
        2.  Conversationally gather **2-3 MORE** key details. Ask **ONE** clear, friendly question at a time. Aim for details like:
            *   "Awesome! And **who is this amazing gift for?**" (e.g., Friend, Mom, Child (specify age?), Boss, Partner)
            *   "Gotcha! What's the **special occasion?** 🎉" (e.g., Birthday, Christmas, Anniversary, Just Because, Thank You)
            *   "Let's nail the vibe! What **style** are you feeling?" (e.g., Super Elegant, Fun & Quirky, Rustic & Natural, Minimalist Chic, Kid-Friendly, Eco-Conscious)
            *   "Any favorite **colors or materials** to play with? Or maybe things to avoid?"
        3.  **KEEP QUESTIONS SHORT AND SWEET!**
        4.  Once you have the **item + 2-3 other details**, it's showtime! **STOP** asking questions.
        5.  Provide **2-3 distinct, creative, and very specific wrapping suggestions** based *only* on the info gathered in this chat.
        6.  **Format suggestions beautifully:**
            *   Use bold titles: **✨ Idea 1: Enchanted Forest Box ✨**
            *   Use bullet points (like \`-\` or \`*\`) for materials and clear steps.
            *   Be specific: Instead of 'add ribbon', say '- Tie with a wide, deep green velvet ribbon and finish with a sprig of pine or rosemary tucked in the knot.'
            *   Maybe add a small flourish: 'This will look stunning!' or 'Perfect for someone who loves nature!'
        7.  If asked for general **tips** or **inspiration links**, provide concise, helpful answers.
        8.  Keep responses **easy to scan**. Use line breaks effectively.
        9.  If the user goes off-topic: "That sounds cool! Right now, let's focus on getting this gift wrapped beautifully. What kind of item are we working with?"`;


        // We primarily rely on chat history + the initial model prompt setting the context.
        // The 'systemInstruction' variable isn't directly sent in every request with Gemini's standard API,
        // but it guides how we construct the logic and what we expect the AI to do based on the history.
        // The initial AI message sets the stage.
         const payload = {
             contents: chatHistory, // Send the entire conversation history
             safetySettings: [
                 { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                 { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                 { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                 { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
             ],
             generationConfig: {
                 temperature: 0.8, // A bit more creative flair
                 maxOutputTokens: 650 // Allow slightly longer, detailed suggestions
             }
         };

         try {
             // Crucial Check - Repeat Warning
             if (API_KEY === "AIzaSyDRUdvRQdrIsWDNkYAKt7PyyHrY-bfhESg") {
                  console.warn("🚨 SECURITY WARNING: Using the hardcoded demo API key. Do not deploy this!");
             } else if (!API_KEY || API_KEY === "YOUR_API_KEY") { // Check if it's still the placeholder
                 throw new Error("API Key is missing or invalid. Please configure it correctly in script.js.");
             }

             const response = await fetch(API_ENDPOINT, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(payload)
             });

             const responseData = await response.text(); // Get text first for better error inspection

             if (!response.ok) {
                 let errorMsg = `API Error (${response.status}): ${response.statusText}`;
                 try {
                     const errorJson = JSON.parse(responseData);
                     console.error("API Error Response JSON:", errorJson);
                     errorMsg = `API Error (${response.status}): ${errorJson?.error?.message || response.statusText}`;
                      if(errorJson?.error?.status === 'PERMISSION_DENIED') {
                         errorMsg += " (Check if API key is valid or has permissions)";
                      }
                 } catch (e) {
                     console.error("Failed to parse API error response:", responseData);
                 }
                  throw new Error(errorMsg);
             }

             const data = JSON.parse(responseData); // Now parse if response was ok

             let aiResponseText = "Hmm, I'm drawing a blank... maybe my ribbon got tangled! 😅 Could you try asking again?";
             if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                 aiResponseText = data.candidates[0].content.parts[0].text;
             } else if (data.candidates && data.candidates[0]?.finishReason === 'SAFETY') {
                  aiResponseText = "Oops! I can't respond to that due to safety reasons. Let's stick to fun gift wrapping ideas! 🎁";
                  console.warn("API Safety Block:", data.candidates[0]);
             } else if (data.promptFeedback?.blockReason) {
                  aiResponseText = `Sorry, I couldn't process that (${data.promptFeedback.blockReason}). Let's try a different approach?`;
                  console.warn("API Prompt Feedback Block:", data.promptFeedback);
             } else {
                 console.warn("Could not find generated text in API response:", data);
             }

             addMessageToDisplay(aiResponseText, 'ai');
             chatHistory.push({ role: 'model', parts: [{ text: aiResponseText }] });

             // Future Idea: Check if AI asks a simple question that maps to buttons
             // e.g., if response contains "elegant, rustic, or fun", display those as buttons.

         } catch (error) {
             console.error("Error during AI interaction:", error);
             addMessageToDisplay(`⚠️ Oh no! Something went wrong: ${error.message}`, 'ai');
         } finally {
             showTyping(false);
         }
    }

    function handleSendMessage() {
        const userText = userInput.value.trim();
        if (!userText || isWaitingForResponse) {
            return;
        }
        addMessageToDisplay(userText, 'user');
        chatHistory.push({ role: 'user', parts: [{ text: userText }] });
        userInput.value = '';
        sendMessageToAI(userText);
    }

    // --- Initialization and Event Listeners ---

    function addInitialGreetingAndChoices() {
        const initialAIResponse = INITIAL_CHOICES.question;
        addMessageToDisplay(initialAIResponse, 'ai');
        chatHistory.push({ role: 'model', parts: [{ text: initialAIResponse }] });
        displayInteractiveChoices(INITIAL_CHOICES.options);
    }

    // Event Listeners
    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
        if (currentChoices.length > 0 && userInput.value.trim() !== '') {
            clearInteractiveElements(); // Clear buttons if user types something
        }
    });

    showTipsButton.addEventListener('click', () => {
        const text = "Can you give me some general gift wrapping tips?";
        addMessageToDisplay(text, 'user');
        chatHistory.push({ role: 'user', parts: [{ text: text }]});
        sendMessageToAI(text);
    });

    inspirationButton.addEventListener('click', () => {
        const text = "Where can I find inspiration for gift wrapping?";
         addMessageToDisplay(text, 'user');
         chatHistory.push({ role: 'user', parts: [{ text: text }]});
         sendMessageToAI(text);
    });

    clearChatButton.addEventListener('click', clearChat);
    themeToggleButton.addEventListener('click', toggleTheme);

    // --- Initial Load ---
    const savedTheme = localStorage.getItem('chatTheme') || 'light'; // Default to light
    applyTheme(savedTheme);

    addInitialGreetingAndChoices();
    displayStarterPrompts();
    scrollToBottom();

    // Final check and persistent warning about the API key
    if (API_KEY === "AIzaSyDRUdvRQdrIsWDNkYAKt7PyyHrY-bfhESg") {
        console.error("🚨🚨🚨 INSECURE API KEY DETECTED IN SCRIPT.JS! Do not use this key in production or public-facing applications. Replace it with a secure backend solution. 🚨🚨🚨");
    } else if (!API_KEY || API_KEY === "YOUR_API_KEY") {
       setTimeout(() => {
           addMessageToDisplay("⚠️ **Action Required:** Valid API Key is missing. Please replace the placeholder key in `script.js` with your actual Google AI API key. Remember to handle keys securely in real projects!", 'ai');
       }, 500);
    }

}); // End DOMContentLoaded
