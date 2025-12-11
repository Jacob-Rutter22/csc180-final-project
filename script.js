// Made by Jacob Rutter
// CSC180 Final Project
// This script handles the client-side interaction: collecting user input,
// sending it to the Google Cloud Function (GCF) API, and processing the 
// binary DOCX file response to trigger an automatic download.

document.addEventListener('DOMContentLoaded', () => {
    // Select necessary DOM elements once the entire HTML document is loaded
    const form = document.getElementById('documentForm');
    const generateButton = document.getElementById('generateButton');
    const statusMessage = document.getElementById('statusMessage');

    // Define the URL for the deployed Google Cloud Function (GCF)
    const API_ENDPOINT = 'https://us-central1-boxwood-coil-480604-g3.cloudfunctions.net/generate-document';

    // Update the status
    function updateStatus(message, isGenerating, className = '') {
        statusMessage.textContent = message;
        statusMessage.className = className;
        // Show/hide the status message based on whether there is content
        statusMessage.classList.toggle('hidden', !message); 
        
        // Disable the button during processing to prevent duplicate submissions
        generateButton.disabled = isGenerating; 
        
        // Update button text to provide feedback to the user
        generateButton.textContent = isGenerating ? 'Generating...' : 'Generate Document (.docx)';
    }

    // Add an event listener to the form submission
    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Stop the default form submission (which would cause a page reload)

        // Gather all form data from the input fields
        const formData = new FormData(form);
        const data = {};
        // Convert the FormData object into a simple key-value object for JSON serialization
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }

        // Inform the user that processing has started
        updateStatus('Requesting document generation from the server...', true);

        try {
            // Send Request to Cloud Function
            const response = await fetch(API_ENDPOINT, {
                method: 'POST', // Use POST method as required by the Cloud Function
                headers: {
                    // Tells the GCF to expect a JSON payload
                    'Content-Type': 'application/json' 
                },
                // Convert the JavaScript object into a JSON string for the request body
                body: JSON.stringify(data) 
            });

            if (!response.ok) {
                // Check if the server returned a non-200 status
                const errorText = await response.text();
                // Throw an error to jump to the catch block for centralized error handling
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            // The Cloud Function sends the DOCX file as a raw binary data stream.
            // .blob() reads the data stream and converts it into a browser Blob object.
            const blob = await response.blob(); 
            
            // Trigger Download
            // Create a temporary local URL for the Blob object
            const url = URL.createObjectURL(blob); 
            const a = document.createElement('a');
            a.href = url;
            
            // Try to determine the filename from the server's Content-Disposition header
            const disposition = response.headers.get('Content-Disposition');
            let filename = 'generated_paper.docx'; // Default filename
            if (disposition && disposition.indexOf('attachment') !== -1) {
                // Use a regular expression to parse the filename attribute from the header
                const filenameMatch = disposition.match(/filename="(.+?)"/);
                if (filenameMatch && filenameMatch.length > 1) {
                    filename = filenameMatch[1];
                }
            }

            // Set the filename for the download
            a.download = filename; 
            
            // Programmatically trigger the file download
            document.body.appendChild(a);
            // Simulates a user clicking the download link
            a.click();
            // Clean up the temporary link element
            a.remove();
            
            // Release the memory used by the temporary Blob URL
            URL.revokeObjectURL(url); 
            
            // Clean up and inform the user of success
            updateStatus('✅ Success! Your document has been downloaded.', false, 'success');
        // Handle errors
        } catch (error) {
            console.error('Document generation failed:', error);
            // Display a user-friendly error message, truncating the error text if necessary
            updateStatus(`❌ Error generating document. Please check the console for details. (Error: ${error.message.substring(0, 60)}...)`, false, 'error');
        }
    });
});
