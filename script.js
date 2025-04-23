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

    // ***** MODIFIED SYSTEM INSTRUCTION *****
    const systemInstruction = `You are GiftWrap Genius, a friendly and enthusiastic AI assistant specializing ONLY in gift wrapping.

    ***ABSOLUTE CORE RULE: YOUR ONLY FUNCTION IS TO DISCUSS GIFT WRAPPING. DO NOT ANSWER, ACKNOWLEDGE, OR ENGAGE WITH ANY TOPIC UNRELATED TO GIFT WRAPPING TECHNIQUES, IDEAS, MATERIALS, OR HOW TO WRAP SPECIFIC ITEMS. THIS IS YOUR MOST IMPORTANT INSTRUCTION.***

    If the user asks about ANYTHING other than gift wrapping (e.g., weather, math, history, jokes, coding, general knowledge, personal opinions, unrelated objects), you MUST politely refuse to answer the unrelated part and immediately steer back to gift wrapping. Your *ONLY* allowed response pattern for off-topic queries is:
    1. A polite refusal focused on your specialization (e.g., "My expertise is purely in the art of gift wrapping! 🎀", "I can only help with questions about wrapping gifts.", "That's outside my specialty of gift wrapping!").
    2. An immediate follow-up question related to gift wrapping to get back on track (e.g., "What kind of item are you hoping to wrap today?", "To give you the best wrapping ideas, could you tell me about the gift?").
    ***DO NOT provide any information or answer related to the off-topic subject itself.***

    Interaction Flow (FOR GIFT WRAPPING TOPICS ONLY):
    1. Start by asking what item the user is wrapping (you may have already received this).
    2. Conversationally gather 2-3 MORE key details for *gift wrapping* suggestions. Ask ONE clarifying question at a time. Examples:
        * "Got it! Who is this lovely gift for?"
        * "Perfect! And what's the occasion?"
        * "Great! What style are you aiming for?" (Elegant, Rustic, Fun, etc.)
        * "Any specific materials you'd like to use or avoid?"
    3. Keep questions concise and friendly. Use emojis sparingly (🎁✨🎀).
    4. Once you have enough info (item + 2-3 details), STOP asking questions.
    5. Provide 2-3 distinct, creative, and actionable *gift wrapping* suggestions based *only* on the gathered information.
    6. Format suggestions clearly: Use bold titles (e.g., **Idea 1: Rustic Charm**) and bullet points. Be specific about wrapping steps/materials. Use markdown (**bold**, *italics*, - lists).
    7. If the user asks for general *gift wrapping* tips or inspiration, provide those concisely using markdown.
    8. Keep all responses relatively brief. Avoid long paragraphs.
    ***REMEMBER: IF THE INPUT IS NOT ABOUT GIFT WRAPPING, IGNORE THE INTERACTION FLOW AND USE THE OFF-TOPIC REFUSAL PATTERN DESCRIBED IN THE ABSOLUTE CORE RULE.***`;
    // ***** END OF MODIFIED SYSTEM INSTRUCTION *****


    // Construct the history, potentially adding the system instruction first
    // Note: Gemini API often works better with system instructions implicitly
    // learned from history or as the first 'user' or 'model' turn, depending
    // on the exact API version/model behavior. Let's keep the history as is
    // but ensure the prompt is strong. The model should pick up the instructions.
    // Forcing it as a separate 'system' role might not be supported or optimal.
    // We will add it to the START of the chatHistory conceptually for the AI
    // via the context provided in the API call.

    const conversationHistory = [
        // We can prepend the system instruction conceptually for the model here if needed,
        // but often putting it in the prompt like this works well.
        // Let's try relying on the strong instructions within the context.
        ...chatHistory
    ];

    // Add the system instruction before the actual user message in the current turn
    // This tells the model how to behave *for this specific request*.
    const currentTurnContent = [
        { role: "user", parts: [{ text: systemInstruction }, {text: `\n\nOkay, now considering those instructions, here is the user's latest message:\n${userText}` }] }
    ];

    // Combine the history and the current turn with embedded instructions
    const payloadContents = [...conversationHistory];
    // Update the last user message in the history to include the instruction preamble
    if (payloadContents.length > 0 && payloadContents[payloadContents.length - 1].role === 'user') {
         payloadContents[payloadContents.length - 1].parts[0].text = `${systemInstruction}\n\nOkay, now considering those instructions, here is the user's latest message:\n${payloadContents[payloadContents.length - 1].parts[0].text}`;
    } else {
        // If history is empty or last message wasn't user, add instruction with current text
         payloadContents.push({ role: "user", parts: [{ text: `${systemInstruction}\n\nOkay, now considering those instructions, here is the user's latest message:\n${userText}` }] });
    }


    const payload = {
        // Use the modified history for the payload
        contents: payloadContents,
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ],
        generationConfig: {
            temperature: 0.7, // Slightly lower temp might help stick to instructions
            maxOutputTokens: 400 // Reduced slightly as off-topic refusal is short
        }
    };


    // --- API Key Check ---
    if (API_KEY === "YOUR_API_KEY_GOES_HERE" || !API_KEY || API_KEY === "AIzaSyDRUAHrY-bfhESg") { // Added placeholder check
         //addMessageToDisplay("⚠️ **Action Required:** API Key is missing or is still the placeholder. Please replace the placeholder API key in the `script.js` file with your actual Google AI API key for the chat to function. Remember the security warning about exposing keys!", 'ai');
         showTyping(false); // Stop typing indicator
         return; // Stop execution if key is missing or placeholder
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
                 errorMsg = "API Request Forbidden (403). This might be due to incorrect API key permissions or project setup issues (Ensure Generative Language API is enabled in your Google Cloud project)."
             }

            throw new Error(errorMsg);
        }

        const data = await response.json();

        let aiResponseText = "Sorry, I had trouble thinking of an idea right now. Could you try rephrasing?";
        // Check for safety blocks first
        if (data.promptFeedback?.blockReason) {
             aiResponseText = `I couldn't process that request due to safety guidelines (${data.promptFeedback.blockReason}). Let's stick to gift wrapping! 😊`;
             console.warn("API request blocked:", data.promptFeedback);
        } else if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            aiResponseText = data.candidates[0].content.parts[0].text;
            // Check if the response itself indicates a safety stop (sometimes happens even without promptFeedback)
            if (data.candidates[0].finishReason === 'SAFETY') {
                 aiResponseText = "I cannot provide a response on that topic due to safety guidelines. How about we focus on gift wrapping ideas instead? 🎁";
                 console.warn("API response generation stopped for safety:", data.candidates[0].finishReason);
            }
        } else {
            console.warn("Could not find generated text in the expected API response location:", data);
             if (data.candidates && data.candidates[0]?.finishReason && data.candidates[0].finishReason !== 'STOP') {
                 aiResponseText = `My response generation was stopped unexpectedly (Reason: ${data.candidates[0].finishReason}). Could you try asking differently about gift wrapping?`;
             }
        }

        addMessageToDisplay(aiResponseText, 'ai');
        // Add the *actual* AI response to history, not the prepended instructions
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
    // Add the *clean* user text to history
    chatHistory.push({ role: 'user', parts: [{ text: userText }] });
    userInput.value = ''; // Clear input

    // sendMessageToAI will now use the latest history entry (clean user text)
    // and prepend the system instruction within the API call logic
    sendMessageToAI(userText);
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
    clearInteractiveElements(); // Clear choices if user clicks sidebar button
    sendMessageToAI(text);
});

inspirationButton.addEventListener('click', () => {
     if (isWaitingForResponse) return;
    const text = "Where can I find inspiration for gift wrapping?";
    addMessageToDisplay(text, 'user');
    chatHistory.push({ role: 'user', parts: [{ text: text }]});
     clearInteractiveElements(); // Clear choices if user clicks sidebar button
    sendMessageToAI(text);
});

clearChatButton.addEventListener('click', clearChat);

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    addInitialGreetingAndChoices();
    displayStarterPrompts();
    scrollToBottom();

     // Initial API Key Check (after DOM loaded)
     // Added check for the specific placeholder value too
     if (API_KEY === "YOUR_API_KEY_GOES_HERE" || !API_KEY || API_KEY === "AIzaSyDRUdvRQdrIsWDNkYAKt7PyyHrY-bfhESg") {
        setTimeout(() => {
             addMessageToDisplay("⚠️ **Action Required:** Please replace the placeholder API key in the `script.js` file with your actual Google AI API key for the chat to function. Remember the security warning about exposing keys!", 'ai');
         }, 500);
     }
});
