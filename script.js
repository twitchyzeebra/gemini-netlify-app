document.addEventListener('DOMContentLoaded', () => {
    // Chat logic
    const chatInput = document.getElementById('chat-input');
    const chatForm = document.getElementById('chat-form');
    const chatLog = document.getElementById('chat-log');
    const loadingIndicator = document.getElementById('loading-indicator');
    const thinkingTimer = document.getElementById('thinking-timer');
    
    // Sidebar elements
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Document elements
    const chaptersList = document.getElementById('chapters-list');
    const searchDocs = document.getElementById('search-docs');
    const docPreview = document.getElementById('doc-preview');
    const docTitle = document.getElementById('doc-title');
    const docContent = document.getElementById('doc-content');
    const closePreview = document.getElementById('close-preview');
    const mainContent = document.getElementById('main-content');
    
    // Settings elements
    const chatToggle = document.getElementById('chat-toggle');
    const chatSection = document.getElementById('chat-section');
    
    // Debug: Check if close button was found
    if (!closePreview) {
        console.error('Close preview button not found in DOM');
    } else {
        console.log('Close preview button found successfully');
        console.log('Close button element:', closePreview);
        console.log('Close button innerHTML:', closePreview.innerHTML);
    }
    
    // Helper function to update layout based on document preview visibility
    function updateLayout() {
        const isHidden = docPreview.classList.contains('hidden');
        console.log('Updating layout, doc preview hidden:', isHidden);
        
        if (isHidden) {
            mainContent.classList.add('doc-preview-hidden');
            console.log('Added doc-preview-hidden class');
        } else {
            mainContent.classList.remove('doc-preview-hidden');
            console.log('Removed doc-preview-hidden class');
        }
    }
    
    // Ensure document preview starts hidden
    function ensureInitialState() {
        console.log('Setting initial state - hiding document preview');
        docPreview.classList.add('hidden');
        updateLayout();
    }
    
    // Chat toggle functionality
    function toggleChat() {
        const isVisible = chatToggle.checked;
        console.log('💬 Toggling chat visibility:', isVisible);
        
        if (isVisible) {
            chatSection.classList.remove('chat-hidden');
            mainContent.classList.remove('chat-hidden');
        } else {
            chatSection.classList.add('chat-hidden');
            mainContent.classList.add('chat-hidden');
        }
        
        // Save state to localStorage
        localStorage.setItem('chatVisible', isVisible);
        updateLayout();
    }
    
    // Load saved chat state
    function loadChatState() {
        const saved = localStorage.getItem('chatVisible');
        const isVisible = saved !== null ? saved === 'true' : true; // Default to visible
        
        chatToggle.checked = isVisible;
        toggleChat();
    }
    
    let thinkingInterval = null;
    let thinkingStartTime = null;
    let selectedChapter = null;

    // Sidebar functionality
    function toggleSidebar() {
        sidebar.classList.toggle('sidebar-collapsed');
        const isCollapsed = sidebar.classList.contains('sidebar-collapsed');
        
        // Save state to localStorage
        localStorage.setItem('sidebarCollapsed', isCollapsed);
    }

    function switchTab(targetTab) {
        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Add active class to clicked button and corresponding content
        const clickedButton = document.querySelector(`[data-tab="${targetTab}"]`);
        const targetContent = document.getElementById(`${targetTab}-tab`);
        
        if (clickedButton && targetContent) {
            clickedButton.classList.add('active');
            targetContent.classList.add('active');
        }
    }

    // Event listeners for sidebar
    sidebarToggleBtn.addEventListener('click', toggleSidebar);

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });

    // Restore sidebar state from localStorage
    const savedSidebarState = localStorage.getItem('sidebarCollapsed');
    if (savedSidebarState === 'true') {
        sidebar.classList.add('sidebar-collapsed');
    }

    function startThinkingTimer() {
        thinkingStartTime = Date.now();
        thinkingTimer.textContent = '0s';
        thinkingInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - thinkingStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            
            if (minutes > 0) {
                thinkingTimer.textContent = `${minutes}m ${seconds}s`;
            } else {
                thinkingTimer.textContent = `${seconds}s`;
            }
        }, 1000);
    }
    
    function stopThinkingTimer() {
        if (thinkingInterval) {
            clearInterval(thinkingInterval);
            thinkingInterval = null;
        }
        // Reset timer display
        thinkingTimer.textContent = '0s';
        thinkingStartTime = null;
    }

    function addMessage(text, className) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${className}`;
        
        // For AI messages, preserve formatting and convert markdown
        if (className === 'ai-message') {
            messageDiv.innerHTML = formatAIResponse(text);
        } else {
            messageDiv.textContent = text;
        }
        
        chatLog.appendChild(messageDiv);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    // Format AI responses with proper markdown rendering
    function formatAIResponse(text) {
        return text
            // Preserve line breaks
            .replace(/\n/g, '<br>')
            // Convert headers
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            // Convert bold text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // Convert italic text  
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // Convert bullet points
            .replace(/^\* (.+)$/gm, '<li>$1</li>')
            // Wrap consecutive list items in ul tags
            .replace(/((?:<li>.*<\/li><br>)+)/g, '<ul>$1</ul>')
            // Clean up extra breaks in lists
            .replace(/<\/li><br>/g, '</li>')
            // Convert numbered lists
            .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
            // Convert code blocks (triple backticks)
            .replace(/```(.+?)```/gs, '<pre><code>$1</code></pre>')
            // Convert inline code
            .replace(/`(.+?)`/g, '<code>$1</code>');
    }

    async function sendMessage(e) {
        if (e) e.preventDefault();
        const prompt = chatInput.value.trim();
        if (!prompt) return;
        addMessage(prompt, 'user-message');
        chatInput.value = '';
        
        // Start thinking timer and show loading
        loadingIndicator.classList.remove('hidden');
        startThinkingTimer();
        
        // Add placeholder message that will be updated
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'message ai-message streaming';
        aiMessageDiv.textContent = 'AI is thinking...';
        chatLog.appendChild(aiMessageDiv);
        chatLog.scrollTop = chatLog.scrollHeight;
        
        let useUnlimitedStream = false;
        
        try {
            console.log('🚀 Starting chat request with smart timeout handling...');
            
            // Try regular chat first with timeout detection
            const startTime = Date.now();
            const response = await fetch('/.netlify/functions/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            
            const duration = Date.now() - startTime;
            console.log(`📊 Regular chat response time: ${duration}ms`);
            
            if (response.status === 206) {
                // Partial content due to local dev timeout
                const data = await response.json();
                aiMessageDiv.innerHTML = formatAIResponse(data.text + '\n\n[Note: Response truncated due to local development timeout limits]');
                aiMessageDiv.classList.remove('streaming');
                return;
            }
            
            if (response.status === 408 || (response.status === 500 && duration > 25000)) {
                console.log('⏰ Timeout detected, switching to unlimited streaming...');
                useUnlimitedStream = true;
                throw new Error('Timeout detected - switching to unlimited mode');
            }
            
            if (response.status === 429) {
                const errorData = await response.json();
                aiMessageDiv.innerHTML = formatAIResponse('Rate limit exceeded. Please wait before sending another message. (Maximum 4 messages per minute)');
                aiMessageDiv.classList.remove('streaming');
                return;
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                console.log('❌ Regular chat failed:', response.status, errorText);
                
                // Check if it might be a timeout issue
                if (duration > 20000 || errorText.includes('timeout') || errorText.includes('timed out')) {
                    console.log('🔄 Timeout suspected, trying unlimited streaming...');
                    useUnlimitedStream = true;
                    throw new Error('Timeout suspected - switching to unlimited mode');
                }
                
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Handle streaming response
            if (data.streaming) {
                // Apply formatting to the AI response
                aiMessageDiv.innerHTML = formatAIResponse(data.text);
                
                // Add metadata about the response
                const metaDiv = document.createElement('div');
                metaDiv.className = 'response-meta';
                let metaText = `Generated in ${(data.duration/1000).toFixed(1)}s • ${data.chunks} chunks • ${data.text.length} characters`;
                
                if (data.unlimited) {
                    metaText += ' • 🚀 Unlimited streaming';
                    metaDiv.style.color = '#4caf50';
                } else if (data.partial) {
                    metaText += ' • ⚠️ Partial response (time limit reached)';
                    metaDiv.style.color = '#ff9800';
                }
                
                metaDiv.innerHTML = `<small>${metaText}</small>`;
                aiMessageDiv.appendChild(metaDiv);
            } else {
                aiMessageDiv.innerHTML = formatAIResponse(data.text);
            }
            
            aiMessageDiv.classList.remove('streaming');
            
        } catch (error) {
            console.error('❌ Error in regular chat:', error.message);
            
            // Try unlimited streaming if regular chat failed due to timeout
            if (useUnlimitedStream || error.message.includes('timeout') || error.message.includes('switching to unlimited')) {
                console.log('🔄 Attempting multi-part unlimited streaming fallback...');
                
                try {
                    aiMessageDiv.textContent = 'Switching to unlimited mode - AI is thinking deeply...';
                    
                    // Use the new multi-part unlimited endpoint
                    let fullResponse = '';
                    let requestId = null;
                    let attemptCount = 0;
                    const maxAttempts = 5; // Allow up to 5 continuation requests for very long responses
                    
                    while (attemptCount < maxAttempts) {
                        attemptCount++;
                        console.log(`🔄 Multi-part request attempt ${attemptCount}/${maxAttempts}`);
                        
                        const requestBody = { 
                            prompt: prompt,
                            requestId: requestId,
                            continueFrom: fullResponse.length > 2000 ? 
                                fullResponse.slice(-1500) + '...[CONTINUATION NEEDED]' : 
                                fullResponse
                        };
                        
                        aiMessageDiv.textContent = `Getting response part ${attemptCount}... (unlimited mode) - ${fullResponse.length} characters so far`;
                        
                        const unlimitedResponse = await fetch('/.netlify/functions/chat-unlimited', {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'X-Request-ID': requestId || `multipart_${Date.now()}`
                            },
                            body: JSON.stringify(requestBody)
                        });
                        
                        if (!unlimitedResponse.ok) {
                            throw new Error(`Multi-part unlimited streaming failed: ${unlimitedResponse.status}`);
                        }
                        
                        const unlimitedData = await unlimitedResponse.json();
                        console.log(`✅ Multi-part attempt ${attemptCount} successful!`);
                        
                        // Handle response accumulation properly
                        if (attemptCount === 1) {
                            // First part - set the initial response
                            fullResponse = unlimitedData.response;
                            requestId = unlimitedData.requestId;
                        } else {
                            // Continuation part - append the new content
                            // Only append if this is actually new content
                            if (unlimitedData.isContinuation && unlimitedData.response.trim()) {
                                fullResponse += ' ' + unlimitedData.response.trim();
                            } else if (!unlimitedData.isContinuation) {
                                // If backend returned full response again, replace it
                                fullResponse = unlimitedData.response;
                            }
                        }
                        
                        // Update display with accumulated progress
                        aiMessageDiv.innerHTML = formatAIResponse(fullResponse);
                        aiMessageDiv.scrollTop = aiMessageDiv.scrollHeight;
                        
                        // Log continuation check details
                        console.log(`📊 Part ${attemptCount} analysis:`, {
                            needsContinuation: unlimitedData.needsContinuation,
                            currentPartLength: unlimitedData.length,
                            totalAccumulatedLength: fullResponse.length,
                            duration: unlimitedData.duration,
                            isContinuation: unlimitedData.isContinuation
                        });
                        
                        // Check if we need to continue - improved logic
                        const shouldContinue = unlimitedData.needsContinuation && 
                                             unlimitedData.length > 200 && 
                                             attemptCount < maxAttempts &&
                                             fullResponse.length > 800; // Only continue if we have substantial content
                        
                        if (!shouldContinue) {
                            console.log('🎉 Multi-part response complete!');
                            break;
                        }
                        
                        console.log('🔄 Response needs continuation, preparing next part...');
                        
                        // Brief pause between requests
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    
                    // Add final metadata
                    const metaDiv = document.createElement('div');
                    metaDiv.className = 'response-meta';
                    metaDiv.style.color = '#4caf50';
                    metaDiv.innerHTML = `<small>🚀 Multi-part unlimited streaming: ${attemptCount} parts • ${fullResponse.length} total characters</small>`;
                    aiMessageDiv.appendChild(metaDiv);
                    
                    aiMessageDiv.classList.remove('streaming');
                    return;
                    
                } catch (unlimitedError) {
                    console.error('❌ Multi-part unlimited streaming also failed:', unlimitedError);
                    aiMessageDiv.innerHTML = formatAIResponse('Both regular and unlimited streaming failed. Please try again.');
                    aiMessageDiv.classList.remove('streaming');
                    return;
                }
            }
            
            // Handle other errors
            if (error.name === 'AbortError') {
                aiMessageDiv.innerHTML = formatAIResponse('Request timed out. Trying unlimited mode next time...');
            } else {
                aiMessageDiv.innerHTML = formatAIResponse('Sorry, something went wrong. Please try again.');
            }
            aiMessageDiv.classList.remove('streaming');
        } finally {
            // Stop thinking timer
            stopThinkingTimer();
            loadingIndicator.classList.add('hidden');
        }
    }

    // Simulate typing effect
    async function typeText(element, text) {
        const words = text.split(' ');
        element.textContent = '';
        
        for (let i = 0; i < words.length; i++) {
            element.textContent += (i > 0 ? ' ' : '') + words[i];
            chatLog.scrollTop = chatLog.scrollHeight;
            
            // Faster typing - show multiple words at once for longer responses
            if (words.length > 100 && i % 3 === 0) {
                await new Promise(resolve => setTimeout(resolve, 50));
            } else if (words.length > 50 && i % 2 === 0) {
                await new Promise(resolve => setTimeout(resolve, 30));
            } else {
                await new Promise(resolve => setTimeout(resolve, 20));
            }
        }
    }

    chatForm.addEventListener('submit', sendMessage);
    
    // Handle Enter and Shift+Enter in the textarea
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                // Shift+Enter: Allow new line (default behavior)
                return;
            } else {
                // Enter only: Send message
                e.preventDefault();
                sendMessage(e);
            }
        }
    });

    // Auto-resize textarea based on content
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        const maxHeight = 150; // Maximum height in pixels
        const newHeight = Math.min(chatInput.scrollHeight, maxHeight);
        chatInput.style.height = newHeight + 'px';
        chatInput.style.overflowY = newHeight >= maxHeight ? 'auto' : 'hidden';
    });

    // Document sidebar logic
    let chaptersData = [];

    // Simple Markdown parser for basic formatting
    function parseMarkdown(text) {
        return text
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/gim, '<em>$1</em>')
            .replace(/`(.*?)`/gim, '<code>$1</code>')
            .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
            .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
            .replace(/^\* (.*$)/gim, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>')
            .replace(/\n/gim, '<br>');
    }

    // Show document preview
    function showDocPreview(title, content, isMarkdown = false) {
        docTitle.textContent = title;
        if (isMarkdown) {
            docContent.innerHTML = parseMarkdown(content);
        } else {
            docContent.textContent = content;
        }
        docPreview.classList.remove('hidden');
        updateLayout(); // Update layout when showing document
    }

    // SIMPLIFIED CLOSE BUTTON FUNCTIONALITY
    window.closeDocumentPreview = function() {
        console.log('🔴 CLOSE FUNCTION CALLED');
        docPreview.classList.add('hidden');
        updateLayout();
        console.log('✅ Document preview should now be hidden');
    };
    
    // Simple event handler
    if (closePreview) {
        console.log('📌 Setting up close button event...');
        closePreview.onclick = function() {
            console.log('🎯 CLOSE BUTTON CLICKED!');
            closeDocumentPreview();
            return false;
        };
        console.log('✅ Close button event handler attached');
    }

    // Chat toggle functionality
    if (chatToggle) {
        console.log('💬 Setting up chat toggle...');
        chatToggle.addEventListener('change', toggleChat);
        console.log('✅ Chat toggle event handler attached');
    } else {
        console.error('Chat toggle element not found!');
    }

    // Fetch document content
    async function fetchDocContent(url, filename) {
        // Show loading state
        showDocPreview(filename, 'Loading document...', false);
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch document');
            const content = await response.text();
            const isMarkdown = filename.toLowerCase().endsWith('.md');
            showDocPreview(filename, content, isMarkdown);
        } catch (error) {
            console.error('Error fetching document:', error);
            showDocPreview(filename, 'Error loading document content.', false);
        }
    }

    // Recursive render for folders/files
    function renderChapters(structure, filter = '', parent = chaptersList) {
        parent.innerHTML = '';
        if (!structure || structure.length === 0) {
            parent.innerHTML = '<div style="color:#888;">No chapters found.</div>';
            return;
        }
        structure.forEach(item => {
            if (item.type === 'folder') {
                const folderDiv = document.createElement('div');
                folderDiv.className = 'chapter-folder';
                const folderLabel = document.createElement('strong');
                folderLabel.textContent = item.name;
                folderDiv.appendChild(folderLabel);
                const childrenDiv = document.createElement('div');
                childrenDiv.className = 'chapter-children';
                folderDiv.appendChild(childrenDiv);
                folderLabel.addEventListener('click', () => {
                    folderDiv.classList.toggle('expanded');
                });
                // Recursively render children
                renderChapters(item.children, filter, childrenDiv);
                parent.appendChild(folderDiv);
            } else if (item.type === 'file') {
                if (filter && !item.name.toLowerCase().includes(filter.toLowerCase())) return;
                const chapterDiv = document.createElement('div');
                chapterDiv.className = 'chapter';
                chapterDiv.textContent = item.name;
                chapterDiv.addEventListener('click', () => {
                    if (selectedChapter) selectedChapter.classList.remove('selected');
                    chapterDiv.classList.add('selected');
                    selectedChapter = chapterDiv;
                    
                    // Check if it's a text-based file we can preview
                    const isPreviewable = item.name.toLowerCase().match(/\.(md|txt|json|js|css|html|xml|yml|yaml)$/);
                    
                    if (isPreviewable) {
                        fetchDocContent(item.url, item.name);
                    } else {
                        window.open(item.url, '_blank');
                    }
                });
                parent.appendChild(chapterDiv);
            }
        });
    }

    async function fetchChapters() {
        chaptersList.innerHTML = '<div style="color:#888;">Loading chapters...</div>';
        try {
            const res = await fetch('/.netlify/functions/list-docs');
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            chaptersData = await res.json();
            if (!chaptersData || chaptersData.length === 0) {
                chaptersList.innerHTML = '<div style="color:#888;">No chapters found.</div>';
                return;
            }
            renderChapters(chaptersData);
        } catch (err) {
            console.error('Error fetching chapters:', err);
            chaptersList.innerHTML = '<div style="color:#c00;">Error loading chapters: ' + err.message + '</div>';
        }
    }

    searchDocs.addEventListener('input', (e) => {
        const filter = e.target.value;
        renderChapters(chaptersData, filter);
    });

    fetchChapters();
    
    // Initialize proper state on page load
    setTimeout(() => {
        console.log('🚀 Initializing application state...');
        ensureInitialState();
        loadChatState(); // Load saved chat visibility state
        console.log('✅ Initial state complete');
    }, 100);
});
            