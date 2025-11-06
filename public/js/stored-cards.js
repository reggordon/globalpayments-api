// Stored Cards Management

let currentChargeToken = null;
let realvaultEnabled = false;

// Load and display stored cards
async function loadStoredCards() {
    try {
        const response = await fetch('/stored-cards');
        const data = await response.json();
        
        document.getElementById('loading').style.display = 'none';
        
        if (data.success && data.cards.length > 0) {
            displayCards(data.cards);
            document.getElementById('cardsGrid').style.display = 'grid';
            document.getElementById('emptyState').style.display = 'none';
        } else {
            document.getElementById('cardsGrid').style.display = 'none';
            document.getElementById('emptyState').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading stored cards:', error);
        document.getElementById('loading').innerHTML = '<p>Error loading stored cards</p>';
    }
}

// Display cards in grid
function displayCards(cards) {
    const grid = document.getElementById('cardsGrid');
    grid.innerHTML = '';
    
    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card-item';
        
        const createdDate = new Date(card.createdAt).toLocaleDateString();
        const lastUsedText = card.lastUsed 
            ? `Last used: ${new Date(card.lastUsed).toLocaleDateString()}` 
            : 'Never used';
        
        cardElement.innerHTML = `
            <div>
                <div class="card-brand">${card.cardBrand}${card.storedInRealvault ? ' 🔒' : ''}</div>
                <div class="card-number">${card.maskedCardNumber}</div>
                <div class="card-holder">${card.cardHolderName}</div>
                <div class="card-expiry">Expires: ${card.expiryMonth}/${card.expiryYear}</div>
                <div class="card-meta">
                    <div>Added: ${createdDate}</div>
                    <div>${lastUsedText}</div>
                    ${card.storedInRealvault ? '<div style="font-size: 11px; color: #90EE90;">✓ Stored in Realvault</div>' : '<div style="font-size: 11px; color: #FFD700;">⚠ Local storage only</div>'}
                </div>
            </div>
            <div class="card-actions">
                <button class="btn-charge" onclick="openChargeModal('${card.token}', '${card.maskedCardNumber}', '${card.cardHolderName}')"${!card.storedInRealvault ? ' disabled' : ''}>
                    💳 Charge${!card.storedInRealvault ? ' (Disabled)' : ''}
                </button>
                <button class="btn-delete" onclick="deleteCard('${card.token}')">
                    🗑️ Delete
                </button>
            </div>
        `;
        
        grid.appendChild(cardElement);
    });
}

// Add new card form handler
document.getElementById('addCardForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
    const cardHolderName = document.getElementById('cardHolderName').value;
    const expiryDate = document.getElementById('expiryDate').value;
    const cvv = document.getElementById('cvv').value;
    const customerEmail = document.getElementById('customerEmail').value;
    
    // Parse expiry date
    const [expiryMonth, expiryYear] = expiryDate.split('/');
    
    // Show loading
    document.getElementById('addCardLoading').style.display = 'block';
    document.getElementById('addCardBtn').disabled = true;
    
    try {
        const response = await fetch('/store-card', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                cardNumber,
                cardHolderName,
                expiryMonth,
                expiryYear: '20' + expiryYear, // Convert YY to 20YY
                cvv,
                customerEmail
            })
        });
        
        const data = await response.json();
        
        document.getElementById('addCardLoading').style.display = 'none';
        document.getElementById('addCardBtn').disabled = false;
        
        if (data.success) {
            // Update Realvault status
            realvaultEnabled = data.realvaultEnabled || false;
            updateStorageNote();
            
            const storageType = data.realvaultEnabled ? 'Realvault (secure)' : 'local storage (demo only)';
            alert(`✅ Card saved successfully to ${storageType}!\n\nToken: ${data.token}\nCard: ${data.maskedCardNumber}\nBrand: ${data.cardBrand}`);
            
            // Reset form
            document.getElementById('addCardForm').reset();
            
            // Reload cards
            loadStoredCards();
        } else {
            alert(`❌ Failed to save card:\n${data.message}`);
        }
    } catch (error) {
        document.getElementById('addCardLoading').style.display = 'none';
        document.getElementById('addCardBtn').disabled = false;
        alert(`Error: ${error.message}`);
    }
});

// Update storage note based on Realvault status
function updateStorageNote() {
    const noteElement = document.getElementById('noteText');
    if (realvaultEnabled) {
        noteElement.innerHTML = '🔒 <strong>Realvault Enabled:</strong> Cards are stored securely in Global Payments Realvault and can be charged.';
        document.getElementById('storageNote').style.background = '#d4edda';
        document.getElementById('storageNote').style.borderColor = '#28a745';
    } else {
        noteElement.innerHTML = 'Cards are saved for reference only. To enable charging stored cards, contact Global Payments to set up Realvault integration.';
    }
}

// Open charge modal
function openChargeModal(token, maskedCardNumber, cardHolderName) {
    currentChargeToken = token;
    document.getElementById('chargeCardNumber').textContent = maskedCardNumber;
    document.getElementById('chargeCardHolder').textContent = cardHolderName;
    document.getElementById('chargeResult').style.display = 'none';
    document.getElementById('chargeForm').reset();
    document.getElementById('chargeModal').classList.add('active');
}

// Close charge modal
function closeChargeModal() {
    document.getElementById('chargeModal').classList.remove('active');
    currentChargeToken = null;
}

// Charge card form handler
document.getElementById('chargeForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const amount = document.getElementById('chargeAmount').value;
    const currency = document.getElementById('chargeCurrency').value;
    
    // Show loading
    document.getElementById('chargeLoading').style.display = 'block';
    document.getElementById('chargeBtn').disabled = true;
    document.getElementById('chargeResult').style.display = 'none';
    
    try {
        const response = await fetch('/charge-stored-card', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: currentChargeToken,
                amount: parseFloat(amount),
                currency: currency
            })
        });
        
        const data = await response.json();
        
        document.getElementById('chargeLoading').style.display = 'none';
        document.getElementById('chargeBtn').disabled = false;
        
        // Show result
        const resultTitle = document.getElementById('chargeResultTitle');
        const resultDetails = document.getElementById('chargeResultDetails');
        const result = document.getElementById('chargeResult');
        
        if (data.success) {
            result.className = 'result success';
            resultTitle.textContent = '✅ Payment Successful!';
            resultDetails.innerHTML = `
                <p><strong>Order ID:</strong> ${data.orderId}</p>
                <p><strong>Amount:</strong> ${amount} ${currency}</p>
                <p><strong>Authorization Code:</strong> ${data.authCode}</p>
                <p><strong>Message:</strong> ${data.message}</p>
            `;
            
            // Reload cards to update last used
            setTimeout(() => {
                loadStoredCards();
                closeChargeModal();
            }, 3000);
        } else {
            result.className = 'result error';
            resultTitle.textContent = data.message && data.message.includes('Realvault') ? 'ℹ️ Feature Not Available' : '❌ Payment Failed';
            
            if (data.message && data.message.includes('Realvault')) {
                resultDetails.innerHTML = `
                    <p><strong>Note:</strong> ${data.message}</p>
                    ${data.note ? `<p>${data.note}</p>` : ''}
                    <p style="margin-top: 15px; font-size: 0.9em;">To enable this feature, contact Global Payments to set up Realvault integration.</p>
                `;
            } else {
                resultDetails.innerHTML = `
                    <p><strong>Result Code:</strong> ${data.resultCode}</p>
                    <p><strong>Message:</strong> ${data.message}</p>
                `;
            }
        }
        
        result.style.display = 'block';
        
    } catch (error) {
        document.getElementById('chargeLoading').style.display = 'none';
        document.getElementById('chargeBtn').disabled = false;
        alert(`Error: ${error.message}`);
    }
});

// Delete card
async function deleteCard(token) {
    if (!confirm('Are you sure you want to delete this card?\n\nThis action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/stored-cards/${token}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Card deleted successfully');
            loadStoredCards();
        } else {
            alert(`❌ Failed to delete card:\n${data.message}`);
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

// Format card number input
document.getElementById('cardNumber').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\s/g, '');
    let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
    e.target.value = formattedValue;
});

// Format expiry date input
document.getElementById('expiryDate').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    e.target.value = value;
});

// Only allow numbers in CVV
document.getElementById('cvv').addEventListener('input', function(e) {
    e.target.value = e.target.value.replace(/\D/g, '');
});

// Close modal on background click
document.getElementById('chargeModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeChargeModal();
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadStoredCards();
    updateStorageNote(); // Set initial note
});
