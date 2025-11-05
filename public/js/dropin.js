// HPP Drop-In UI initialization and payment processing

// Initialize Drop-In UI information
async function initializeDropIn() {
    document.getElementById('dropin-container').innerHTML = `
        <div style="padding: 20px; background: #e8f4f8; border-radius: 6px; text-align: center;">
            <h3 style="color: #667eea; margin-bottom: 10px;">✓ HPP Redirect Mode</h3>
            <p style="color: #666; font-size: 14px; margin-bottom: 15px;">
                When you click "Process Payment", you'll be redirected to Global Payments' secure hosted payment page.
            </p>
            <div style="text-align: left; color: #555; font-size: 13px; line-height: 1.8; max-width: 500px; margin: 0 auto; background: white; padding: 15px; border-radius: 6px;">
                <strong>How it works:</strong>
                <ol style="margin: 10px 0 0 20px;">
                    <li>Click "Process Payment" below</li>
                    <li>You'll be redirected to Global Payments hosted page</li>
                    <li>Enter card details on their secure form</li>
                    <li>Payment is processed</li>
                    <li>You'll be redirected back with results</li>
                </ol>
            </div>
            <p style="margin-top: 15px; font-size: 12px; color: #999;">
                Card data never touches your server - PCI compliant!
            </p>
        </div>
    `;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeDropIn);

// Handle payment form submission
document.getElementById('paymentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const amount = document.getElementById('amount').value;
    const currency = document.getElementById('currency').value;
    const cardHolderName = document.getElementById('cardHolderName').value;
    
    // Show loading
    document.getElementById('loading').style.display = 'block';
    document.getElementById('result').style.display = 'none';
    
    try {
        // Step 1: Generate HPP token from backend
        const response = await fetch('/generate-hpp-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: amount,
                currency: currency,
                cardHolderName: cardHolderName
            })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to generate HPP token');
        }
        
        console.log('HPP Token generated:', data);
        console.log('HPP URL:', data.hppUrl);
        console.log('HPP Data:', data.hppData);
        console.log('RealexHpp available?', typeof RealexHpp !== 'undefined');
        
        // Hide loading
        document.getElementById('loading').style.display = 'none';
        
        // For now, use redirect method (more reliable than lightbox)
        // Create a form and submit it to HPP
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.hppUrl;
        
        // Add all HPP parameters as hidden fields
        for (const [key, value] of Object.entries(data.hppData)) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
        }
        
        document.body.appendChild(form);
        console.log('Submitting HPP form...');
        form.submit();
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('result').style.display = 'block';
        document.getElementById('result').className = 'result error';
        document.getElementById('resultTitle').textContent = '✗ Error';
        document.getElementById('resultDetails').innerHTML = 
            `<div>${error.message}</div>`;
    }
});
