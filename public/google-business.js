// Fonctions Google Business
let googleBusinessResults = [];
// currentDownloadPath est maintenant défini dans script.js

// Rechercher les fiches Google Business
async function searchGoogleBusinesses() {
    const location = document.getElementById('googleLocationInput').value;
    const statusDiv = document.getElementById('googleSearchStatus');
    
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = '<p>🔍 Recherche en cours...</p>';
    
    try {
        const response = await fetch('/google/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                websiteUrl: currentUrl,
                location: location,
                socketId: socketId
            })
        });
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            googleBusinessResults = data.results;
            displayGoogleResults(data.results);
            goToScreen('screen-google-results');
        } else {
            statusDiv.innerHTML = '<p>❌ Aucune fiche Google Business trouvée pour ce site.</p>';
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 3000);
        }
    } catch (error) {
        console.error('Erreur recherche Google Business:', error);
        statusDiv.innerHTML = '<p>❌ Erreur lors de la recherche.</p>';
    }
}

// Afficher les résultats Google Business
function displayGoogleResults(results) {
    const listDiv = document.getElementById('googleResultsList');
    listDiv.innerHTML = '';
    
    results.forEach((place, index) => {
        // Extraire la ville de l'adresse
        const addressParts = place.address.split(',');
        let city = '';
        if (addressParts.length >= 2) {
            const cityPart = addressParts[addressParts.length - 2].trim();
            const cityMatch = cityPart.match(/\d{4}\s+(.+)/);
            city = cityMatch ? cityMatch[1].trim() : cityPart;
        }
        
        const placeDiv = document.createElement('div');
        placeDiv.className = 'google-place-item';
        placeDiv.innerHTML = `
            <div class="google-place-header">
                <label class="checkbox">
                    <input type="checkbox" id="google-place-${index}" data-place-index="${index}" checked>
                    <span class="google-place-name">${place.name} - ${city}</span>
                </label>
            </div>
            <div class="google-place-details">
                <div class="detail-row">
                    <span class="detail-label">⭐ Note</span>
                    <span class="detail-value">${place.rating || 'N/A'} / 5 (${place.totalRatings || 0} avis)</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">📍 Adresse</span>
                    <span class="detail-value">${place.address}</span>
                </div>
                ${place.phone ? `
                <div class="detail-row">
                    <span class="detail-label">📞 Téléphone</span>
                    <span class="detail-value">${place.phone}</span>
                </div>
                ` : ''}
                ${place.website ? `
                <div class="detail-row">
                    <span class="detail-label">🌐 Site web</span>
                    <span class="detail-value">${place.website}</span>
                </div>
                ` : ''}
                ${place.photos && place.photos.length > 0 ? `
                <div class="detail-row">
                    <span class="detail-label">📷 Photos</span>
                    <span class="detail-value">${place.photos.length} photos disponibles</span>
                </div>
                ` : ''}
            </div>
        `;
        listDiv.appendChild(placeDiv);
    });
}

// Sélectionner toutes les fiches
function selectAllGoogleBusinesses() {
    const checkboxes = document.querySelectorAll('#googleResultsList input[type="checkbox"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = !allChecked;
    });
}

// Télécharger les fiches sélectionnées
async function downloadGoogleBusinesses() {
    const selectedPlaces = [];
    const checkboxes = document.querySelectorAll('#googleResultsList input[type="checkbox"]:checked');
    
    checkboxes.forEach(checkbox => {
        const index = parseInt(checkbox.dataset.placeIndex);
        selectedPlaces.push(googleBusinessResults[index]);
    });
    
    if (selectedPlaces.length === 0) {
        alert('Veuillez sélectionner au moins une fiche à télécharger.');
        return;
    }
    
    goToScreen('screen-google-download');
    
    // Réinitialiser les logs
    const logsDiv = document.getElementById('googleLogs');
    logsDiv.innerHTML = '';
    
    try {
        const response = await fetch('/google/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                places: selectedPlaces,
                downloadDir: currentDownloadPath,
                socketId: socketId
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'started') {
            console.log('Téléchargement Google Business démarré');
        }
    } catch (error) {
        console.error('Erreur téléchargement Google Business:', error);
        logsDiv.innerHTML += '<div class="log-error">❌ Erreur lors du téléchargement</div>';
    }
}

// Mettre à jour la progression Google Business
function updateGoogleProgress(percent) {
    const canvas = document.getElementById('googleProgressCanvas');
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 80;
    
    // Effacer le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Cercle de fond
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#E5E5EA';
    ctx.lineWidth = 15;
    ctx.stroke();
    
    // Arc de progression
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (2 * Math.PI * percent / 100);
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = '#4285F4'; // Couleur Google
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Texte
    document.getElementById('googleProgressPercent').textContent = percent + '%';
}

// Gérer les événements Socket.io pour Google Business
socket.on('google-search-start', (data) => {
    console.log('Recherche Google Business démarrée:', data);
});

socket.on('google-search-found', (data) => {
    console.log('Fiche trouvée:', data.name);
});

socket.on('google-search-complete', (data) => {
    console.log('Recherche terminée:', data.total, 'fiches trouvées');
});

socket.on('google-download-start', (data) => {
    console.log('Téléchargement démarré:', data.total, 'fiches');
    updateGoogleProgress(0);
});

socket.on('google-download-progress', (data) => {
    updateGoogleProgress(data.progress);
});

socket.on('google-download-complete', (data) => {
    console.log('Téléchargement terminé:', data.results);
    displayGoogleFinalResults(data.results);
});

socket.on('google-download-done', (data) => {
    displayGoogleFinalResults(data.results);
});

socket.on('google-download-error', (data) => {
    console.error('Erreur téléchargement:', data.error);
    const logsDiv = document.getElementById('googleLogs');
    logsDiv.innerHTML += `<div class="log-error">❌ Erreur: ${data.error}</div>`;
});

// Afficher les résultats finaux
function displayGoogleFinalResults(results) {
    goToScreen('screen-google-final');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    const resultsDiv = document.getElementById('googleFinalResults');
    resultsDiv.innerHTML = `
        <h3>Téléchargement terminé !</h3>
        <div class="detail-row">
            <span class="detail-label">✅ Fiches téléchargées</span>
            <span class="detail-value">${successful}</span>
        </div>
        ${failed > 0 ? `
        <div class="detail-row">
            <span class="detail-label">❌ Échecs</span>
            <span class="detail-value">${failed}</span>
        </div>
        ` : ''}
        <div class="results-list">
            ${results.map(r => `
                <div class="result-item ${r.success ? 'success' : 'error'}">
                    ${r.success ? '✅' : '❌'} ${r.name} ${r.city ? `(${r.city})` : ''}
                    ${r.success ? `
                        <div class="result-details">
                            • ${r.reviewsCount} avis téléchargés<br>
                            • ${r.photosCount} photos sauvegardées
                        </div>
                    ` : `<div class="error-message">${r.error}</div>`}
                </div>
            `).join('')}
        </div>
    `;
    
    // Stocker les résultats pour l'analyse de zone de chalandise
    window.googleBusinessDownloadResults = results.filter(r => r.success);
}

// Télécharger tous les résultats
function downloadAllResults() {
    alert('Les résultats sont sauvegardés dans le dossier:\n' + currentDownloadPath);
}

// Ajouter les logs Google Business dans l'interface
socket.on('log', (message) => {
    const logsContainer = document.getElementById('googleLogs');
    if (logsContainer && logsContainer.parentElement.parentElement.classList.contains('active')) {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.textContent = message;
        logsContainer.appendChild(logEntry);
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }
});
