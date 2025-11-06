// HPP Result page - parse and display payment results

// Parse URL parameters
const params = new URLSearchParams(window.location.search);
const result = params.get('result');
const message = params.get('message');
const orderId = params.get('orderId');
const authCode = params.get('authCode');
const pasRef = params.get('pasRef');
const valid = params.get('valid') === 'true';
const amount = params.get('amount');
const currency = params.get('currency');

const container = document.getElementById('result-container');

// Determine success/failure
const isSuccess = result === '00' && valid;
const statusClass = isSuccess ? 'success' : 'error';
const icon = isSuccess ? '✓' : '✗';
const title = isSuccess ? 'Payment Successful!' : 'Payment Failed';
const subtitle = isSuccess 
    ? 'Your transaction has been processed successfully.' 
    : 'There was a problem processing your payment.';

// Build result HTML
let html = `
    <div class="success-page">
        <div class="success-icon ${statusClass}">${icon}</div>
        <h1 class="success-title ${statusClass}">${title}</h1>
        <p class="success-message">${subtitle}</p>
`;

// Add transaction details
if (isSuccess) {
    html += `<div class="transaction-details">
        <h3>Transaction Details</h3>`;
    
    if (amount && currency) {
        const formattedAmount = new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: currency 
        }).format(parseFloat(amount));
        
        html += `
            <div class="detail-row">
                <div class="detail-label">Amount:</div>
                <div class="detail-value"><strong>${formattedAmount}</strong></div>
            </div>
        `;
    }
    
    if (orderId) {
        html += `
            <div class="detail-row">
                <div class="detail-label">Order ID:</div>
                <div class="detail-value"><code>${orderId}</code></div>
            </div>
        `;
    }
    
    if (authCode) {
        html += `
            <div class="detail-row">
                <div class="detail-label">Authorization Code:</div>
                <div class="detail-value">${authCode}</div>
            </div>
        `;
    }
    
    if (pasRef) {
        html += `
            <div class="detail-row">
                <div class="detail-label">Payment Reference:</div>
                <div class="detail-value">${pasRef}</div>
            </div>
        `;
    }
    
    html += `</div>`;
} else {
    // Show error message
    html += `
        <div class="transaction-details">
            <h3>Error Details</h3>
            <div class="detail-row">
                <div class="detail-label">Message:</div>
                <div class="detail-value">${message || 'Unknown error'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Result Code:</div>
                <div class="detail-value">${result || 'N/A'}</div>
            </div>
            ${orderId ? `
            <div class="detail-row">
                <div class="detail-label">Order ID:</div>
                <div class="detail-value"><code>${orderId}</code></div>
            </div>
            ` : ''}
        </div>
    `;
}

// Add action buttons
html += `
        <div class="nav-buttons">
            <a href="/hpp-options.html" class="btn-primary">Make Another Payment</a>
            <a href="/transactions.html" class="btn-secondary">View Transaction History</a>
        </div>
    </div>
`;

container.innerHTML = html;

// If loaded in an iframe, notify parent window
if (window.parent !== window) {
    console.log('Detected iframe - posting message to parent');
    window.parent.postMessage({
        type: 'hpp-response',
        result: result,
        message: message,
        orderId: orderId,
        authCode: authCode,
        pasRef: pasRef,
        valid: valid,
        amount: amount,
        currency: currency,
        success: isSuccess
    }, '*');
}
