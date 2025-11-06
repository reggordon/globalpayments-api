// HPP Lightbox Implementation (without RealexHpp SDK)

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('paymentForm');
    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    const submitBtn = document.getElementById('submitBtn');

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
            submitBtn.disabled = false;

            // Open HPP in lightbox
            openHppLightbox(data.hppUrl, data.hppData);

        } catch (error) {
            loading.style.display = 'none';
            submitBtn.disabled = false;
            showError('Failed to initialize payment: ' + error.message);
        }
    });

    function openHppLightbox(hppUrl, hppParams) {
        // Create lightbox overlay
        const overlay = document.createElement('div');
        overlay.id = 'hpp-lightbox-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Create iframe container
        const container = document.createElement('div');
        container.style.cssText = `
            position: relative;
            width: 90%;
            max-width: 600px;
            height: 80%;
            max-height: 700px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        `;

        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 10000;
            width: 30px;
            height: 30px;
            border: none;
            background: #f44336;
            color: white;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            line-height: 1;
        `;
        closeBtn.onclick = function() {
            document.body.removeChild(overlay);
            handleHppResponse({ RESULT: '999', MESSAGE: 'User cancelled', ORDER_ID: 'Cancelled' });
        };

        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
        `;
        iframe.name = 'hpp-lightbox-frame';

        // Create form to POST to HPP in iframe
        const hppForm = document.createElement('form');
        hppForm.method = 'POST';
        hppForm.action = hppUrl;
        hppForm.target = 'hpp-lightbox-frame';
        hppForm.style.display = 'none';

        // Add all HPP parameters
        for (const [key, value] of Object.entries(hppParams)) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            hppForm.appendChild(input);
        }

        // Assemble and show
        container.appendChild(closeBtn);
        container.appendChild(iframe);
        overlay.appendChild(container);
        document.body.appendChild(overlay);
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
                document.body.removeChild(overlay);
                
                // Convert to expected format - add required fields for server
                const response = {
                    TIMESTAMP: new Date().toISOString().replace(/[-:]/g, '').slice(0, 14),
                    MERCHANT_ID: 'unknown', // Server will accept this
                    ORDER_ID: event.data.orderId,
                    RESULT: event.data.result,
                    MESSAGE: event.data.message,
                    PASREF: event.data.pasRef,
                    AUTHCODE: event.data.authCode,
                    SHA1HASH: 'client-side', // Mark as client-side response
                    AMOUNT: event.data.amount ? Math.round(parseFloat(event.data.amount) * 100) : 0,
                    CURRENCY: event.data.currency
                };
                
                handleHppResponse(response);
            }
        });
    }

    async function handleHppResponse(response) {
        const resultTitle = document.getElementById('resultTitle');
        const resultDetails = document.getElementById('resultDetails');
        result.style.display = 'block';

        // Save transaction to server (except for cancelled transactions)
        console.log('HPP Response received:', response);
        if (response.RESULT !== '999') {
            try {
                console.log('Sending transaction to server...');
                const saveResponse = await fetch('/hpp-response', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(response)
                });
                console.log('Server response:', saveResponse.status);
                const data = await saveResponse.json();
                console.log('Server data:', data);
            } catch (error) {
                console.error('Failed to save transaction:', error);
            }
        }

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

            // Reset form
            form.reset();

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
    }

    function formatAmount(amountInCents) {
        return (parseInt(amountInCents) / 100).toFixed(2);
    }
});
