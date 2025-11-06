// Payment form handling for direct API payments
document.getElementById('paymentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = document.getElementById('submitBtn');
    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    
    // Hide previous results
    result.style.display = 'none';
    
    // Show loading
    form.style.display = 'none';
    loading.style.display = 'block';
    submitBtn.disabled = true;
    
    // Get form data
    const saveCard = document.getElementById('saveCard').checked;
    const formData = {
        amount: document.getElementById('amount').value,
        currency: document.getElementById('currency').value,
        cardNumber: document.getElementById('cardNumber').value,
        cardHolderName: document.getElementById('cardHolderName').value,
        expiryMonth: document.getElementById('expiryMonth').value,
        expiryYear: document.getElementById('expiryYear').value,
        cvv: document.getElementById('cvv').value
    };
    
    try {
        const response = await fetch('/process-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        // If payment successful and user wants to save card, store it
        if (data.success && saveCard) {
            await saveCardAfterPayment(formData, data);
        }
        
        // Hide loading
        loading.style.display = 'none';
        
        // Show result
        result.style.display = 'block';
        result.className = 'result ' + (data.success ? 'success' : 'error');
        
        document.getElementById('resultTitle').textContent = 
            data.success ? '✓ Payment Successful!' : '✗ Payment Failed';
        
        let detailsHtml = `
            <div><strong>Result Code:</strong> ${data.resultCode}</div>
            <div><strong>Message:</strong> ${data.message}</div>
            <div><strong>Order ID:</strong> ${data.orderId}</div>
        `;
        
        if (data.authCode) {
            detailsHtml += `<div><strong>Auth Code:</strong> ${data.authCode}</div>`;
        }
        
        if (data.pasRef) {
            detailsHtml += `<div><strong>Payment Reference:</strong> ${data.pasRef}</div>`;
        }
        
        document.getElementById('resultDetails').innerHTML = detailsHtml;
        
        // Show form again for new transaction
        form.style.display = 'block';
        submitBtn.disabled = false;
        
    } catch (error) {
        console.error('Error:', error);
        loading.style.display = 'none';
        result.style.display = 'block';
        result.className = 'result error';
        
        document.getElementById('resultTitle').textContent = '✗ Error';
        document.getElementById('resultDetails').innerHTML = 
            `<div>${error.message}</div>`;
        
        // Show form again
        form.style.display = 'block';
        submitBtn.disabled = false;
    }
});

// Helper function to save card after successful payment
async function saveCardAfterPayment(formData, paymentResponse) {
    try {
        console.log('Saving card for future use...');
        
        const saveResponse = await fetch('/store-card', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                cardNumber: formData.cardNumber,
                cardHolderName: formData.cardHolderName,
                expiryMonth: formData.expiryMonth,
                expiryYear: '20' + formData.expiryYear,
                cvv: formData.cvv,
                customerEmail: ''
            })
        });
        
        const saveData = await saveResponse.json();
        
        if (saveData.success) {
            console.log('✅ Card saved:', saveData.token);
            // Optionally notify user
            setTimeout(() => {
                if (confirm('✅ Card saved successfully!\n\nWould you like to view your stored cards?')) {
                    window.location.href = '/stored-cards.html';
                }
            }, 1000);
        } else {
            console.error('Failed to save card:', saveData.message);
        }
    } catch (error) {
        console.error('Error saving card:', error);
    }
}
