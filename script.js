// --- Elements ---
const messageDisplay = document.getElementById('message-display');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const typingIndicator = document.getElementById('typing-indicator');
const interactiveChoicesContainer = document.getElementById('interactive-choices');
const starterPromptsContainer = document.getElementById('starter-prompts');
// Sidebar Buttons
const showTipsButton = document.getElementById('show-tips-button');
const inspirationButton = document.getElementById('inspiration-button');
const clearChatButton = document.getElementById('clear-chat-button');

// --- API Configuration ---

const API_KEY = "AIzaSyDRUdvRQdrIsWDNkYAKt7PyyHrY-bfhESg"; // <<<--- REPLACE THIS DANGEROUSLY!

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
    "Eco-friendly wrapping ideas"
];

const INITIAL_CHOICES = {
    question: "Hi there! 👋 I'm GiftWrap Genius. To get started, what kind of item are you wrapping?",
    options: ["Book", "Clothes / Fabric", "Bottle / Cylinder", "Awkward Shape", "Something Else"]
};

// --- Core Functions ---

function formatMessageText(text) {
    // Basic Markdown-like formatting
    let formattedText = text
        .replace(/&/g, "&") // Escape HTML entities first
        .replace(/</g, "<")
        .replace(/>/g, ">")
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>')     // Italics
         // Match code blocks making sure ``` is on its own line potentially with spaces
         .replace(/(?:^|\n)\s*```([\s\S]*?)\n\s*```/g, (match, code) => `<pre><code>${code.trim()}</code></pre>`)
         .replace(/`(.*?)`/g, '<code>$1</code>')     // Inline code
         .replace(/^- (.*$)/gm, '<li>$1</li>')      // Basic list items
         .replace(/(\r\n|\n|\r)/gm, "<br>");       // Newlines

    // Wrap list items in <ul> if any exist (improved logic)
    formattedText = formattedText.replace(/(?:<br>\s*)*<li>(.*?)<\/li>/gs, '<li>$1</li>'); // Clean up breaks before li
    formattedText = formattedText.replace(/((<li>.*?<\/li>\s*)+)/gs, '<ul>$1</ul>'); // Wrap consecutive li
    formattedText = formattedText.replace(/<\/ul>\s*<br>\s*<ul>/g, ''); // Merge adjacent lists
    // Clean up extra breaks possibly introduced before/after lists/code blocks
    formattedText = formattedText.replace(/<br>\s*(<(ul|pre))/g, '$1');
    formattedText = formattedText.replace(/(<\/(ul|pre)>)\s*<br>/g, '$1');


    return formattedText;
}

function addMessageToDisplay(text, sender) {
    const bubble = document.createElement('div');
    bubble.classList.add('chat-bubble', sender); // sender is 'user' or 'ai'
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
    addInitialGreetingAndChoices(); // Reset to initial state
    userInput.value = '';
    showTyping(false);
    console.log("Chat cleared.");
}

// --- Interactive & Starter Elements ---

function displayInteractiveChoices(question, options) {
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
    clearInteractiveElements(); // Clear choices immediately
    sendMessageToAI(choiceText); // Send the choice to the AI
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
            clearInteractiveElements(); // Clear choices if user clicks starter
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
    clearInteractiveElements(); // Ensure choices are gone
    showTyping(true);

    const systemInstruction = `You are GiftWrap Genius, a friendly, enthusiastic, and helpful AI assistant specializing in creative and practical gift wrapping ideas.  MOST IMPORTANT POINT: DO NOT ANSWER ANYTHING NOT REALATING TO GIFT WRAPING. Your goal is to provide personalized suggestions.

    Interaction Flow:
    MOST IMPORTANT POINT: DO NOT ANSWER ANYTHING NOT REALATING TO GIFT WRAPING.
    1.  Start by asking what item the user is wrapping (you may have already received this).
    2.  Conversationally gather 2-3 MORE key details needed for good suggestions. Ask ONE clarifying question at a time. Examples:
        *   "Got it! Who is this lovely gift for?" (e.g., Friend, Partner, Child, Colleague)
        *   "Perfect! And what's the occasion?" (e.g., Birthday, Holiday, Thank You, Anniversary)
        *   "Great! What style are you aiming for?" (e.g., Elegant, Rustic, Fun/Playful, Minimalist, Eco-Friendly)
        *   "Do you have any specific materials you'd like to use or avoid?"
    3.  Keep questions concise and friendly. Use emojis sparingly (🎁✨🎀).
    4.  Once you have enough info (usually gift item + 2-3 other details like recipient, occasion, style), STOP asking questions.
    5.  Provide 2-3 distinct, creative, and actionable gift wrapping suggestions based *only* on the information gathered in THIS conversation.
    6.  Format suggestions clearly: Use bold titles for each idea (e.g., **Idea 1: Rustic Charm**) and bullet points for steps or materials needed. Be specific (e.g., instead of 'use ribbon', suggest 'tie with natural jute twine and add a sprig of dried eucalyptus'). Use markdown for formatting (**bold**, *italics*, - lists).
    7.  If the user asks for general tips, inspiration links, or similar, provide those directly and concisely using markdown formatting.
    8.  Keep all responses relatively brief and easy to read. Avoid very long paragraphs.
    9. If the user's message seems unrelated to gift wrapping, gently steer them back: "That's interesting! To give you the best wrapping ideas, could you tell me a bit about the gift first?"`;

    const payload = {
        contents: [
             // Optional: Inject system prompt if needed, but history usually works
             // { role: "system", parts: [{text: systemInstruction }] }, // Adjust role if API requires 'system'
            ...chatHistory
        ],
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ],
        generationConfig: {
            temperature: 0.75,
            maxOutputTokens: 600
        }
    };

    // --- API Key Check ---
    if (API_KEY === "YOUR_API_KEY_GOES_HERE" || !API_KEY) {
         addMessageToDisplay("⚠️ **Action Required:** API Key is missing or is still the placeholder. Please replace `YOUR_API_KEY_GOES_HERE` in the `script.js` file with your actual Google AI API key for the chat to function. Remember the security warning about exposing keys!", 'ai');
         showTyping(false); // Stop typing indicator
         return; // Stop execution if key is missing
    }

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("API Error Response:", errorData);
            let errorMsg = `API Error (${response.status})`;
            if (errorData?.error?.message) {
                errorMsg += `: ${errorData.error.message}`;
            } else {
                errorMsg += `: ${response.statusText}`;
            }
             // Check for specific API key related errors
            if (response.status === 400 && errorData?.error?.message?.toLowerCase().includes('api key not valid')) {
                errorMsg = "API Key is not valid. Please check the key in `script.js`.";
            }
             if (response.status === 403) {
                 errorMsg = "API Request Forbidden (403). This might be due to incorrect API key permissions or project setup issues."
             }

            throw new Error(errorMsg);
        }

        const data = await response.json();

        let aiResponseText = "Sorry, I had trouble thinking of an idea right now. Could you try rephrasing?";
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            aiResponseText = data.candidates[0].content.parts[0].text;
        } else {
            console.warn("Could not find generated text in the expected API response location:", data);
            if (data.candidates && data.candidates[0]?.finishReason === 'SAFETY') {
                aiResponseText = "I cannot provide a response to that topic due to safety guidelines. Let's stick to gift wrapping! 😊";
            } else if (data.promptFeedback?.blockReason) {
                aiResponseText = `I couldn't process that request (${data.promptFeedback.blockReason}). Could you try asking differently?`;
            }
        }

        addMessageToDisplay(aiResponseText, 'ai');
        chatHistory.push({ role: 'model', parts: [{ text: aiResponseText }] });

    } catch (error) {
        console.error("Error sending message:", error);
        addMessageToDisplay(`⚠️ Oops! Something went wrong: ${error.message}`, 'ai');
    } finally {
        showTyping(false);
    }
}

// Main function to handle sending user input
function handleSendMessage() {
    const userText = userInput.value.trim();
    if (!userText || isWaitingForResponse) {
        return;
    }

    addMessageToDisplay(userText, 'user');
    chatHistory.push({ role: 'user', parts: [{ text: userText }] });
    userInput.value = ''; // Clear input

    sendMessageToAI(userText); // Send to AI
}

// --- Initialization and Event Listeners ---

function addInitialGreetingAndChoices() {
    const initialAIResponse = INITIAL_CHOICES.question;
    addMessageToDisplay(initialAIResponse, 'ai');
    // Don't add initial hardcoded greeting to history if it doesn't come from the model
    // chatHistory.push({ role: 'model', parts: [{ text: initialAIResponse }] });
    displayInteractiveChoices(null, INITIAL_CHOICES.options);
}

// --- Event Listeners ---
sendButton.addEventListener('click', handleSendMessage);

userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
    // Clear interactive choices if user starts typing
    if (currentChoices.length > 0 && !isWaitingForResponse) {
        clearInteractiveElements();
    }
});

userInput.addEventListener('input', () => {
    // Clear interactive choices as soon as user types anything
    if (currentChoices.length > 0 && !isWaitingForResponse) {
         clearInteractiveElements();
    }
});


// Sidebar button actions
showTipsButton.addEventListener('click', () => {
    if (isWaitingForResponse) return;
    const text = "Can you give me some general gift wrapping tips?";
    addMessageToDisplay(text, 'user');
    chatHistory.push({ role: 'user', parts: [{ text: text }]});
    sendMessageToAI(text);
});

inspirationButton.addEventListener('click', () => {
     if (isWaitingForResponse) return;
    const text = "Where can I find inspiration for gift wrapping?";
    addMessageToDisplay(text, 'user');
    chatHistory.push({ role: 'user', parts: [{ text: text }]});
    sendMessageToAI(text);
});

clearChatButton.addEventListener('click', clearChat);

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    addInitialGreetingAndChoices();
    displayStarterPrompts();
    scrollToBottom();

     // Initial API Key Check (after DOM loaded)
     if (API_KEY === "YOUR_API_KEY_GOES_HERE" || !API_KEY) {
        setTimeout(() => {
             addMessageToDisplay("⚠️ **Action Required:** Please replace `YOUR_API_KEY_GOES_HERE` in the `script.js` file with your actual Google AI API key for the chat to function. Remember the security warning about exposing keys!", 'ai');
         }, 500);
     }
});
