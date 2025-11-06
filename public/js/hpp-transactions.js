// HPP Transaction management and display
let allTransactions = [];

async function loadStats() {
    try {
        const response = await fetch('/hpp-transactions/stats');
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
        const response = await fetch('/hpp-transactions?limit=100');
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
        document.getElementById('loading').innerHTML = '<p>Error loading HPP transactions</p>';
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
        
        if (transaction.success) {
            statusClass = 'success';
            statusText = 'Success';
        }
        
        const amount = new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: transaction.currency 
        }).format(transaction.amount);
        
        const signatureStatus = transaction.signatureValid 
            ? '<span style="color: #28a745;">✓ Valid</span>' 
            : '<span style="color: #dc3545;">✗ Invalid</span>';
        
        row.innerHTML = `
            <td class="timestamp">${formattedDate}</td>
            <td><code>${transaction.orderId}</code></td>
            <td><span class="status ${statusClass}">${statusText}</span></td>
            <td class="amount">${amount}</td>
            <td>${transaction.authCode || '-'}</td>
            <td style="font-size: 12px;">${transaction.pasRef || '-'}</td>
            <td style="font-size: 13px;">${transaction.message}</td>
            <td>${signatureStatus}</td>
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
        alert('No HPP transactions to export');
        return;
    }
    
    // CSV header
    let csv = 'Timestamp,Order ID,Status,Amount,Currency,Auth Code,Payment Ref,Message,Signature Valid\n';
    
    // Add data rows
    allTransactions.forEach(transaction => {
        const date = new Date(transaction.timestamp).toISOString();
        const status = transaction.success ? 'Success' : 'Failed';
        
        csv += `"${date}","${transaction.orderId}","${status}",${transaction.amount},"${transaction.currency}","${transaction.authCode || ''}","${transaction.pasRef || ''}","${transaction.message.replace(/"/g, '""')}","${transaction.signatureValid ? 'Valid' : 'Invalid'}"\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hpp-transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadStats();
    loadTransactions();
});
