// Profile link functionality - adds floating profile/login button to top right
(async function() {
    try {
        const response = await fetch('/api/user');
        
        // Create container if it doesn't exist
        let container = document.getElementById('profileLinkContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'profileLinkContainer';
            document.body.insertBefore(container, document.body.firstChild);
        }
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
                // User is logged in - show profile link with name
                container.innerHTML = `
                    <a href="/profile.html" class="profile-link">👤 ${data.user.name}</a>
                `;
                return;
            }
        }
        
        // User not logged in - show login link
        container.innerHTML = `
            <a href="/login.html" class="profile-link">🔑 Login</a>
        `;
    } catch (error) {
        // Error or not logged in - show login link
        const container = document.getElementById('profileLinkContainer') || document.createElement('div');
        container.id = 'profileLinkContainer';
        if (!container.parentNode) {
            document.body.insertBefore(container, document.body.firstChild);
        }
        container.innerHTML = `
            <a href="/login.html" class="profile-link">🔑 Login</a>
        `;
    }
})();
