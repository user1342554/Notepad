const { ipcRenderer } = require('electron');
const CodeMirror = require('codemirror');

// Tab management
let tabs = [{ id: 'tab-1', name: 'Untitled', content: '', path: null, modified: false }];
let activeTabId = 'tab-1';

// Initialize CodeMirror
const editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
  lineNumbers: true,
  theme: 'dracula',
  mode: 'text/plain',
  indentUnit: 2,
  smartIndent: true,
  tabSize: 2,
  indentWithTabs: false,
  lineWrapping: true,
  matchBrackets: true,
  autoCloseBrackets: true,
  autofocus: true,
  foldGutter: true,
  gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
});

// Add custom token for list items with indentation
editor.getMode().token = function(stream, state) {
  // Check if line starts with list marker
  if (stream.sol()) {
    // Check for numbered list
    if (stream.match(/^\s*\d+\.\s/)) {
      return "list-1";
    }
    // Check for bullet list
    if (stream.match(/^\s*[•\-*]\s/)) {
      return "list-1";
    }
    // Check for checkbox
    if (stream.match(/^\s*[☐☑]\s/)) {
      return "list-1";
    }
  }
  
  stream.next();
  return null;
};

// Get settings without the dark mode toggle
const settings = ipcRenderer.sendSync('get-settings');
// Force dark mode and apply other settings
settings.darkMode = true; // Always use dark mode
applySettings(settings);

// Update editor content on tab switch
function updateEditorContent() {
  const activeTab = tabs.find(tab => tab.id === activeTabId);
  if (activeTab) {
    editor.setValue(activeTab.content);
    const tabNameEl = document.querySelector('.tab.active .tab-name');
    if (tabNameEl) {
      tabNameEl.textContent = activeTab.name + (activeTab.modified ? ' *' : '');
    }
    document.getElementById('file-path').textContent = activeTab.path || 'No file open';
    updateWordCount(activeTab.content);
    
    // Update the window title
    ipcRenderer.send('update-title', `Jonas Notepad - ${activeTab.name}`);
    
    // Add a subtle animation to the editor when switching tabs
    document.querySelector('.editor-container').classList.add('tab-switch');
    setTimeout(() => {
      document.querySelector('.editor-container').classList.remove('tab-switch');
    }, 300);
    
    // Detect file type and set mode
    if (activeTab.path) {
      const extension = activeTab.path.split('.').pop().toLowerCase();
      let mode = 'text/plain';
      let fileType = 'Plain Text';
      
      if (extension === 'js') {
        mode = 'javascript';
        fileType = 'JavaScript';
      } else if (extension === 'html') {
        mode = 'htmlmixed';
        fileType = 'HTML';
      } else if (extension === 'css') {
        mode = 'css';
        fileType = 'CSS';
      } else if (extension === 'md') {
        mode = 'markdown';
        fileType = 'Markdown';
      } else if (extension === 'py') {
        mode = 'python';
        fileType = 'Python';
      } else if (extension === 'json') {
        mode = { name: 'javascript', json: true };
        fileType = 'JSON';
      }
      
      editor.setOption('mode', mode);
      document.getElementById('file-type').textContent = fileType;
    }

    // Refresh the editor to ensure proper rendering
    setTimeout(() => {
      editor.refresh();
    }, 10);
  }
}

// Word count with animation
function updateWordCount(text) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const lines = text.split('\n').length;
  
  // Animate the counter updates with a subtle fade
  animateCounter('word-count', 'Words', words);
  animateCounter('char-count', 'Characters', chars);
  animateCounter('line-count', 'Lines', lines);
}

// Animated counter function
function animateCounter(elementId, label, newValue) {
  const element = document.getElementById(elementId);
  const currentText = element.textContent;
  const currentValue = parseInt(currentText.match(/\d+/) || [0], 10);
  
  if (currentValue !== newValue) {
    // Add fade-out class
    element.classList.add('counter-update');
    
    // Update the value after a short delay
    setTimeout(() => {
      element.textContent = `${label}: ${newValue}`;
      // Remove fade-out class to trigger fade-in
      element.classList.remove('counter-update');
    }, 150);
  }
}

// Create a new tab with animation
function createNewTab() {
  const id = `tab-${Date.now()}`;
  tabs.push({ id, name: 'Untitled', content: '', path: null, modified: false });
  
  // Create tab DOM element
  const tabElement = document.createElement('div');
  tabElement.className = 'tab';
  tabElement.dataset.tabId = id;
  
  // Create tab name span
  const tabNameSpan = document.createElement('span');
  tabNameSpan.className = 'tab-name';
  tabNameSpan.textContent = 'Untitled';
  tabElement.appendChild(tabNameSpan);
  
  // Create close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'tab-close-btn';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent tab activation when clicking close
    closeTab(id);
  });
  tabElement.appendChild(closeBtn);
  
  // Insert before the + button
  document.querySelector('.new-tab-btn').before(tabElement);
  
  // Add animation class
  tabElement.classList.add('tab-new');
  setTimeout(() => {
    tabElement.classList.remove('tab-new');
  }, 400);
  
  // Activate the new tab
  setActiveTab(id);
  
  // Play a subtle sound effect
  playSound('tab-new');
}

// Set active tab
function setActiveTab(id) {
  // Update DOM
  document.querySelectorAll('.tab').forEach(tab => {
    if (tab.dataset.tabId === id) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  // Save content of current tab before switching
  const currentTab = tabs.find(tab => tab.id === activeTabId);
  if (currentTab) {
    currentTab.content = editor.getValue();
  }
  
  // Update active tab
  activeTabId = id;
  
  // Update editor content
  updateEditorContent();
}

// Close tab with improved animation
function closeTab(id) {
  // Get index of tab to close
  const index = tabs.findIndex(tab => tab.id === id);
  
  if (index !== -1) {
    const tabElement = document.querySelector(`.tab[data-tab-id="${id}"]`);
    
    // Add closing animation
    tabElement.classList.add('tab-closing');
    
    // Play a subtle sound effect
    playSound('tab-close');
    
    setTimeout(() => {
      // Remove tab
      tabs.splice(index, 1);
      
      // Remove tab element
      tabElement.remove();
      
      // If closed tab was active, activate another tab
      if (id === activeTabId) {
        if (tabs.length > 0) {
          setActiveTab(tabs[Math.min(index, tabs.length - 1)].id);
        } else {
          // Create a new tab if all tabs were closed
          createNewTab();
        }
      }
    }, 300);
  }
}

// Apply settings (always dark mode)
function applySettings(settings) {
  // Force dark mode
  document.body.classList.add('dark-mode');
  editor.setOption('theme', 'dracula');
  
  // Font settings
  document.querySelector('.CodeMirror').style.fontSize = `${settings.fontSize}px`;
  document.querySelector('.CodeMirror').style.fontFamily = settings.fontFamily;
  
  // Editor settings
  editor.setOption('lineNumbers', settings.lineNumbers);
  editor.setOption('tabSize', settings.tabSize);
  editor.setOption('lineWrapping', settings.wordWrap);
  
  // Update settings UI (dark mode checkbox removed from HTML)
  document.getElementById('font-size').value = settings.fontSize;
  document.getElementById('font-family').value = settings.fontFamily;
  document.getElementById('tab-size').value = settings.tabSize;
  document.getElementById('line-numbers').checked = settings.lineNumbers;
  document.getElementById('word-wrap').checked = settings.wordWrap;
  document.getElementById('auto-save').checked = settings.autoSave;
  
  // Refresh the editor to ensure proper rendering after settings change
  setTimeout(() => {
    editor.refresh();
  }, 10);
}

// Sound effects system
function playSound(soundType) {
  // Create a simple oscillator for sound effects
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (soundType === 'tab-new') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } else if (soundType === 'tab-close') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(220, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } else if (soundType === 'notification') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    }
  } catch (e) {
    // If audio context fails, just continue silently
    console.log('Audio not available:', e);
  }
}

// Event: Change in editor
editor.on('change', () => {
  const activeTab = tabs.find(tab => tab.id === activeTabId);
  if (activeTab) {
    const oldModified = activeTab.modified;
    activeTab.content = editor.getValue();
    activeTab.modified = activeTab.path !== null && oldModified === false ? true : activeTab.modified;
    
    if (oldModified !== activeTab.modified) {
      const tabNameEl = document.querySelector('.tab.active .tab-name');
      if (tabNameEl) {
        tabNameEl.textContent = activeTab.name + (activeTab.modified ? ' *' : '');
      }
    }
    
    updateWordCount(activeTab.content);
    
    // Auto-save
    if (settings.autoSave && activeTab.path) {
      saveCurrent();
    }
  }
});

// Event: Cursor position change
editor.on('cursorActivity', () => {
  const cursor = editor.getCursor();
  const positionElement = document.getElementById('cursor-position');
  
  // Smooth transition for cursor position indicator
  positionElement.classList.add('position-update');
  setTimeout(() => {
    positionElement.textContent = `Ln: ${cursor.line + 1}, Col: ${cursor.ch + 1}`;
    positionElement.classList.remove('position-update');
  }, 100);
});

// Event: Tab click
document.addEventListener('click', event => {
  if (event.target.classList.contains('tab') || event.target.parentElement.classList.contains('tab')) {
    const tab = event.target.classList.contains('tab') ? event.target : event.target.parentElement;
    setActiveTab(tab.dataset.tabId);
  } else if (event.target.classList.contains('new-tab-btn')) {
    createNewTab();
  }
});

// Save current file with visual feedback
function saveCurrent() {
  const activeTab = tabs.find(tab => tab.id === activeTabId);
  if (activeTab && activeTab.path) {
    // Show saving indicator
    showToast('Saving file...');
    
    ipcRenderer.send('save-content', { filePath: activeTab.path, content: activeTab.content });
    activeTab.modified = false;
    const tabNameEl = document.querySelector('.tab.active .tab-name');
    if (tabNameEl) {
      tabNameEl.textContent = activeTab.name;
    }
    
    // Show saved confirmation after a short delay
    setTimeout(() => {
      showToast('File saved successfully');
    }, 300);
  }
}

// Show settings modal
function showSettings() {
  const modal = document.getElementById('settings-modal');
  modal.style.display = 'block';
  
  // Add entrance animation for settings options
  const settingElements = document.querySelectorAll('.setting');
  settingElements.forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(() => {
      el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 50 + index * 50);
  });
}

// IPC events
ipcRenderer.on('file-new', () => {
  createNewTab();
});

ipcRenderer.on('show-settings', () => {
  showSettings();
});

// Tab management via keyboard shortcuts
ipcRenderer.on('new-tab', () => {
  createNewTab();
});

ipcRenderer.on('close-tab', () => {
  if (activeTabId) {
    closeTab(activeTabId);
  }
});

ipcRenderer.on('next-tab', () => {
  if (tabs.length > 1) {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
    const nextIndex = (currentIndex + 1) % tabs.length;
    setActiveTab(tabs[nextIndex].id);
  }
});

ipcRenderer.on('prev-tab', () => {
  if (tabs.length > 1) {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
    const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    setActiveTab(tabs[prevIndex].id);
  }
});

ipcRenderer.on('file-opened', (event, { filePath, content }) => {
  const fileName = filePath.split(/[\\/]/).pop();
  
  // Check if the file is already open
  const existingTabIndex = tabs.findIndex(tab => tab.path === filePath);
  
  if (existingTabIndex !== -1) {
    // If already open, just activate that tab
    setActiveTab(tabs[existingTabIndex].id);
    showToast(`Switched to ${fileName}`);
  } else {
    // Create a new tab for the opened file
    const id = `tab-${Date.now()}`;
    tabs.push({ id, name: fileName, content, path: filePath, modified: false });
    
    // Create tab DOM element
    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.dataset.tabId = id;
    
    // Create tab name span
    const tabNameSpan = document.createElement('span');
    tabNameSpan.className = 'tab-name';
    tabNameSpan.textContent = fileName;
    tabElement.appendChild(tabNameSpan);
    
    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close-btn';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent tab activation when clicking close
      closeTab(id);
    });
    tabElement.appendChild(closeBtn);
    
    // Insert before the + button
    document.querySelector('.new-tab-btn').before(tabElement);
    
    // Add animation class
    tabElement.classList.add('tab-new');
    setTimeout(() => {
      tabElement.classList.remove('tab-new');
    }, 400);
    
    // Activate the new tab
    setActiveTab(id);
    
    // Show toast notification
    showToast(`Opened ${fileName}`);
    
    // Play a sound effect
    playSound('notification');
  }
});

ipcRenderer.on('save-file', (event, { filePath }) => {
  const activeTab = tabs.find(tab => tab.id === activeTabId);
  if (activeTab) {
    activeTab.path = filePath;
    activeTab.name = filePath.split(/[\\/]/).pop();
    activeTab.modified = false;
    
    // Show saving indicator
    showToast('Saving file...');
    
    ipcRenderer.send('save-content', { filePath, content: activeTab.content });
    const tabNameEl = document.querySelector('.tab.active .tab-name');
    if (tabNameEl) {
      tabNameEl.textContent = activeTab.name;
    }
    document.getElementById('file-path').textContent = filePath;
    
    // Show saved confirmation after a short delay
    setTimeout(() => {
      showToast('File saved successfully');
    }, 300);
  }
});

// Search functionality
ipcRenderer.on('show-find', () => {
  document.querySelector('.search-panel').classList.remove('hidden');
  document.querySelector('.replace-input-group').classList.add('hidden');
  document.getElementById('search-input').focus();
  
  // Add entrance animation for the search panel
  animateSearchPanel();
});

ipcRenderer.on('show-replace', () => {
  document.querySelector('.search-panel').classList.remove('hidden');
  document.querySelector('.replace-input-group').classList.remove('hidden');
  document.getElementById('search-input').focus();
  
  // Add entrance animation for the search panel
  animateSearchPanel();
});

function animateSearchPanel() {
  const panel = document.querySelector('.search-panel');
  panel.style.transform = 'translateY(-10px)';
  panel.style.opacity = '0';
  setTimeout(() => {
    panel.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease';
    panel.style.transform = 'translateY(0)';
    panel.style.opacity = '1';
  }, 10);
}

// Search functionality
let currentSearch = null;

document.getElementById('find-next').addEventListener('click', () => {
  search(true);
});

document.getElementById('find-prev').addEventListener('click', () => {
  search(false);
});

document.getElementById('close-search').addEventListener('click', () => {
  const panel = document.querySelector('.search-panel');
  // Add exit animation
  panel.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
  panel.style.transform = 'translateY(-10px)';
  panel.style.opacity = '0';
  
  setTimeout(() => {
    panel.classList.add('hidden');
    panel.style.transform = '';
    panel.style.opacity = '';
    editor.focus();
  }, 200);
});

document.getElementById('replace').addEventListener('click', () => {
  replace(false);
});

document.getElementById('replace-all').addEventListener('click', () => {
  replace(true);
});

function search(forward) {
  const query = document.getElementById('search-input').value;
  if (!query) return;
  
  const caseSensitive = document.getElementById('case-sensitive').checked;
  const wholeWord = document.getElementById('whole-word').checked;
  const regex = document.getElementById('regex-search').checked;
  
  let searchQuery;
  
  if (regex) {
    try {
      searchQuery = new RegExp(query, caseSensitive ? 'g' : 'gi');
    } catch (e) {
      showToast('Invalid regular expression');
      return;
    }
  } else if (wholeWord) {
    searchQuery = new RegExp(`\\b${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, caseSensitive ? 'g' : 'gi');
  } else {
    searchQuery = caseSensitive ? query : query.toLowerCase();
  }
  
  const cursor = editor.getSearchCursor(
    searchQuery,
    forward ? editor.getCursor('from') : editor.getCursor('to'),
    { caseFold: !caseSensitive }
  );
  
  if (forward ? cursor.findNext() : cursor.findPrevious()) {
    editor.setSelection(cursor.from(), cursor.to());
    editor.scrollIntoView({ from: cursor.from(), to: cursor.to() }, 100);
    highlightMatch(cursor.from(), cursor.to());
  } else {
    // Start from the beginning if not found
    const newCursor = editor.getSearchCursor(
      searchQuery,
      forward ? { line: 0, ch: 0 } : { line: editor.lastLine(), ch: editor.getLine(editor.lastLine()).length },
      { caseFold: !caseSensitive }
    );
    
    if (forward ? newCursor.findNext() : newCursor.findPrevious()) {
      editor.setSelection(newCursor.from(), newCursor.to());
      editor.scrollIntoView({ from: newCursor.from(), to: newCursor.to() }, 100);
      highlightMatch(newCursor.from(), newCursor.to());
    } else {
      showToast('No matches found');
    }
  }
}

// Function to highlight found matches with a pulse animation
function highlightMatch(from, to) {
  // Clear any existing highlight markers
  if (currentSearch) {
    currentSearch.clear();
  }
  
  // Create a new marker
  currentSearch = editor.markText(from, to, {
    className: 'search-highlight'
  });
  
  // Add animation class to make it pulse
  const highlights = document.querySelectorAll('.search-highlight');
  highlights.forEach(el => {
    el.classList.add('pulse-highlight');
    setTimeout(() => {
      el.classList.remove('pulse-highlight');
    }, 1000);
  });
}

function replace(all) {
  const query = document.getElementById('search-input').value;
  const replacement = document.getElementById('replace-input').value;
  
  if (!query) return;
  
  const caseSensitive = document.getElementById('case-sensitive').checked;
  const wholeWord = document.getElementById('whole-word').checked;
  const regex = document.getElementById('regex-search').checked;
  
  let searchQuery;
  
  if (regex) {
    try {
      searchQuery = new RegExp(query, caseSensitive ? 'g' : 'gi');
    } catch (e) {
      showToast('Invalid regular expression');
      return;
    }
  } else if (wholeWord) {
    searchQuery = new RegExp(`\\b${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, caseSensitive ? 'g' : 'gi');
  } else {
    searchQuery = caseSensitive ? query : query.toLowerCase();
  }
  
  if (all) {
    // Replace all occurrences
    const content = editor.getValue();
    let newContent;
    
    if (regex) {
      newContent = content.replace(searchQuery, replacement);
    } else if (wholeWord) {
      newContent = content.replace(searchQuery, replacement);
    } else {
      const re = new RegExp(query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), caseSensitive ? 'g' : 'gi');
      newContent = content.replace(re, replacement);
    }
    
    // Count replacements
    const count = (content.match(searchQuery) || []).length;
    
    editor.setValue(newContent);
    
    // Show toast with count
    showToast(`Replaced ${count} occurrence${count !== 1 ? 's' : ''}`);
    
    // Play a sound effect
    if (count > 0) {
      playSound('notification');
    }
  } else {
    // Replace current selection if it matches
    const selection = editor.getSelection();
    
    if (selection) {
      let matches = false;
      
      if (regex) {
        matches = searchQuery.test(selection);
      } else if (wholeWord) {
        matches = searchQuery.test(selection);
      } else {
        matches = caseSensitive ? selection === query : selection.toLowerCase() === query.toLowerCase();
      }
      
      if (matches) {
        editor.replaceSelection(replacement);
        search(true); // Find next match
        showToast('Replaced 1 occurrence');
      } else {
        search(true); // Find the next match first
      }
    } else {
      search(true); // Find the next match first
    }
  }
}

// Enhanced toast notification
function showToast(message) {
  // Check if a toast already exists and remove it
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  
  // Create an icon based on the message content
  let icon = '💬';
  if (message.includes('saved')) {
    icon = '💾';
  } else if (message.includes('Saving')) {
    icon = '⏳';
  } else if (message.includes('Opened')) {
    icon = '📂';
  } else if (message.includes('No matches')) {
    icon = '🔍';
  } else if (message.includes('Replaced')) {
    icon = '✏️';
  } else if (message.includes('Settings')) {
    icon = '⚙️';
  } else if (message.includes('Switched')) {
    icon = '🔄';
  }
  
  toast.innerHTML = `<span class="toast-icon">${icon}</span> ${message}`;
  
  document.body.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Play a notification sound
  if (!message.includes('Saving')) { // Don't play sound for "Saving..." message
    playSound('notification');
  }
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// Settings modal
document.getElementById('save-settings').addEventListener('click', () => {
  settings.darkMode = true; // Always dark mode
  settings.fontSize = parseInt(document.getElementById('font-size').value, 10);
  settings.fontFamily = document.getElementById('font-family').value;
  settings.tabSize = parseInt(document.getElementById('tab-size').value, 10);
  settings.lineNumbers = document.getElementById('line-numbers').checked;
  settings.wordWrap = document.getElementById('word-wrap').checked;
  settings.autoSave = document.getElementById('auto-save').checked;
  
  applySettings(settings);
  ipcRenderer.send('save-settings', settings);
  
  // Fade out the settings modal
  const modal = document.getElementById('settings-modal');
  const modalContent = modal.querySelector('.modal-content');
  
  modalContent.style.transform = 'scale(1.02)';
  modalContent.style.opacity = '0';
  
  setTimeout(() => {
    modal.style.display = 'none';
    modalContent.style.transform = '';
    modalContent.style.opacity = '';
    showToast('Settings saved');
  }, 300);
});

document.getElementById('cancel-settings').addEventListener('click', () => {
  // Fade out the settings modal
  const modal = document.getElementById('settings-modal');
  const modalContent = modal.querySelector('.modal-content');
  
  modalContent.style.transform = 'scale(0.98)';
  modalContent.style.opacity = '0';
  
  setTimeout(() => {
    modal.style.display = 'none';
    modalContent.style.transform = '';
    modalContent.style.opacity = '';
    // Reset form to current settings
    applySettings(settings);
  }, 300);
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
  const modal = document.getElementById('settings-modal');
  if (event.target === modal) {
    // Fade out the settings modal
    const modalContent = modal.querySelector('.modal-content');
    
    modalContent.style.transform = 'scale(0.98)';
    modalContent.style.opacity = '0';
    
    setTimeout(() => {
      modal.style.display = 'none';
      modalContent.style.transform = '';
      modalContent.style.opacity = '';
    }, 300);
  }
});

// Initialize tabs
updateEditorContent();

// Initialize search panel
document.getElementById('search-input').addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    search(true);
  } else if (event.key === 'Escape') {
    const panel = document.querySelector('.search-panel');
    // Add exit animation
    panel.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
    panel.style.transform = 'translateY(-10px)';
    panel.style.opacity = '0';
    
    setTimeout(() => {
      panel.classList.add('hidden');
      panel.style.transform = '';
      panel.style.opacity = '';
      editor.focus();
    }, 200);
  }
});

document.getElementById('replace-input').addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    replace(false);
  } else if (event.key === 'Escape') {
    const panel = document.querySelector('.search-panel');
    // Add exit animation
    panel.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
    panel.style.transform = 'translateY(-10px)';
    panel.style.opacity = '0';
    
    setTimeout(() => {
      panel.classList.add('hidden');
      panel.style.transform = '';
      panel.style.opacity = '';
      editor.focus();
    }, 200);
  }
});

// Enhanced list handling with auto-continuation and smart formatting

// Handle keyboard shortcuts
document.addEventListener('keydown', event => {
  // Ctrl+, to open settings
  if (event.ctrlKey && event.key === ',') {
    showSettings();
    event.preventDefault();
  }
  
  // Ctrl+Shift+B for bullet list
  if (event.ctrlKey && event.shiftKey && event.key === 'B') {
    applyBulletList();
    event.preventDefault();
  }
  
  // Ctrl+Shift+C for checklist
  if (event.ctrlKey && event.shiftKey && event.key === 'C') {
    applyChecklist();
    event.preventDefault();
  }
  
  // Ctrl+Shift+N for numbered list
  if (event.ctrlKey && event.shiftKey && event.key === 'N') {
    applyNumberedList();
    event.preventDefault();
  }
});

// Format functions
function applyChecklist() {
  const cursor = editor.getCursor();
  const lineContent = editor.getLine(cursor.line);
  const indent = getIndentation(lineContent);
  
  if (lineContent.trim().startsWith('☐ ')) {
    // If already a checklist, remove it
    removeListMarker(cursor.line);
  } else if (lineContent.trim().startsWith('☑ ')) {
    // If checked, make it unchecked
    editor.replaceRange(indent + '☐ ', 
      { line: cursor.line, ch: 0 }, 
      { line: cursor.line, ch: indent.length + 2 });
  } else if (lineContent.trim().startsWith('• ') || lineContent.trim().match(/^\d+\.\s/)) {
    // If it's a bullet or numbered list, replace with checkbox
    removeListMarker(cursor.line);
    editor.replaceRange(indent + '☐ ', 
      { line: cursor.line, ch: 0 }, 
      { line: cursor.line, ch: 0 });
  } else {
    // Add a new checkbox
    editor.replaceRange(indent + '☐ ' + lineContent.trim(), 
      { line: cursor.line, ch: 0 }, 
      { line: cursor.line, ch: lineContent.length });
  }
  
  // Add active class to button for visual feedback
  const button = document.getElementById('btn-checklist');
  button.classList.add('active');
  
  // Add pulse animation
  button.animate([
    { transform: 'scale(1)' },
    { transform: 'scale(1.2)' },
    { transform: 'scale(1)' }
  ], {
    duration: 300,
    easing: 'ease-in-out'
  });
  
  setTimeout(() => {
    button.classList.remove('active');
  }, 300);
}

function applyBulletList() {
  const cursor = editor.getCursor();
  const lineContent = editor.getLine(cursor.line);
  const indent = getIndentation(lineContent);
  
  if (lineContent.trim().startsWith('• ')) {
    // If already a bullet list, remove it
    removeListMarker(cursor.line);
  } else if (lineContent.trim().startsWith('☐ ') || lineContent.trim().startsWith('☑ ') || lineContent.trim().match(/^\d+\.\s/)) {
    // If it's a checkbox or numbered list, replace with bullet
    removeListMarker(cursor.line);
    editor.replaceRange(indent + '• ', 
      { line: cursor.line, ch: 0 }, 
      { line: cursor.line, ch: 0 });
  } else {
    // Add a new bullet
    editor.replaceRange(indent + '• ' + lineContent.trim(), 
      { line: cursor.line, ch: 0 }, 
      { line: cursor.line, ch: lineContent.length });
  }
  
  // Add active class to button for visual feedback
  const button = document.getElementById('btn-bullet-list');
  button.classList.add('active');
  
  // Add pulse animation
  button.animate([
    { transform: 'scale(1)' },
    { transform: 'scale(1.2)' },
    { transform: 'scale(1)' }
  ], {
    duration: 300,
    easing: 'ease-in-out'
  });
  
  setTimeout(() => {
    button.classList.remove('active');
  }, 300);
}

function applyNumberedList() {
  const cursor = editor.getCursor();
  const lineContent = editor.getLine(cursor.line);
  const indent = getIndentation(lineContent);
  
  // Find the previous line with a number to determine the next number
  let number = 1;
  if (cursor.line > 0) {
    for (let i = cursor.line - 1; i >= 0; i--) {
      const prevLine = editor.getLine(i);
      const match = prevLine.trim().match(/^(\d+)\.\s/);
      if (match) {
        number = parseInt(match[1]) + 1;
        break;
      }
      
      // If there's a blank line or non-numbered line, stop the sequence
      if (!prevLine.trim().match(/^\d+\.\s/) && prevLine.trim() !== '') {
        break;
      }
    }
  }
  
  if (lineContent.trim().match(/^\d+\.\s/)) {
    // If already a numbered list, remove it
    removeListMarker(cursor.line);
  } else if (lineContent.trim().startsWith('☐ ') || lineContent.trim().startsWith('☑ ') || lineContent.trim().startsWith('• ')) {
    // If it's a checkbox or bullet list, replace with number
    removeListMarker(cursor.line);
    // Apply number with consistent spacing - exactly one space after the period
    editor.replaceRange(indent + `${number}. `, 
      { line: cursor.line, ch: 0 }, 
      { line: cursor.line, ch: 0 });
  } else {
    // Add a new numbered item with consistent spacing
    editor.replaceRange(indent + `${number}. ` + lineContent.trim(), 
      { line: cursor.line, ch: 0 }, 
      { line: cursor.line, ch: lineContent.length });
  }
  
  // Add active class to button for visual feedback
  const button = document.getElementById('btn-numbered-list');
  button.classList.add('active');
  
  // Add pulse animation
  button.animate([
    { transform: 'scale(1)' },
    { transform: 'scale(1.2)' },
    { transform: 'scale(1)' }
  ], {
    duration: 300,
    easing: 'ease-in-out'
  });
  
  setTimeout(() => {
    button.classList.remove('active');
  }, 300);
}

// Helper functions for list handling
function getIndentation(line) {
  const match = line.match(/^(\s*)/);
  return match ? match[1] : '';
}

function getListMarkerLength(line) {
  const trimmedLine = line.trim();
  if (trimmedLine.startsWith('☐ ') || trimmedLine.startsWith('☑ ') || trimmedLine.startsWith('• ')) {
    return 2;
  } else if (trimmedLine.match(/^\d+\.\s/)) {
    return trimmedLine.indexOf(' ') + 1;
  }
  return 0;
}

function removeListMarker(lineNumber) {
  const line = editor.getLine(lineNumber);
  const indent = getIndentation(line);
  const trimmedLine = line.trim();
  const marker = getListMarkerLength(line);
  
  if (marker > 0) {
    editor.replaceRange('', 
      { line: lineNumber, ch: 0 }, 
      { line: lineNumber, ch: indent.length + marker });
  }
}

function toggleCheckbox() {
  const cursor = editor.getCursor();
  const line = editor.getLine(cursor.line);
  const indent = getIndentation(line);
  const trimmedLine = line.trim();
  
  if (trimmedLine.startsWith('☐ ')) {
    editor.replaceRange(indent + '☑ ', 
      { line: cursor.line, ch: 0 }, 
      { line: cursor.line, ch: indent.length + 2 });
    
    // Show animation for completing a task
    showToast('Task completed! ✅');
  } else if (trimmedLine.startsWith('☑ ')) {
    editor.replaceRange(indent + '☐ ', 
      { line: cursor.line, ch: 0 }, 
      { line: cursor.line, ch: indent.length + 2 });
  }
}

// Formatting toolbar button event listeners
document.getElementById('btn-checklist').addEventListener('click', applyChecklist);
document.getElementById('btn-bullet-list').addEventListener('click', applyBulletList);
document.getElementById('btn-numbered-list').addEventListener('click', applyNumberedList);

// Format menu IPC events
ipcRenderer.on('apply-bullet-list', () => {
  applyBulletList();
});

ipcRenderer.on('apply-numbered-list', () => {
  applyNumberedList();
});

ipcRenderer.on('apply-checklist', () => {
  applyChecklist();
});

// Handle checkbox click
editor.on('mousedown', (cm, event) => {
  const pos = editor.coordsChar({ left: event.clientX, top: event.clientY });
  const line = editor.getLine(pos.line);
  const indent = getIndentation(line);
  const trimmedLine = line.trim();
  
  if (trimmedLine.startsWith('☐ ') || trimmedLine.startsWith('☑ ')) {
    if (pos.ch >= indent.length && pos.ch < indent.length + 2) {
      // Click on the checkbox itself
      toggleCheckbox();
      event.preventDefault();
    }
  }
});

// Enhance list behavior with auto-continuation
editor.on('keydown', (cm, event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    const indent = getIndentation(line);
    const trimmedLine = line.trim();
    
    // Auto-continue numbered lists
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s(.*)/);
    if (numberedMatch) {
      const number = parseInt(numberedMatch[1]);
      const content = numberedMatch[2];
      
      // If line is empty except for the number, remove the list marking
      if (content.trim() === '') {
        editor.replaceRange('', 
          { line: cursor.line, ch: 0 }, 
          { line: cursor.line, ch: line.length });
      } else {
        // Otherwise continue with next number, ensuring consistent spacing
        event.preventDefault();
        // Create the next numbered item with exactly one space after the period
        const nextItem = '\n' + indent + (number + 1) + '. ';
        editor.replaceRange(nextItem, 
          { line: cursor.line, ch: line.length });
      }
      return;
    }
    
    // Auto-continue checkboxes
    if (trimmedLine.startsWith('☐ ') || trimmedLine.startsWith('☑ ')) {
      const content = trimmedLine.substring(2);
      
      // If line is empty except for the checkbox, remove the checkbox
      if (content.trim() === '') {
        editor.replaceRange('', 
          { line: cursor.line, ch: 0 }, 
          { line: cursor.line, ch: line.length });
      } else {
        // Otherwise continue with new checkbox
        event.preventDefault();
        editor.replaceRange('\n' + indent + '☐ ', 
          { line: cursor.line, ch: line.length });
      }
      return;
    }
    
    // Auto-continue bullet lists
    if (trimmedLine.startsWith('• ')) {
      const content = trimmedLine.substring(2);
      
      // If line is empty except for the bullet, remove the bullet
      if (content.trim() === '') {
        editor.replaceRange('', 
          { line: cursor.line, ch: 0 }, 
          { line: cursor.line, ch: line.length });
      } else {
        // Otherwise continue with new bullet
        event.preventDefault();
        editor.replaceRange('\n' + indent + '• ', 
          { line: cursor.line, ch: line.length });
      }
      return;
    }
  } else if (event.key === 'Tab') {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    const indent = getIndentation(line);
    const trimmedLine = line.trim();
    
    // Increase indentation for list items
    if (trimmedLine.match(/^(\d+\.\s|[•☐☑]\s)/)) {
      event.preventDefault();
      editor.replaceRange('  ' + line, 
        { line: cursor.line, ch: 0 }, 
        { line: cursor.line, ch: line.length });
      return;
    }
  } else if (event.key === 'Tab' && event.shiftKey) {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    const indent = getIndentation(line);
    
    // Decrease indentation for list items
    if (indent.length >= 2 && line.trim().match(/^(\d+\.\s|[•☐☑]\s)/)) {
      event.preventDefault();
      editor.replaceRange(line.substring(2), 
        { line: cursor.line, ch: 0 }, 
        { line: cursor.line, ch: line.length });
      return;
    }
  }
});

// Smart list detection for auto-formatting when typing
editor.on('inputRead', (cm, change) => {
  if (change.text.length === 1 && change.text[0] === ' ') {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    const beforeCursor = line.substring(0, cursor.ch);
    const indent = getIndentation(line);
    
    // Handle numbered list auto-formatting
    const numberedMatch = beforeCursor.trim().match(/^\d+\.$/);
    if (numberedMatch) {
      // Ensure consistent spacing - exactly one space after the period
      // First remove the automatically added space
      editor.replaceRange('', 
        { line: cursor.line, ch: cursor.ch - 1 }, 
        { line: cursor.line, ch: cursor.ch });
      
      // Then add a single space
      editor.replaceRange(' ', 
        { line: cursor.line, ch: cursor.ch - 1 });
    }
    
    // Handle checkbox auto-formatting
    if (beforeCursor.trim() === '[]' || beforeCursor.trim() === '[ ]') {
      const cursorPos = cursor.ch;
      editor.replaceRange('☐ ', 
        { line: cursor.line, ch: cursorPos - beforeCursor.trim().length - indent.length }, 
        { line: cursor.line, ch: cursorPos });
    }
    
    // Handle bullet auto-formatting
    if (beforeCursor.trim() === '-' || beforeCursor.trim() === '*') {
      const cursorPos = cursor.ch;
      editor.replaceRange('• ', 
        { line: cursor.line, ch: cursorPos - 1 - indent.length }, 
        { line: cursor.line, ch: cursorPos });
    }
  }
});

// Window controls
const minimizeBtn = document.getElementById('minimize-btn');
const maximizeBtn = document.getElementById('maximize-btn');
const closeBtn = document.getElementById('close-btn');

minimizeBtn.addEventListener('click', () => {
  ipcRenderer.send('window-minimize');
});

maximizeBtn.addEventListener('click', () => {
  ipcRenderer.send('window-maximize');
});

closeBtn.addEventListener('click', () => {
  ipcRenderer.send('window-close');
});

// Listen for maximize/unmaximize events
ipcRenderer.on('window-maximized', () => {
  maximizeBtn.parentElement.classList.add('window-maximized');
});

ipcRenderer.on('window-unmaximized', () => {
  maximizeBtn.parentElement.classList.remove('window-maximized');
});

// Add CSS for additional animations and effects
const additionalCSS = document.createElement('style');
additionalCSS.textContent = `
  /* Toast notification enhancement */
  .toast {
    display: flex;
    align-items: center;
    gap: 8px;
    border-left: 3px solid var(--primary);
  }
  
  .toast-icon {
    font-size: 18px;
  }
  
  /* Counter animation */
  .counter-update {
    opacity: 0.3;
    transition: opacity 0.15s ease;
  }
  
  /* Tab switch animation */
  .tab-switch {
    animation: fadeInContent 0.3s ease;
  }
  
  @keyframes fadeInContent {
    from { opacity: 0.7; }
    to { opacity: 1; }
  }
  
  /* Cursor position update animation */
  .position-update {
    opacity: 0.3;
    transition: opacity 0.1s ease;
  }
  
  /* Search highlight animation */
  .search-highlight {
    background-color: rgba(139, 103, 255, 0.3);
    border-radius: 2px;
  }
  
  .pulse-highlight {
    animation: pulseBg 1s ease;
  }
  
  @keyframes pulseBg {
    0% { background-color: rgba(139, 103, 255, 0.3); }
    50% { background-color: rgba(139, 103, 255, 0.6); }
    100% { background-color: rgba(139, 103, 255, 0.3); }
  }
`;
document.head.appendChild(additionalCSS);

// Initialize with a subtle welcome animation
document.addEventListener('DOMContentLoaded', () => {
  // Fade in each major component
  const components = [
    '.title-bar',
    '.tabs',
    '.formatting-toolbar',
    '.toolbar',
    '.editor-container',
    '.status-bar'
  ];
  
  components.forEach((selector, index) => {
    const element = document.querySelector(selector);
    if (element) {
      element.style.opacity = '0';
      element.style.transform = 'translateY(10px)';
      
      setTimeout(() => {
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      }, 100 + index * 100);
    }
  });
  
  // Show welcome toast after everything has loaded
  setTimeout(() => {
    showToast('Welcome to Jonas Notepad');
  }, 800);
});