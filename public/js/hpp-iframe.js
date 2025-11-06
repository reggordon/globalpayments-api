// HPP iFrame Implementation (without RealexHpp SDK)

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('paymentForm');
    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    const submitBtn = document.getElementById('submitBtn');
    const iframeContainer = document.getElementById('hpp-iframe-container');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const amount = document.getElementById('amount').value;
        const currency = document.getElementById('currency').value;
        const customerEmail = document.getElementById('customerEmail').value;

        // Show loading
        loading.style.display = 'block';
        result.style.display = 'none';
        submitBtn.disabled = true;

        try {
            // Generate HPP token from server
            const response = await fetch('/generate-hpp-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: amount,
                    currency: currency,
                    customerEmail: customerEmail || ''
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to generate HPP token');
            }

            // Hide loading
            loading.style.display = 'none';

            // Load HPP in iframe
            loadHppIframe(data.hppUrl, data.hppData);

        } catch (error) {
            loading.style.display = 'none';
            submitBtn.disabled = false;
            showError('Failed to initialize payment: ' + error.message);
        }
    });

    function loadHppIframe(hppUrl, hppParams) {
        // Show iframe container
        document.body.classList.add('iframe-active');
        iframeContainer.style.display = 'block';

        const iframe = document.getElementById('hpp-iframe');
        
        // Create form to POST to HPP in iframe
        const hppForm = document.createElement('form');
        hppForm.method = 'POST';
        hppForm.action = hppUrl;
        hppForm.target = 'hpp-iframe';
        hppForm.style.display = 'none';

        // Add all HPP parameters
        for (const [key, value] of Object.entries(hppParams)) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            hppForm.appendChild(input);
        }

        document.body.appendChild(hppForm);

        // Submit form to load HPP in iframe
        hppForm.submit();
        
        // Remove form after submission
        setTimeout(() => {
            if (hppForm.parentNode) {
                document.body.removeChild(hppForm);
            }
        }, 100);

        // Listen for messages from iframe (when result page loads)
        window.addEventListener('message', function(event) {
            console.log('Received message:', event.data);
            
            // Handle message from hpp-result.html
            if (event.data && event.data.type === 'hpp-response') {
                // Convert to expected format
                const response = {
                    RESULT: event.data.result,
                    MESSAGE: event.data.message,
                    ORDER_ID: event.data.orderId,
                    AUTHCODE: event.data.authCode,
                    PASREF: event.data.pasRef,
                    AMOUNT: event.data.amount ? Math.round(parseFloat(event.data.amount) * 100) : 0,
                    CURRENCY: event.data.currency
                };
                
                handleHppResponse(response);
            }
        });

        // Scroll to iframe
        iframeContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function handleHppResponse(response) {
        const resultTitle = document.getElementById('resultTitle');
        const resultDetails = document.getElementById('resultDetails');
        
        // Hide iframe
        iframeContainer.style.display = 'none';
        document.body.classList.remove('iframe-active');
        
        // Show result
        result.style.display = 'block';
        submitBtn.disabled = false;

        if (response.RESULT === '00') {
            // Success
            result.className = 'result success';
            resultTitle.textContent = '✅ Payment Successful!';
            resultDetails.innerHTML = `
                <p><strong>Order ID:</strong> ${response.ORDER_ID}</p>
                <p><strong>Amount:</strong> ${formatAmount(response.AMOUNT)} ${response.CURRENCY}</p>
                <p><strong>Authorization Code:</strong> ${response.AUTHCODE || 'N/A'}</p>
                <p><strong>Payment Reference:</strong> ${response.PASREF || 'N/A'}</p>
                <p><strong>Message:</strong> ${response.MESSAGE}</p>
            `;

        } else if (response.RESULT === '999') {
            // User cancelled
            result.className = 'result';
            resultTitle.textContent = 'ℹ️ Payment Cancelled';
            resultDetails.innerHTML = `
                <p>You cancelled the payment process.</p>
                <p>No charges were made.</p>
            `;

        } else {
            // Error or declined
            result.className = 'result error';
            resultTitle.textContent = '❌ Payment Failed';
            resultDetails.innerHTML = `
                <p><strong>Result Code:</strong> ${response.RESULT}</p>
                <p><strong>Message:</strong> ${response.MESSAGE}</p>
                <p><strong>Order ID:</strong> ${response.ORDER_ID}</p>
            `;
        }

        // Scroll to result
        result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function showError(message) {
        const resultTitle = document.getElementById('resultTitle');
        const resultDetails = document.getElementById('resultDetails');
        result.className = 'result error';
        result.style.display = 'block';
        resultTitle.textContent = '❌ Error';
        resultDetails.innerHTML = `<p>${message}</p>`;
        submitBtn.disabled = false;
    }

    function formatAmount(amountInCents) {
        return (parseInt(amountInCents) / 100).toFixed(2);
    }
});
