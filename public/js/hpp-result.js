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

// Build result HTML
let html = `
    <div class="icon">${icon}</div>
    <h1 class="${statusClass}">${title}</h1>
    
    <div class="result-box ${statusClass}">
        <strong>${message || 'No message'}</strong>
    </div>
`;

// Add signature validation warning if invalid
if (!valid && result) {
    html += `
        <div class="result-box warning">
            <strong>⚠️ Warning:</strong> Response signature validation failed. 
            This could indicate a security issue or configuration problem.
        </div>
    `;
}

// Add transaction details
html += `
    <div class="result-details">
        <div class="detail-row">
            <div class="detail-label">Result Code:</div>
            <div class="detail-value">${result || 'N/A'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Order ID:</div>
            <div class="detail-value"><code>${orderId || 'N/A'}</code></div>
        </div>
`;

if (amount && currency) {
    const formattedAmount = new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: currency 
    }).format(parseFloat(amount));
    
    html += `
        <div class="detail-row">
            <div class="detail-label">Amount:</div>
            <div class="detail-value">${formattedAmount}</div>
        </div>
    `;
}

if (authCode) {
    html += `
        <div class="detail-row">
            <div class="detail-label">Auth Code:</div>
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

html += `
        <div class="detail-row">
            <div class="detail-label">Signature Valid:</div>
            <div class="detail-value">${valid ? '✓ Yes' : '✗ No'}</div>
        </div>
    </div>
    
    <div class="nav-buttons">
        <a href="/dropin.html" class="btn-primary">New Payment</a>
        <a href="/transactions.html" class="btn-secondary">View Transactions</a>
    </div>
`;

container.innerHTML = html;
