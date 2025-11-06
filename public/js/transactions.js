// Transaction management and display
let allTransactions = [];

async function loadStats() {
    try {
        const response = await fetch('/transactions/stats');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('totalTransactions').textContent = data.stats.total;
            document.getElementById('successfulTransactions').textContent = data.stats.successful;
            document.getElementById('failedTransactions').textContent = data.stats.failed;
            document.getElementById('totalAmount').textContent = 
                new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(data.stats.totalAmount);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadTransactions() {
    try {
        const response = await fetch('/transactions?limit=100');
        const data = await response.json();
        
        if (data.success) {
            allTransactions = data.transactions;
            displayTransactions(data.transactions);
        }
        
        document.getElementById('loading').style.display = 'none';
        
        if (data.transactions.length === 0) {
            document.getElementById('emptyState').style.display = 'block';
        } else {
            document.getElementById('transactionsTable').style.display = 'table';
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
        document.getElementById('loading').innerHTML = '<p>Error loading transactions</p>';
    }
}

function displayTransactions(transactions) {
    const tbody = document.getElementById('transactionsBody');
    tbody.innerHTML = '';
    
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        
        const date = new Date(transaction.timestamp);
        const formattedDate = date.toLocaleString();
        
        let statusClass = 'failed';
        let statusText = 'Failed';
        
        if (transaction.type === 'refund') {
            statusClass = 'refund';
            statusText = 'Refunded';
        } else if (transaction.success) {
            statusClass = 'success';
            statusText = 'Success';
        }
        
        const amount = new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: transaction.currency 
        }).format(transaction.amount);
        
        // Add View Response button if rawResponse exists
        const viewResponseBtn = transaction.rawResponse 
            ? `<button class="btn-view" onclick="viewGatewayResponse('${transaction.orderId}')">📄 View Response</button>`
            : '';
        
        row.innerHTML = `
            <td class="timestamp">${formattedDate}</td>
            <td><code>${transaction.orderId}</code></td>
            <td><span class="status ${statusClass}">${statusText}</span></td>
            <td class="amount">${amount}</td>
            <td class="card-number">${transaction.maskedCardNumber}</td>
            <td>${transaction.cardHolderName}</td>
            <td>${transaction.authCode || '-'}</td>
            <td style="font-size: 13px;">${transaction.message}</td>
            <td>${viewResponseBtn}</td>
        `;
        
        tbody.appendChild(row);
    });
}

function refreshData() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('transactionsTable').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    
    loadStats();
    loadTransactions();
}

function exportToCSV() {
    if (allTransactions.length === 0) {
        alert('No transactions to export');
        return;
    }
    
    // CSV header
    let csv = 'Timestamp,Order ID,Status,Amount,Currency,Card Number,Cardholder,Auth Code,Message\n';
    
    // Add data rows
    allTransactions.forEach(transaction => {
        const date = new Date(transaction.timestamp).toISOString();
        const status = transaction.type === 'refund' ? 'Refunded' : (transaction.success ? 'Success' : 'Failed');
        
        csv += `"${date}","${transaction.orderId}","${status}",${transaction.amount},"${transaction.currency}","${transaction.maskedCardNumber}","${transaction.cardHolderName}","${transaction.authCode || ''}","${transaction.message.replace(/"/g, '""')}"\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Refund modal management
let currentRefundOrderId = null;
let currentRefundMaxAmount = 0;
let currentRefundCurrency = 'EUR';

function openRefundModal(orderId, maxAmount, currency) {
    currentRefundOrderId = orderId;
    currentRefundMaxAmount = maxAmount;
    currentRefundCurrency = currency;
    
    document.getElementById('refundOrderId').textContent = orderId;
    document.getElementById('refundMaxAmount').textContent = 
        new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(maxAmount);
    document.getElementById('refundAmount').value = maxAmount;
    document.getElementById('refundAmount').max = maxAmount;
    
    document.getElementById('refundModal').classList.add('active');
}

function closeRefundModal() {
    document.getElementById('refundModal').classList.remove('active');
    currentRefundOrderId = null;
    currentRefundMaxAmount = 0;
}

async function processRefund() {
    const refundAmount = parseFloat(document.getElementById('refundAmount').value);
    
    if (refundAmount <= 0 || refundAmount > currentRefundMaxAmount) {
        alert(`Refund amount must be between 0 and ${currentRefundMaxAmount}`);
        return;
    }
    
    try {
        const response = await fetch('/refund', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                orderId: currentRefundOrderId,
                amount: refundAmount,
                currency: currentRefundCurrency
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Refund processed successfully!');
            closeRefundModal();
            refreshData();
        } else {
            alert(`Refund failed: ${data.message}`);
        }
    } catch (error) {
        console.error('Error processing refund:', error);
        alert(`Error: ${error.message}`);
    }
}

// Gateway response viewer
function viewGatewayResponse(orderId) {
    const transaction = allTransactions.find(t => t.orderId === orderId);
    if (!transaction || !transaction.rawResponse) {
        alert('Raw gateway response not available for this transaction.');
        return;
    }
    
    document.getElementById('responseOrderId').textContent = orderId;
    document.getElementById('responseContent').textContent = transaction.rawResponse;
    document.getElementById('responseModal').classList.add('active');
}

function closeResponseModal() {
    document.getElementById('responseModal').classList.remove('active');
}

function copyResponse() {
    const content = document.getElementById('responseContent').textContent;
    navigator.clipboard.writeText(content).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadStats();
    loadTransactions();
    
    // Set up event listeners
    document.getElementById('refreshBtn').addEventListener('click', refreshData);
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
    document.getElementById('cancelRefund').addEventListener('click', closeRefundModal);
    document.getElementById('confirmRefund').addEventListener('click', processRefund);
    
    // Close modal on background click
    document.getElementById('refundModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeRefundModal();
        }
    });
});
