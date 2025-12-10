// script.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('documentForm');
    const generateButton = document.getElementById('generateButton');
    const statusMessage = document.getElementById('statusMessage');

    // Call the Cloud endpoint
    const API_ENDPOINT = 'https://us-central1-boxwood-coil-480604-g3.cloudfunctions.net/generate-document';

    function updateStatus(message, isGenerating, className = '') {
        statusMessage.textContent = message;
        statusMessage.className = className;
        statusMessage.classList.toggle('hidden', !message);
        generateButton.disabled = isGenerating;
        generateButton.textContent = isGenerating ? 'Generating...' : 'Generate Document (.docx)';
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Stop the default form submission

        // Gather all form data
        const formData = new FormData(form);
        const data = {};
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }

        updateStatus('Requesting document generation from the server...', true);

        try {
            // Call the Cloud Function API
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                // Check if the server returned a non-200 status
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            // Process the binary data (Blob)
            // The Cloud Function sends the DOCX file as a raw data stream.
            const blob = await response.blob(); 
            
            // Trigger the download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Try to get filename from headers, otherwise use default
            const disposition = response.headers.get('Content-Disposition');
            let filename = 'generated_paper.docx';
            if (disposition && disposition.indexOf('attachment') !== -1) {
                // Simple attempt to parse filename from disposition header
                const filenameMatch = disposition.match(/filename="(.+?)"/);
                if (filenameMatch && filenameMatch.length > 1) {
                    filename = filenameMatch[1];
                }
            }

            a.download = filename; 
            document.body.appendChild(a);
            a.click();
            a.remove();
            
            // Clean up and inform the user
            URL.revokeObjectURL(url);
            updateStatus('✅ Success! Your document has been downloaded.', false, 'success');

        } catch (error) {
            console.error('Document generation failed:', error);
            updateStatus(`❌ Error generating document. Please check the console for details. (Error: ${error.message.substring(0, 60)}...)`, false, 'error');
        }
    });
});
