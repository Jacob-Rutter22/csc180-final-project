document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const form = document.getElementById('documentForm');
    const generateButton = document.getElementById('generateButton');
    const statusMessage = document.getElementById('statusMessage');

    // API Endpoint for the Google Cloud Function and Adobe API
    const API_ENDPOINT = 'https://us-central1-boxwood-coil-480604-g3.cloudfunctions.net/generate-document'; 

    // Update the message status
    function updateStatus(message, isGenerating, className = '') {
        statusMessage.textContent = message;
        statusMessage.className = className;
        // Toggles the hidden class based on whether a message exists
        statusMessage.classList.toggle('hidden', !message);
        // Disable button while processing to prevent duplicate submissions
        generateButton.disabled = isGenerating; 
        generateButton.textContent = isGenerating ? 'Generating...' : 'Generate Document (.docx)';
    }

    // Attach event listener to the form submission
    form.addEventListener('submit', async (event) => {
        // Stop the default browser form submission (page reload)
        event.preventDefault();

        // Gather all form data into a simple JavaScript object
        const formData = new FormData(form);
        const data = {};
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        // Update status w/ doc gen
        updateStatus('Requesting document generation from the server...', true);

        try {
            // Call the Cloud Function API using the Fetch API
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                // Specify that the request body is JSON
                headers: {
                    'Content-Type': 'application/json'
                },
                // Convert the form data object into a JSON string for the server
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                // If the status code is 4xx or 5xx then read the server's response body
                const errorText = await response.text();
                // Throw an error to jump to the catch block
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            // Process the binary data (Blob)
            // The Cloud Function is returning the DOCX file's binary content.
            // .blob() reads the entire response body and wraps it in a Blob object.
            const blob = await response.blob(); 
            
            // Trigger the download using a virtual anchor element
            // Create a temporary, unique URL to represent the binary Blob data in the browser's memory
            const url = URL.createObjectURL(blob);
            // Create a temporary link element
            const a = document.createElement('a');
            a.href = url;
            
            // Try to extract the suggested filename from the server's Content-Disposition header
            const disposition = response.headers.get('Content-Disposition');
            // Default filename
            let filename = 'generated_paper.docx';
            
            if (disposition && disposition.indexOf('attachment') !== -1) {
                // Regex search to pull the filename="[...]" part out of the header
                const filenameMatch = disposition.match(/filename="(.+?)"/);
                if (filenameMatch && filenameMatch.length > 1) {
                    filename = filenameMatch[1];
                }
            }
            // Set the download attribute with the determined filename
            a.download = filename;
            // Temporarily add the element to the DOM
            document.body.appendChild(a);
            // Programmatically click the link to trigger the browser's download dialog
            a.click();
            // Remove the temporary link element to clean up the DOM
            a.remove();
            
            // Release the temporary Blob URL from the browser's memory
            URL.revokeObjectURL(url);
            // Indicate successful document download w/ message
            updateStatus('Success! Your document has been downloaded.', false, 'success');

        } catch (error) {
            // Handle any network errors (e.g., CORS failure, API down) or thrown server errors
            console.error('Document generation failed:', error);
            // Display a user-friendly error message
            updateStatus(`Error generating document. Please check the console for details. (Error: ${error.message.substring(0, 60)}...)`, false, 'error');
        }
    });
});
