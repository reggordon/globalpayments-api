// HPP Redirect Implementation

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('paymentForm');
    const loading = document.getElementById('loading');
    const submitBtn = document.getElementById('submitBtn');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const amount = document.getElementById('amount').value;
        const currency = document.getElementById('currency').value;
        const customerEmail = document.getElementById('customerEmail').value;

        // Show loading
        loading.style.display = 'block';
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

            // Build redirect form
            redirectToHpp(data.hppUrl, data.hppData);

        } catch (error) {
            loading.style.display = 'none';
            submitBtn.disabled = false;
            alert('Failed to initialize payment: ' + error.message);
        }
    });

    function redirectToHpp(hppUrl, params) {
        // Create a hidden form for POST redirect
        const redirectForm = document.createElement('form');
        redirectForm.method = 'POST';
        redirectForm.action = hppUrl;

        // Add all HPP parameters as hidden fields
        for (const [key, value] of Object.entries(params)) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            redirectForm.appendChild(input);
        }

        // Add form to page and submit
        document.body.appendChild(redirectForm);
        redirectForm.submit();
    }
});
