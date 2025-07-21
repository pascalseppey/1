// Variables globales pour le portrait client
let currentPortrait = null;
let portraitCompleteness = 0;

// Rendre les données accessibles globalement
window.portraitData = null;

// Fonction pour aller à l'analyse du portrait client
window.goToClientPortrait = function() {
    // Utiliser goToScreen si disponible, sinon faire manuellement
    if (typeof goToScreen === 'function') {
        goToScreen('screen-client-portrait');
    } else {
        // Masquer tous les écrans
        document.querySelectorAll('.screen').forEach(screen => {
            screen.style.display = 'none';
        });
        // Afficher l'écran portrait
        document.getElementById('screen-client-portrait').style.display = 'block';
    }
    
    // Réinitialiser l'interface
    document.getElementById('portraitProgressContainer').style.display = 'none';
    document.getElementById('portraitResults').style.display = 'none';
    document.getElementById('startPortraitBtn').style.display = 'inline-block';
    
    updatePortraitProgress(0);
}

// Démarrer l'analyse du portrait
window.startPortraitAnalysis = function() {
    document.getElementById('startPortraitBtn').style.display = 'none';
    document.getElementById('portraitProgressContainer').style.display = 'block';
    document.getElementById('portraitStatus').textContent = 'Préparation de l\'analyse...';
    
    updatePortraitProgress(0);
    
    // Appeler l'API pour créer le portrait
    fetch('/api/create-client-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            downloadDir: currentDownloadPath,
            socketId: socket.id
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('Erreur: ' + data.error);
            document.getElementById('startPortraitBtn').style.display = 'inline-block';
            document.getElementById('portraitProgressContainer').style.display = 'none';
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        alert('Erreur lors du démarrage de l\'analyse');
    });
}

// Mettre à jour la jauge de progression du portrait
function updatePortraitProgress(percent) {
    const canvas = document.getElementById('portraitProgressCanvas');
    if (!canvas) return;
    
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
    
    // Couleur basée sur la complétude
    let color = '#FF3B30'; // Rouge
    if (percent > 30) color = '#FF9500'; // Orange
    if (percent > 60) color = '#007AFF'; // Bleu
    if (percent > 80) color = '#34C759'; // Vert
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Texte
    document.getElementById('portraitProgressPercent').textContent = percent + '%';
}

// Afficher les résultats du portrait
function displayPortraitResults(portrait) {
    document.getElementById('portraitProgressContainer').style.display = 'none';
    document.getElementById('portraitResults').style.display = 'block';
    
    const info = portrait.informations_client;
    const resultsHtml = `
        <div class="portrait-section">
            <h3>Informations Générales</h3>
            <div class="portrait-field">
                <strong>Raison sociale:</strong> ${info.raison_sociale || 'Non trouvé'}
            </div>
            <div class="portrait-field">
                <strong>Site web:</strong> ${info.site_web ? `<a href="${info.site_web}" target="_blank">${info.site_web}</a>` : 'Non trouvé'}
            </div>
            <div class="portrait-field">
                <strong>Année de fondation:</strong> ${info.annee_fondation || 'Non trouvé'}
            </div>
            <div class="portrait-field">
                <strong>Nombre d'employés:</strong> ${info.nombre_employes || 'Non trouvé'}
            </div>
            <div class="portrait-field">
                <strong>Apprentis:</strong> ${info.nbr_apprentis || 'Non trouvé'}
            </div>
        </div>

        <div class="portrait-section">
            <h3>Certifications</h3>
            ${info.certificats_diplomes.length > 0 ? 
                info.certificats_diplomes.map(cert => `<span class="tag">${cert}</span>`).join(' ') : 
                '<em>Aucune certification trouvée</em>'}
        </div>

        <div class="portrait-section">
            <h3>Google Business</h3>
            <div class="portrait-field">
                <strong>Nombre de fiches:</strong> ${info.nbr_fiches_google}
            </div>
            <div class="portrait-field">
                <strong>Total des avis:</strong> ${info.nombre_total_avis}
            </div>
            <div class="portrait-field">
                <strong>Note globale:</strong> ${info.note_globale ? `${info.note_globale}/5 ⭐` : 'N/A'}
            </div>
            ${info.fiches_google_details && info.fiches_google_details.length > 0 ? `
                <div class="fiches-details">
                    <h4>📍 Détail par fiche:</h4>
                    ${info.fiches_google_details.map(fiche => `
                        <div class="fiche-detail">
                            <strong>${fiche.nom}</strong> - ${fiche.ville}<br>
                            <span class="avis-info">📝 ${fiche.nombre_avis} avis</span>
                            <span class="note-info">⭐ ${fiche.note}/5</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>

        ${info.top_communes_chalandise && info.top_communes_chalandise.length > 0 ? `
        <div class="portrait-section">
            <h3>🎯 Top communes de la zone de chalandise</h3>
            <p><em>Les ${info.top_communes_chalandise.length} communes avec le plus d'habitants dans la zone d'influence</em></p>
            <div class="communes-grid">
                ${info.top_communes_chalandise.map((commune, index) => `
                    <div class="commune-card">
                        <span class="commune-rank">${index + 1}</span>
                        <strong>${commune.nom}</strong>
                        <span class="commune-pop">${commune.habitants.toLocaleString('fr-CH')} hab.</span>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <div class="portrait-section">
            <h3>Type de Clientèle</h3>
            <div class="portrait-field">
                <strong>Cible:</strong> <span class="tag clientele-tag">${info.type_clientele || 'Non identifié'}</span>
            </div>
        </div>

        ${info.clientele_details && info.clientele_details.b2b && (info.clientele_details.b2b.segments.length > 0 || info.clientele_details.b2b.services_specifiques.length > 0) ? `
        <div class="portrait-section clientele-section">
            <h4>🏢 Clientèle B2B</h4>
            ${info.clientele_details.b2b.segments.length > 0 ? `
                <div class="portrait-field">
                    <strong>Segments:</strong> ${info.clientele_details.b2b.segments.map(seg => `<span class="tag segment-tag">${seg}</span>`).join(' ')}
                </div>
            ` : ''}
            ${info.clientele_details.b2b.services_specifiques.length > 0 ? `
                <div class="portrait-field">
                    <strong>Services B2B:</strong>
                    <ul class="services-list">
                        ${info.clientele_details.b2b.services_specifiques.map(service => `<li>${service}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            ${info.clientele_details.b2b.commentaire ? `
                <div class="portrait-field commentaire">
                    <strong>💬 Analyse critique:</strong>
                    <p>${info.clientele_details.b2b.commentaire}</p>
                </div>
            ` : ''}
        </div>
        ` : ''}

        ${info.clientele_details && info.clientele_details.b2c && (info.clientele_details.b2c.segments.length > 0 || info.clientele_details.b2c.services_specifiques.length > 0) ? `
        <div class="portrait-section clientele-section">
            <h4>🏠 Clientèle B2C</h4>
            ${info.clientele_details.b2c.segments.length > 0 ? `
                <div class="portrait-field">
                    <strong>Segments:</strong> ${info.clientele_details.b2c.segments.map(seg => `<span class="tag segment-tag">${seg}</span>`).join(' ')}
                </div>
            ` : ''}
            ${info.clientele_details.b2c.services_specifiques.length > 0 ? `
                <div class="portrait-field">
                    <strong>Services B2C:</strong>
                    <ul class="services-list">
                        ${info.clientele_details.b2c.services_specifiques.map(service => `<li>${service}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            ${info.clientele_details.b2c.commentaire ? `
                <div class="portrait-field commentaire">
                    <strong>💬 Analyse critique:</strong>
                    <p>${info.clientele_details.b2c.commentaire}</p>
                </div>
            ` : ''}
        </div>
        ` : ''}

        <div class="portrait-section">
            <h3>Services (${info.services.length})</h3>
            ${info.services.length > 0 ? 
                info.services.map((service, i) => `
                    <div class="service-item">
                        <strong>Service ${i+1}:</strong> ${service.nom}
                        ${service.description ? `<br><small>${service.description}</small>` : ''}
                    </div>
                `).join('') : 
                '<em>Aucun service identifié</em>'}
        </div>

        <div class="portrait-section">
            <h3>Présentation</h3>
            <p class="portrait-text">${info.texte_presentation || '<em>Texte non généré</em>'}</p>
        </div>

        <div class="portrait-section">
            <h3>Historique</h3>
            <p class="portrait-text">${info.texte_historique || '<em>Texte non généré</em>'}</p>
        </div>

        <div class="portrait-section">
            <h3>Valeurs (${info.valeurs.length})</h3>
            ${info.valeurs.length > 0 ? 
                info.valeurs.map(valeur => `<span class="tag value-tag">${valeur}</span>`).join(' ') : 
                '<em>Aucune valeur identifiée</em>'}
        </div>

        <div class="portrait-section completeness">
            <h3>Taux de complétude</h3>
            <div class="completeness-bar">
                <div class="completeness-fill" style="width: ${portrait.metadata.taux_completude}%"></div>
            </div>
            <span class="completeness-text">${portrait.metadata.taux_completude}% des informations trouvées</span>
        </div>
    `;
    
    document.getElementById('portraitContent').innerHTML = resultsHtml;
    currentPortrait = portrait;
    
    // Stocker les données globalement pour les autres modules
    window.portraitData = portrait;
}

// Télécharger le portrait en JSON
function downloadPortrait() {
    if (!currentPortrait) return;
    
    const dataStr = JSON.stringify(currentPortrait, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `portrait_client_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Écouteurs Socket.io pour le portrait
socket.on('portrait-start', (data) => {
    console.log('Analyse du portrait démarrée:', data.message);
    document.getElementById('portraitStatus').textContent = data.message;
});

socket.on('portrait-progress', (data) => {
    console.log('Progression portrait:', data);
    
    let statusText = 'Analyse en cours...';
    switch(data.step) {
        case 'preparing':
            statusText = 'Préparation des données...';
            break;
        case 'analyzing':
            statusText = 'Analyse avec Gemini AI...';
            break;
        case 'saving':
            statusText = 'Sauvegarde du portrait...';
            break;
        case 'completed':
            statusText = `Analyse terminée - Complétude: ${data.completeness}%`;
            portraitCompleteness = data.completeness;
            break;
    }
    
    document.getElementById('portraitStatus').textContent = statusText;
    updatePortraitProgress(data.progress);
});

socket.on('portrait-complete', (data) => {
    console.log('Portrait complété:', data);
    displayPortraitResults(data.portrait);
});

socket.on('portrait-error', (data) => {
    console.error('Erreur portrait:', data.error);
    alert('Erreur lors de l\'analyse: ' + data.error);
    document.getElementById('startPortraitBtn').style.display = 'inline-block';
    document.getElementById('portraitProgressContainer').style.display = 'none';
});
