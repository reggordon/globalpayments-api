// Test Cards - Copy Card Number Functionality

function copyCard(cardNumber) {
    // Remove spaces for copying
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    // Create temporary input
    const temp = document.createElement('input');
    temp.value = cleanNumber;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    document.body.removeChild(temp);

    // Find the button that was clicked
    const buttons = document.querySelectorAll('.copy-btn');
    buttons.forEach(btn => {
        if (btn.textContent === 'Copied!') {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
        }
    });

    // Update clicked button
    event.target.textContent = 'Copied!';
    event.target.classList.add('copied');

    // Reset after 2 seconds
    setTimeout(() => {
        event.target.textContent = 'Copy';
        event.target.classList.remove('copied');
    }, 2000);
}
