let originalBackgroundColor;
let selectors = []; // Array to hold selectors of elements clicked by the user

// Function to send data to the Flask app
function sendDataToFlask(data) {
    console.log('Sending data to Flask:', data);
    fetch('http://localhost:5000/receive_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(data => console.log(data))
    .catch((error) => console.error('Error:', error));
}

// Function to get CSS selector for an element
function getCssSelector(element) {
    // Logic to obtain a unique CSS selector or XPath
    if (element.id) {
        return '#' + element.id; // If the element has an ID, use it
    } else if (element.className) {
        return '.' + element.className.split(' ').join('.'); // If it has a class, use it
    } else {
        // If no ID or class, fall back to constructing an XPath
        let path = '';
        for (; element && element.nodeType == 1; element = element.parentNode) {
            let idx = Array.from(element.parentNode.children).indexOf(element) + 1;
            idx = '[' + idx + ']';
            path = '/' + element.tagName.toLowerCase() + idx + path;
        }
        return path;
    }
}

// Activate scraper and attach event listeners when message is received from popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === "activateScraper") {
        enableSelectionMode();
    } else if (message.action === "deactivateScraper") {
        disableSelectionMode();
    }
});

function enableSelectionMode() {
    document.addEventListener('mouseover', highlightElement, false);
    document.addEventListener('mouseout', removeHighlight, false);
    document.addEventListener('click', selectElement, false);
}

function disableSelectionMode() {
    // Perform cleanup operations
    document.removeEventListener('mouseover', highlightElement);
    document.removeEventListener('mouseout', removeHighlight);
    document.removeEventListener('click', selectElement, false);
    // Send the collected selectors to your backend or log to console
    sendDataToFlask({template: selectors});
    // Clear the selectors array after sending
    selectors = [];
}


// Highlight an element with a fill color when mouse is over it
function highlightElement(e) {
    originalBackgroundColor = e.target.style.backgroundColor;
    e.target.style.backgroundColor = 'rgba(0, 255, 255, 0.5)'; // Semi-transparent cyan fill
    e.target.style.transition = 'background-color 0.3s'; // Smooth transition for color change
}

// Remove highlight from an element
function removeHighlight(e) {
    e.target.style.backgroundColor = originalBackgroundColor;
    e.target.style.transition = 'background-color 0.3s'; // Smooth transition for color change
}

// Update the selectElement function to show the popup
function selectElement(event) {
    event.preventDefault();
    let element = event.target;

    // Show the data extraction popup
    showDataExtractionPopup(element);
}

/*// Select an element and store its selector
function selectElement(event) {
    event.preventDefault();
    let element = event.target;
    let selector = getCssSelector(element);

    if (!selectors.includes(selector)) {
        selectors.push(selector);
        // Highlight the selected element
        element.style.outline = '2px solid red';
    }
    console.log('Current template selectors:', selectors);

    // Optionally, highlight the selected element
    element.style.backgroundColor = 'rgba(255, 0, 0, 0.5)'; // Semi-transparent red fill
    element.style.outline = '2px solid red';

    // Update the overlay UI with the new selection
    updateOverlayList();
}*/

// Send the template (array of selectors) to the Flask app
function sendTemplate() {
    console.log('Sending template to Flask:', selectors);
    fetch('http://localhost:5000/store_template', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ template: selectors }),
    })
    .then(response => response.json())
    .then(data => console.log(data))
    .catch((error) => console.error('Error:', error));
    selectors = []; // Clear the array after sending
}

// Listen for a message from the popup to send the template
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === "sendTemplate") {
        sendTemplate();
        disableSelectionMode(); // Turn off selection mode if desired
    }
});


// This implementation of getCssSelector is now included within the script
function getCssSelector(element) {
    if (element.id) {
        return '#' + element.id; // Use ID if available, as it is unique
    } else {
        // Otherwise, use the element's tag name and classes
        let selector = element.tagName.toLowerCase();
        if (element.className) {
            selector += '.' + element.className.trim().replace(/\s+/g, '.');
        }
        return selector;
    }
}

function injectOverlay() {
    removeOverlay(); // Ensure no existing overlay is present
    const overlay = document.createElement('div');
    overlay.id = 'scraper-overlay';
    overlay.innerHTML = `
        <div id="scraper-ui-container">
            <div id="scraper-header">
                <h2>Select elements</h2>
                <button id="scraper-close-btn">X</button>
            </div>
            <div id="scraper-content">
                <p>Click on the page to select elements.</p>
                <ul id="scraper-selections"></ul>
                <button id="scraper-save-btn">Save Template</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    setupOverlayListeners();
}

// Update the overlay UI with the new selection
function updateOverlayList() {
    const list = document.getElementById('scraper-selections');
    list.innerHTML = ''; // Clear existing list
    selectors.forEach(data => {
        const listItem = document.createElement('li');
        listItem.textContent = `${data.selector} - ${data.dataType}: ${data.value}`;
        list.appendChild(listItem);
    });
}

function setupOverlayListeners() {
    document.getElementById('scraper-close-btn').addEventListener('click', function() {
        document.getElementById('scraper-overlay').remove();
        disableSelectionMode(); // Turn off selection mode
    });

    document.getElementById('scraper-save-btn').addEventListener('click', function() {
        sendDataToFlask({template: selectors});
        alert('Template saved!');
        disableSelectionMode(); // Turn off selection mode
        document.getElementById('scraper-overlay').remove();
    });
}


// This function sets up listeners for the overlay UI
function setupOverlayListeners() {
    // Make sure you don't add multiple listeners to the same button
    const closeButton = document.getElementById('scraper-close-btn');
    closeButton.removeEventListener('click', removeOverlay);
    closeButton.addEventListener('click', removeOverlay);

    document.getElementById('scraper-close-btn').addEventListener('click', function() {
        document.getElementById('scraper-overlay').remove();
    });
}


// Add a listener for the 'activateScraper' action
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "activateScraper") {
        // Now it will only inject the overlay when "activateScraper" is clicked
        injectOverlay();
        enableSelectionMode();
        sendResponse({status: "selection mode activated"});
    } else if (request.action === "sendTemplate") {
        sendTemplate();
        disableSelectionMode();
    }
});

// Remove any existing overlay before injecting a new one
function removeOverlay() {
    const existingOverlay = document.getElementById('scraper-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    disableSelectionMode(); // Ensure selection mode is disabled when overlay is removed
}

// Function to create and show the data extraction popup
function showDataExtractionPopup(element) {
    // Remove any existing popup first
    removeDataExtractionPopup();

    const extractionPopup = document.createElement('div');
    extractionPopup.id = 'data-extraction-popup';
    extractionPopup.innerHTML = `
        <div class="extraction-options">
            <button class="extraction-option" data-type="text">Get Text</button>
            <button class="extraction-option" data-type="href">Get Link</button>
            <!-- Add more options as needed -->
        </div>
    `;
    document.body.appendChild(extractionPopup);

    // Position the popup
    const rect = element.getBoundingClientRect();
    extractionPopup.style.position = 'absolute';
    extractionPopup.style.top = `${window.scrollY + rect.bottom}px`;
    extractionPopup.style.left = `${rect.left}px`;
    extractionPopup.style.zIndex = '10000';

    // Handle option selection
    extractionPopup.querySelectorAll('.extraction-option').forEach(button => {
        button.addEventListener('click', (event) => {
            const dataType = event.target.getAttribute('data-type');
            extractData(dataType, element);
        });
    });

    // Close the popup when an option is selected
    const options = extractionPopup.querySelectorAll('.extraction-option');
    options.forEach(option => {
        option.addEventListener('click', () => {
            extractionPopup.remove();
        });
    });
}

// Function to remove the data extraction popup
function removeDataExtractionPopup() {
    const extractionPopup = document.getElementById('data-extraction-popup');
    if (extractionPopup) {
        extractionPopup.remove();
    }
}

// Function to handle data extraction based on the user's choice
function extractData(dataType, element) {
    const selector = getCssSelector(element);
    const data = {
        selector,
        dataType,
        value: dataType === 'href' ? element.href : element.textContent
    };

    // Store the extracted data
    selectors.push(data);
    console.log('Extracted data:', data);

    // Remove the popup
    removeDataExtractionPopup();

    // Update the overlay with the new selection
    updateOverlayList();
}

// This function will be called after the first element is selected to start pattern recognition
function promptUserForSecondSelection() {
    // Implementation to prompt user for the second selection
    alert('Please select the second element of the same type from the list.');
}

// Function to recognize pattern based on two selections
function recognizePattern(firstSelector, secondSelector) {
    // For simplicity, we'll assume both elements have the same parent and are of the same type
    // We will find the common parent and then look for other similar siblings
    const firstEl = document.querySelector(firstSelector);
    const secondEl = document.querySelector(secondSelector);
    
    if (firstEl && secondEl) {
        const parent = firstEl.parentNode;
        const children = Array.from(parent.children);
        suggestedSelectors = children.map(el => getCssSelector(el));
        highlightSuggestedElements(suggestedSelectors);
    } else {
        alert('Elements not found. Please try again.');
    }
}

// Function to highlight all elements matching the suggested selectors
function highlightSuggestedElements(selectors) {
    // Highlight all elements matching the selectors
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.classList.add('suggested-element'); // Add a class for styling
        });
    });
}