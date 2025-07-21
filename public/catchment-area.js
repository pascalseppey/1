// État pour la zone de chalandise
let currentBusinessIndex = 0;
let catchmentAreaResults = [];

// Fonction pour passer à l'analyse de zone de chalandise
window.goToCatchmentAreaAnalysis = function() {
    initializeCatchmentArea();
}

// Initialiser l'analyse de zone de chalandise
function initializeCatchmentArea() {
    currentBusinessIndex = 0;
    catchmentAreaResults = [];
    
    // Récupérer les résultats Google Business
    const businessResults = window.googleBusinessDownloadResults || [];
    
    if (businessResults.length === 0) {
        alert('Aucune fiche Google Business à analyser');
        return;
    }
    
    // Afficher le premier écran
    showCatchmentAreaForBusiness(businessResults[currentBusinessIndex]);
    goToScreen('screen-catchment-area');
}

// Afficher l'analyse pour une fiche business
function showCatchmentAreaForBusiness(business) {
    // Mettre à jour le titre avec la localité
    document.getElementById('catchmentLocationTitle').textContent = `Analyse pour ${business.name} - ${business.city}`;
    
    // Réinitialiser le slider
    document.getElementById('radiusSlider').value = 10;
    document.getElementById('radiusValue').textContent = '10';
    
    // Calculer et afficher les statistiques
    updateCatchmentAreaStats(business, 10);
}

// Mettre à jour le rayon
function updateRadius(value) {
    document.getElementById('radiusValue').textContent = value;
    
    const businessResults = window.googleBusinessDownloadResults || [];
    if (businessResults[currentBusinessIndex]) {
        updateCatchmentAreaStats(businessResults[currentBusinessIndex], parseInt(value));
    }
}

// Calculer et afficher les statistiques de la zone via l'API
async function updateCatchmentAreaStats(business, radius) {
    const businessCity = business.city;
    
    try {
        // Afficher un message de chargement
        document.getElementById('totalPopulation').innerHTML = '<span style="color: #999;">Calcul en cours...</span>';
        document.getElementById('topCommunes').innerHTML = '<p style="color: #999;">Chargement...</p>';
        
        // Appeler l'API serveur
        const response = await fetch('/api/analyze-catchment-area', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                locality: businessCity,
                radius: radius
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors de l\'analyse');
        }
        
        const result = await response.json();
        
        // Afficher les résultats
        document.getElementById('totalPopulation').textContent = result.totalPopulation.toLocaleString('fr-CH');
        
        const topCommunesHtml = result.topCommunes.map(c => `
            <div class="commune-item">
                <span class="commune-name">${c.name} (${c.canton})</span>
                <span class="commune-population">${c.population.toLocaleString('fr-CH')} hab.</span>
                <span class="commune-distance">${c.distance} km</span>
            </div>
        `).join('');
        
        document.getElementById('topCommunes').innerHTML = topCommunesHtml;
        
        // Stocker les résultats actuels
        catchmentAreaResults[currentBusinessIndex] = {
            business: business,
            radius: radius,
            totalPopulation: result.totalPopulation,
            totalCommunes: result.totalCommunes,
            topCommunes: result.topCommunes,
            allCommunes: result.allCommunes,
            center: result.center
        };
        
    } catch (error) {
        console.error('Erreur lors de l\'analyse:', error);
        document.getElementById('totalPopulation').innerHTML = `<span style="color: red;">Erreur: ${error.message}</span>`;
        document.getElementById('topCommunes').innerHTML = `<p style="color: red;">Impossible de calculer. Vérifiez que la localité "${businessCity}" existe.</p>`;
    }
}

// Passer à la prochaine zone de chalandise ou terminer
function nextCatchmentArea() {
    const businessResults = window.googleBusinessDownloadResults || [];
    
    if (currentBusinessIndex < businessResults.length - 1) {
        // Passer à la prochaine fiche
        currentBusinessIndex++;
        showCatchmentAreaForBusiness(businessResults[currentBusinessIndex]);
    } else {
        // Toutes les fiches ont été analysées, sauvegarder les résultats
        saveCatchmentAreaResults();
    }
}

// Sauvegarder les résultats de l'analyse
async function saveCatchmentAreaResults() {
    const results = {
        timestamp: new Date().toISOString(),
        analyses: catchmentAreaResults,
        summary: {
            totalBusinesses: catchmentAreaResults.length,
            averageRadius: catchmentAreaResults.reduce((sum, r) => sum + r.radius, 0) / catchmentAreaResults.length,
            totalPopulationReached: catchmentAreaResults.reduce((sum, r) => sum + r.totalPopulation, 0)
        }
    };
    
    // Envoyer au serveur pour sauvegarde
    try {
        const response = await fetch('/api/save-catchment-analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(results)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Analyse sauvegardée:', data.filename);
            // Afficher un résumé
            showCatchmentAreaSummary();
        } else {
            throw new Error('Erreur lors de la sauvegarde');
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        // Sauvegarder localement comme fallback
        const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zone_chalandise_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        // Afficher quand même le résumé
        showCatchmentAreaSummary();
    }
    
    // Mettre à jour les données globales après la sauvegarde
    updateGlobalCatchmentData();
}

// Afficher un résumé de l'analyse
function showCatchmentAreaSummary() {
    // Mettre à jour les données globales avant d'afficher le résumé
    updateGlobalCatchmentData();
    const summaryHtml = `
        <div class="catchment-summary">
            <h3>🎯 Analyse terminée !</h3>
            <p>${catchmentAreaResults.length} zone(s) de chalandise analysée(s)</p>
            <div class="summary-details">
                ${catchmentAreaResults.map((r, i) => `
                    <div class="summary-item">
                        <h4>${r.business.name} - ${r.business.city}</h4>
                        <p><strong>Centre:</strong> ${r.center ? `${r.center.name} (${r.center.commune})` : r.business.city}</p>
                        <p><strong>Rayon:</strong> ${r.radius} km</p>
                        <p><strong>Population totale:</strong> ${r.totalPopulation.toLocaleString('fr-CH')} habitants</p>
                        <p><strong>Nombre de communes:</strong> ${r.totalCommunes}</p>
                        <p><strong>Top 3 communes:</strong> ${r.topCommunes.slice(0, 3).map(c => c.name).join(', ')}</p>
                    </div>
                `).join('')}
            </div>
            <div class="summary-stats">
                <h4>📊 Statistiques globales</h4>
                <p><strong>Population totale touchée:</strong> ${catchmentAreaResults.reduce((sum, r) => sum + r.totalPopulation, 0).toLocaleString('fr-CH')} habitants</p>
                <p><strong>Rayon moyen:</strong> ${Math.round(catchmentAreaResults.reduce((sum, r) => sum + r.radius, 0) / catchmentAreaResults.length)} km</p>
            </div>
        </div>
    `;
    
    // Remplacer le contenu de l'écran actuel avec le bouton vers le portrait client
    document.querySelector('#screen-catchment-area .content').innerHTML = summaryHtml + `
        <button class="btn-primary" onclick="goToClientPortrait()">
            🤖 Suivant → Portrait Client AI
        </button>
        <button class="btn-secondary" onclick="downloadCatchmentAnalysis()">
            📥 Télécharger l'analyse
        </button>
    `;
}

// Télécharger l'analyse
function downloadCatchmentAnalysis() {
    const results = {
        timestamp: new Date().toISOString(),
        analyses: catchmentAreaResults,
        summary: {
            totalBusinesses: catchmentAreaResults.length,
            averageRadius: catchmentAreaResults.reduce((sum, r) => sum + r.radius, 0) / catchmentAreaResults.length,
            totalPopulationReached: catchmentAreaResults.reduce((sum, r) => sum + r.totalPopulation, 0)
        }
    };
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zone_chalandise_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

// Stocker les résultats pour les utiliser dans le portrait client
window.catchmentAreaResults = catchmentAreaResults;

// Fonction pour mettre à jour les données globales
function updateGlobalCatchmentData() {
    if (catchmentAreaResults && catchmentAreaResults.length > 0) {
        window.catchmentAreaData = {
            analyses: catchmentAreaResults.map(r => ({
                businessName: r.business.name,
                locationName: r.business.city,
                radius: r.radius,
                totalPopulation: r.totalPopulation,
                topCommunes: r.topCommunes.map(c => ({
                    nom: c.name,
                    habitants: c.population
                }))
            }))
        };
        console.log('Données de zone de chalandise mises à jour:', window.catchmentAreaData);
    }
}

// Appeler la fonction pour mettre à jour
updateGlobalCatchmentData();
