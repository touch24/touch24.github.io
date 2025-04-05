// --- Elements ---
const messageDisplay = document.getElementById('message-display');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const typingIndicator = document.getElementById('typing-indicator');
const showTipsButton = document.getElementById('show-tips-button');
const inspirationButton = document.getElementById('inspiration-button');
const clearChatButton = document.getElementById('clear-chat-button');
const sidebarOutput = document.getElementById('sidebar-output'); // Optional: for sidebar messages

// --- API Configuration ---
// WARNING: Storing API keys directly in client-side JavaScript is insecure!
// For production, use a backend proxy to protect your key.
const API_KEY = "AIzaSyDRUdvRQdrIsWDNkYAKt7PyyHrY-bfhESg"; // <<<--- REPLACE THIS WITH YOUR ACTUAL GOOGLE AI API KEY
const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

// --- State ---
let chatHistory = []; // Stores the conversation { role: 'user'/'model', parts: [{ text: '...' }] }
let isWaitingForResponse = false;

// --- Core Functions ---

// Add a message to the chat display
function addMessageToDisplay(text, sender) {
     const bubble = document.createElement('div');
     bubble.classList.add('chat-bubble', sender); // sender is 'user' or 'ai'

     // Basic Markdown-like formatting (needs improvement for robustness)
     let formattedText = text
         .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
         .replace(/\*(.*?)\*/g, '<em>$1</em>')     // Italics (less common from AI maybe)
         .replace(/^- (.*$)/gm, '<li>$1</li>')      // Basic list items
         .replace(/(\r\n|\n|\r)/gm, "<br>");       // Newlines

     // Wrap list items in <ul> if any exist
     if (formattedText.includes('<li>')) {
        // Find blocks of list items and wrap them
         formattedText = formattedText.replace(/(<li>.*?<\/li>)(?!\s*<li>)/gs, '<ul>$1</ul>');
         // Clean up potential multiple wraps (simple approach)
         formattedText = formattedText.replace(/<\/ul>\s*<br>\s*<ul>/g, '');
         // Add some style to the list itself
         formattedText = formattedText.replace(/<ul>/g, '<ul style="margin-top: 0.5rem; margin-left: 1rem; padding-left: 1rem;">');
     }


     bubble.innerHTML = formattedText;
     messageDisplay.appendChild(bubble);
     scrollToBottom();
}


// Scroll chat display to the bottom
function scrollToBottom() {
    messageDisplay.scrollTop = messageDisplay.scrollHeight;
}

// Show/Hide typing indicator
function showTyping(show) {
    typingIndicator.style.display = show ? 'flex' : 'none';
    sendButton.disabled = show; // Disable send button while AI is thinking
    userInput.disabled = show; // Disable input field too
    isWaitingForResponse = show;
}

// Clear chat display and history
function clearChat() {
    messageDisplay.innerHTML = '';
    chatHistory = [];
     sidebarOutput.innerHTML = ''; // Clear sidebar output too
    addInitialGreeting(); // Add the greeting back
     userInput.value = ''; // Clear input field
    showTyping(false);
     console.log("Chat cleared.");
}


// Add the initial AI greeting
function addInitialGreeting() {
     const initialPrompt = `Hi there! 👋 I'm GiftWrap Genius, your AI assistant for creative gift wrapping ideas. To get started, please tell me what the gift is.`;
     addMessageToDisplay(initialPrompt, 'ai');
     // Add this initial AI message to history so the model knows its role and starting point
     // Make sure not to duplicate if clearChat calls this
     if (chatHistory.length === 0) {
        chatHistory.push({ role: 'model', parts: [{ text: initialPrompt }] });
     }
}

// Send message to AI and handle response
async function sendMessage() {
    const userText = userInput.value.trim();
    if (!userText || isWaitingForResponse) {
        return; // Don't send empty messages or while waiting
    }

     if (API_KEY === "YOUR_API_KEY" || !API_KEY) {
         addMessageToDisplay("⚠️ Error: API Key is missing. Please configure it in the script.js file.", 'ai');
         return;
     }

    // Display user message
    addMessageToDisplay(userText, 'user');
    chatHistory.push({ role: 'user', parts: [{ text: userText }] });
    userInput.value = ''; // Clear input
    showTyping(true);
     sidebarOutput.innerHTML = ''; // Clear sidebar tips/links display

     // Construct the prompt for the AI, including history
     // The Gemini API uses the history to understand context and instructions.
     // The initial message we added guides its behavior.

     // Create the payload using the current chat history
    const payload = {
        contents: chatHistory, // Send the entire conversation history
        safetySettings: [ // Keep reasonable safety defaults
             { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
             { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
             { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
             { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ],
        generationConfig: {
             temperature: 0.7,
             maxOutputTokens: 500 // Adjust as needed
        }
    };

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
             const errorData = await response.json();
             console.error("API Error Response:", errorData);
             throw new Error(`API Error (${response.status}): ${errorData?.error?.message || response.statusText}`);
        }

        const data = await response.json();

         let aiResponseText = "Sorry, I couldn't generate a response."; // Default
        // Extract response, checking typical locations
         if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
             aiResponseText = data.candidates[0].content.parts[0].text;
         } else {
             // Handle potential blockages
             if (data.candidates && data.candidates[0] && data.candidates[0].finishReason === 'SAFETY') {
                aiResponseText = "I cannot provide a response based on the prompt due to safety settings.";
                console.warn("Response blocked due to safety settings:", data.candidates[0]);
             } else if (data.promptFeedback && data.promptFeedback.blockReason) {
                  aiResponseText = `I cannot process the request. Reason: ${data.promptFeedback.blockReason}`;
                  console.warn("Prompt blocked:", data.promptFeedback);
             } else {
                 console.warn("Could not find generated text in the expected API response location:", data);
             }
         }

        // Add AI response to display and history
        addMessageToDisplay(aiResponseText, 'ai');
        chatHistory.push({ role: 'model', parts: [{ text: aiResponseText }] });

    } catch (error) {
        console.error("Error sending message:", error);
        addMessageToDisplay(`⚠️ Oops! Something went wrong fetching the response: ${error.message}`, 'ai');
         // Optionally remove the last user message from history if the API call failed severely,
         // otherwise the AI might get confused on retry.
         // chatHistory.pop();
    } finally {
        showTyping(false);
    }
}

// --- Sidebar Actions ---

function showTips() {
     const tips = [
         "Measure twice, cut once to save paper.",
         "Use double-sided tape for invisible seams.",
         "Add natural elements like twine or leaves for a rustic look.",
         "Recycle old maps or fabric for unique paper.",
         "A good ribbon elevates simple wrapping.",
         "Match the style to the recipient's personality.",
         "For awkward shapes, try fabric wrapping (Furoshiki) or gift bags."
     ];
    // Display tips in sidebar
     sidebarOutput.innerHTML = `<strong>Quick Tips:</strong><ul style="list-style:none; padding-left:0; margin-top: 5px;">${tips.map(tip => `<li style="margin-bottom: 5px;">💡 ${tip}</li>`).join('')}</ul>`;
     // You could also choose to send "Show me tips" to the chatbot instead:
     // simulateUserMessage("Show me some wrapping tips");
}

function showInspirationLinks() {
     const links = [
         { name: "Pinterest - Gift Wrapping", url: "https://www.pinterest.com/search/pins/?q=creative%20gift%20wrapping" },
         { name: "YouTube - DIY Wrapping", url: "https://www.youtube.com/results?search_query=diy+gift+wrapping" },
         { name: "Blog - Wrapping Ideas", url: "https://www.google.com/search?q=creative+gift+wrapping+blog" } // Generic search link
     ];
     sidebarOutput.innerHTML = `<strong>Inspiration Links:</strong><ul style="list-style:none; padding-left:0; margin-top: 5px;">${links.map(link => `<li style="margin-bottom: 5px;">🎨 <a href='${link.url}' target='_blank' rel='noopener noreferrer'>${link.name}</a></li>`).join('')}</ul>`;
     // Or send to chatbot:
     // simulateUserMessage("Can you give me links for wrapping inspiration?");
}

// Helper to simulate user message from button clicks if needed
function simulateUserMessage(text) {
    if (isWaitingForResponse) return; // Don't interrupt AI
    userInput.value = text;
    sendMessage();
}


// --- Event Listeners ---
sendButton.addEventListener('click', sendMessage);

userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { // Send on Enter, allow newline with Shift+Enter
        e.preventDefault(); // Prevent default Enter behavior (newline)
        sendMessage();
    }
});

showTipsButton.addEventListener('click', showTips);
inspirationButton.addEventListener('click', showInspirationLinks);
clearChatButton.addEventListener('click', clearChat);


// --- Initialization ---
// Use DOMContentLoaded to ensure HTML is ready before running script,
// especially if script tag is in <head> without 'defer'
document.addEventListener('DOMContentLoaded', () => {
    addInitialGreeting(); // Start the conversation
    scrollToBottom(); // Ensure view is at bottom initially
});
