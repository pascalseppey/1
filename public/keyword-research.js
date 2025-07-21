// Variables globales pour la recherche de mots-clés
let keywordResults = [];
let selectedKeywords = [];

// S'assurer que les données sont accessibles globalement
if (typeof window.portraitData === 'undefined') {
    window.portraitData = null;
}
if (typeof window.catchmentAreaData === 'undefined') {
    window.catchmentAreaData = null;
}

// Fonction pour démarrer la recherche de mots-clés
async function startKeywordResearch() {
    console.log('Démarrage de la recherche de mots-clés');
    
    goToScreen('screen-keyword-research');
    
    // Récupérer les services depuis le portrait
    const services = window.portraitData?.informations_client?.services || [];
    const catchmentData = window.catchmentAreaData || {};
    
    if (services.length === 0) {
        alert('Aucun service trouvé dans le portrait client');
        return;
    }
    
    // Préparer l'affichage
    displayKeywordPreparation(services, catchmentData);
}

// Afficher la préparation de la recherche
function displayKeywordPreparation(services, catchmentData) {
    const preparationDiv = document.getElementById('keywordPreparation');
    
    // Débugger les données
    console.log('Données de zone de chalandise:', catchmentData);
    console.log('Données du portrait:', window.portraitData);
    console.log('window.catchmentAreaData:', window.catchmentAreaData);
    console.log('window.catchmentAreaResults:', window.catchmentAreaResults);
    
    // Extraire les localités depuis le portrait
    const locations = [];
    const businessLocations = [];
    
    // 1. Récupérer les localités des fiches Google depuis le portrait
    if (window.portraitData && window.portraitData.informations_client) {
        const fichesGoogle = window.portraitData.informations_client.fiches_google_details || [];
        fichesGoogle.forEach(fiche => {
            if (fiche.ville && !businessLocations.includes(fiche.ville)) {
                businessLocations.push(fiche.ville);
            }
        });
        
        // 2. Récupérer les top communes depuis le portrait
        const topCommunes = window.portraitData.informations_client.top_communes_chalandise || [];
        topCommunes.forEach(commune => {
            if (commune.nom && !locations.includes(commune.nom)) {
                locations.push(commune.nom);
            }
        });
    }
    
    // 3. Si pas assez de communes, compléter avec les données de zone de chalandise
    if (locations.length < 6 && catchmentData && catchmentData.analyses) {
        catchmentData.analyses.forEach(analysis => {
            if (analysis.topCommunes) {
                analysis.topCommunes.forEach(commune => {
                    if (!locations.includes(commune.name || commune.nom)) {
                        locations.push(commune.name || commune.nom);
                    }
                });
            }
        });
    }
    
    console.log('Localités extraites:', { businessLocations, locations });
    
    let html = `
        <h3>Services identifiés (${services.length})</h3>
        <div class="services-list">
            ${services.map(service => `
                <div class="service-item">
                    <strong>${service.nom}</strong>
                    ${service.description ? `<p>${service.description}</p>` : ''}
                </div>
            `).join('')}
        </div>
        
        <h3>Localités pour la recherche (${locations.length + businessLocations.length})</h3>
        <div class="locations-list">
            <h4>Localités de l'entreprise:</h4>
            <div class="location-tags">
                ${businessLocations.map(loc => `<span class="location-tag primary">${loc}</span>`).join('')}
            </div>
            
            <h4>Top communes de la zone de chalandise:</h4>
            <div class="location-tags">
                ${locations.slice(0, 6).map(loc => `<span class="location-tag">${loc}</span>`).join('')}
            </div>
        </div>
    `;
    
    preparationDiv.innerHTML = html;
    
    // Afficher le bouton de lancement
    document.getElementById('launchKeywordBtn').style.display = 'block';
}

// Lancer la recherche effective
async function launchKeywordResearch() {
    const progressContainer = document.getElementById('keywordProgressContainer');
    const resultsContainer = document.getElementById('keywordResults');
    const launchBtn = document.getElementById('launchKeywordBtn');
    
    // Afficher la progression
    progressContainer.style.display = 'block';
    resultsContainer.style.display = 'none';
    launchBtn.style.display = 'none';
    
    updateKeywordProgress(10);
    
    try {
        // Préparer les données
        const services = window.portraitData?.informations_client?.services || [];
        const catchmentData = window.catchmentAreaData || {};
        
        // Extraire les localités (même logique que displayKeywordPreparation)
        const locations = [];
        const businessLocations = [];
        
        // Essayer plusieurs sources de données
        if (catchmentData && catchmentData.analyses) {
            catchmentData.analyses.forEach(analysis => {
                if (analysis.locationName) {
                    businessLocations.push(analysis.locationName);
                }
                if (analysis.topCommunes) {
                    analysis.topCommunes.forEach(commune => {
                        if (!locations.includes(commune.nom)) {
                            locations.push(commune.nom);
                        }
                    });
                }
            });
        }
        
        // Si pas de données dans catchmentData, essayer window.catchmentAreaResults
        if (businessLocations.length === 0 && window.catchmentAreaResults) {
            window.catchmentAreaResults.forEach(result => {
                if (result.business && result.business.city) {
                    businessLocations.push(result.business.city);
                }
                if (result.topCommunes) {
                    // Prendre seulement les 6 premières communes (les plus peuplées)
                    result.topCommunes.slice(0, 6).forEach(commune => {
                        if (!locations.includes(commune.name)) {
                            locations.push(commune.name);
                        }
                    });
                }
            });
        }
        
        // Si toujours pas de données, essayer depuis le portrait
        if (businessLocations.length === 0 && window.portraitData) {
            const fichesGoogle = window.portraitData.informations_client?.fiches_google_details || [];
            fichesGoogle.forEach(fiche => {
                if (fiche.ville && !businessLocations.includes(fiche.ville)) {
                    businessLocations.push(fiche.ville);
                }
            });
        }
        
        console.log('Localités pour la recherche:', { businessLocations, locations });
        
        updateKeywordProgress(30);
        document.getElementById('keywordStatus').textContent = 'Préparation des combinaisons de mots-clés...';
        
        // Appeler l'API
        const response = await fetch('/api/keyword-research', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                services: services,
                locations: locations.slice(0, 6), // Top 6 communes
                businessLocations: businessLocations,
                socketId: socket.id
            })
        });
        
        if (!response.ok) {
            throw new Error('Erreur lors de la recherche');
        }
        
        const data = await response.json();
        keywordResults = data.keywords || [];
        
        updateKeywordProgress(100);
        document.getElementById('keywordStatus').textContent = `${keywordResults.length} mots-clés analysés`;
        
        // Afficher les résultats
        setTimeout(() => {
            progressContainer.style.display = 'none';
            displayKeywordResults();
        }, 1000);
        
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la recherche de mots-clés: ' + error.message);
        progressContainer.style.display = 'none';
        launchBtn.style.display = 'block';
    }
}

// Afficher les résultats de la recherche
function displayKeywordResults() {
    const resultsContainer = document.getElementById('keywordResults');
    resultsContainer.style.display = 'block';
    
    if (keywordResults.length === 0) {
        resultsContainer.innerHTML = '<p>Aucun mot-clé trouvé avec un volume suffisant.</p>';
        return;
    }
    
    // Grouper par service
    const serviceGroups = {};
    keywordResults.forEach(kw => {
        const service = kw.service || 'Général';
        if (!serviceGroups[service]) {
            serviceGroups[service] = [];
        }
        serviceGroups[service].push(kw);
    });
    
    let html = `
        <h3>Top 20 Mots-clés par volume de recherche</h3>
        <div class="keyword-table">
            <table>
                <thead>
                    <tr>
                        <th>Mot-clé</th>
                        <th>Service</th>
                        <th>Volume mensuel</th>
                        <th>CPC (CHF)</th>
                        <th>Concurrence</th>
                    </tr>
                </thead>
                <tbody>
                    ${keywordResults.map((kw, index) => `
                        <tr class="keyword-row ${index < 5 ? 'top-keyword' : ''}">
                            <td class="keyword-text">${kw.keyword}</td>
                            <td class="service-name">${kw.service}</td>
                            <td class="volume">${kw.avgMonthlySearches.toLocaleString('fr-CH')}</td>
                            <td class="cpc">${kw.cpc} CHF</td>
                            <td class="competition ${kw.competition?.toLowerCase() || 'medium'}">
                                ${kw.competitionLevel}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="keyword-summary">
            <h4>Résumé par service</h4>
            ${Object.entries(serviceGroups).map(([service, keywords]) => `
                <div class="service-summary">
                    <strong>${service}:</strong> ${keywords.length} mot${keywords.length > 1 ? 's' : ''}-clé${keywords.length > 1 ? 's' : ''}
                    (Volume total: ${keywords.reduce((sum, kw) => sum + kw.avgMonthlySearches, 0).toLocaleString('fr-CH')})
                </div>
            `).join('')}
        </div>
    `;
    
    resultsContainer.innerHTML = html;
    
    // Afficher les boutons d'action
    document.querySelector('.keyword-actions').style.display = 'flex';
}

// Mettre à jour la progression
function updateKeywordProgress(percent) {
    const canvas = document.getElementById('keywordProgressCanvas');
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
    
    // Couleur Google Ads (orange)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = '#EA4335';
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Texte
    document.getElementById('keywordProgressPercent').textContent = percent + '%';
}

// Télécharger les résultats
function downloadKeywordResults() {
    const data = {
        timestamp: new Date().toISOString(),
        entreprise: window.portraitData?.informations_client?.raison_sociale || 'Entreprise',
        totalKeywords: keywordResults.length,
        keywords: keywordResults,
        metadata: {
            services: window.portraitData?.informations_client?.services || [],
            zones: window.catchmentAreaData?.analyses || []
        }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recherche_mots_cles_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Continuer vers la prochaine étape
function goToNextFromKeywords() {
    // Ici on pourrait ajouter une prochaine étape
    goToScreen('screen-home');
}

// Socket.io events pour la progression
socket.on('keyword-progress', (data) => {
    updateKeywordProgress(data.progress);
    if (data.message) {
        document.getElementById('keywordStatus').textContent = data.message;
    }
});

socket.on('keyword-complete', (data) => {
    console.log('Recherche de mots-clés terminée:', data);
    
    // Afficher un message d'avertissement si des données simulées sont utilisées
    if (data.message && data.message.includes('simulées')) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'keyword-warning';
        warningDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p>${data.message}</p>
        `;
        
        const container = document.querySelector('.keyword-results');
        if (container && container.firstChild) {
            container.insertBefore(warningDiv, container.firstChild);
        }
    }
});
