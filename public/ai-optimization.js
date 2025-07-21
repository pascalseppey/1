// Gestion de l'optimisation IA des mots-clés
let aiOptimizationResults = null;

function addAIOptimizationButton() {
    // Trouver l'écran des résultats de mots-clés
    const keywordResultsScreen = document.getElementById('screen-keyword-results');
    if (!keywordResultsScreen) return;
    
    // Vérifier si le bouton existe déjà
    if (document.getElementById('ai-optimize-button')) return;
    
    // Trouver le conteneur des boutons
    const buttonsContainer = keywordResultsScreen.querySelector('.buttons-container');
    if (!buttonsContainer) return;
    
    // Créer le bouton d'optimisation IA
    const aiButton = document.createElement('button');
    aiButton.id = 'ai-optimize-button';
    aiButton.className = 'button button-primary';
    aiButton.innerHTML = `
        <i class="fas fa-brain"></i>
        Optimiser avec l'IA
    `;
    aiButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    aiButton.onclick = startAIOptimization;
    
    // Ajouter le bouton avant les autres
    buttonsContainer.insertBefore(aiButton, buttonsContainer.firstChild);
}

async function startAIOptimization() {
    if (!keywordResults || keywordResults.length === 0) {
        alert('Aucun résultat de mots-clés à optimiser');
        return;
    }
    
    // Afficher l'écran d'optimisation IA
    showScreen('screen-ai-optimization');
    
    // Préparer les données business
    const businessData = prepareBusinessDataForAI();
    const keywords = keywordResults.map(k => k.keyword);
    
    try {
        // Envoyer la requête
        const response = await fetch('/api/optimize-keywords-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                businessData,
                keywords,
                socketId: socket.id
            })
        });
        
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Erreur serveur');
        }
        
        // L'analyse continue en arrière-plan via WebSocket
        updateAIProgress(10, 'Connexion à OpenAI GPT-4...');
        
    } catch (error) {
        console.error('Erreur démarrage optimisation IA:', error);
        alert('Erreur : ' + error.message);
    }
}

function prepareBusinessDataForAI() {
    // Récupérer les données du portrait client et autres infos
    const portraitData = window.clientPortraitData || {};
    const googleData = window.googleBusinessData || [];
    const catchmentData = window.catchmentAreaData || {};
    
    return {
        name: portraitData.informations_client?.raison_sociale || 'Entreprise',
        domain: portraitData.informations_client?.domaine_activite || 'Rénovation piscine',
        services: portraitData.informations_client?.services || [],
        locations: catchmentData.top_communes || [],
        mainLocations: googleData.map(gb => gb.city).filter(Boolean),
        website: portraitData.informations_client?.site_web || '',
        googleRating: portraitData.informations_client?.note_globale || null
    };
}

function updateAIProgress(percent, message) {
    const progressBar = document.getElementById('ai-progress-bar');
    const progressText = document.getElementById('ai-progress-text');
    const progressMessage = document.getElementById('ai-progress-message');
    
    if (progressBar) progressBar.style.width = percent + '%';
    if (progressText) progressText.textContent = percent + '%';
    if (progressMessage) progressMessage.textContent = message;
}

function displayAIResults(results) {
    const resultsContainer = document.getElementById('ai-optimization-results');
    if (!resultsContainer) return;
    
    // Stocker les résultats
    aiOptimizationResults = results;
    
    let html = '<div class="ai-results">';
    
    // Section Analyse
    html += '<div class="ai-section">';
    html += '<h3><i class="fas fa-microscope"></i> Analyse de vos mots-clés</h3>';
    
    if (results.analysis) {
        html += '<div class="diagnostic-box">';
        html += `<h4>Diagnostic</h4>`;
        html += `<p>${results.analysis.diagnostic}</p>`;
        html += '</div>';
        
        if (results.analysis.opportunites && results.analysis.opportunites.length > 0) {
            html += '<div class="opportunities-box">';
            html += '<h4>Opportunités identifiées</h4>';
            html += '<ul>';
            results.analysis.opportunites.forEach(opp => {
                html += `<li>${opp}</li>`;
            });
            html += '</ul>';
            html += '</div>';
        }
        
        if (results.analysis.strategie) {
            html += '<div class="strategy-box">';
            html += '<h4>Stratégie recommandée</h4>';
            html += `<p>${results.analysis.strategie.approche}</p>`;
            if (results.analysis.strategie.focus_geographique) {
                html += '<p><strong>Focus géographique :</strong> ' + 
                    results.analysis.strategie.focus_geographique.join(', ') + '</p>';
            }
            html += '</div>';
        }
    }
    html += '</div>';
    
    // Section Mots-clés alternatifs avec volume
    if (results.analysis.alternatives_with_volume && results.analysis.alternatives_with_volume.length > 0) {
        html += '<div class="ai-section">';
        html += '<h3><i class="fas fa-key"></i> Mots-clés alternatifs avec du volume</h3>';
        html += '<div class="keywords-table">';
        html += '<table>';
        html += '<thead><tr><th>Mot-clé</th><th>Volume</th><th>CPC</th><th>Concurrence</th></tr></thead>';
        html += '<tbody>';
        
        results.analysis.alternatives_with_volume.slice(0, 20).forEach(kw => {
            html += '<tr>';
            html += `<td><strong>${kw.keyword}</strong></td>`;
            html += `<td>${kw.avgMonthlySearches}</td>`;
            html += `<td>${kw.cpcMin.toFixed(2)} - ${kw.cpcMax.toFixed(2)} CHF</td>`;
            html += `<td><span class="competition-${kw.competition.toLowerCase()}">${kw.competition}</span></td>`;
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        html += '</div>';
        html += '</div>';
    }
    
    // Section Recommandations
    if (results.recommendations && results.recommendations.recommandations) {
        html += '<div class="ai-section">';
        html += '<h3><i class="fas fa-lightbulb"></i> Recommandations stratégiques</h3>';
        
        results.recommendations.recommandations.forEach((rec, index) => {
            const priorityClass = rec.priorite === 'haute' ? 'high' : 
                                rec.priorite === 'moyenne' ? 'medium' : 'low';
            const budgetIcon = rec.budget_estime === 'gratuit' ? 'gift' :
                              rec.budget_estime === 'faible' ? 'dollar-sign' :
                              rec.budget_estime === 'moyen' ? 'coins' : 'money-bill-wave';
            
            html += '<div class="recommendation-card priority-' + priorityClass + '">';
            html += '<div class="rec-header">';
            html += `<h4>${index + 1}. ${rec.titre}</h4>`;
            html += `<span class="priority-badge ${priorityClass}">Priorité ${rec.priorite}</span>`;
            html += '</div>';
            
            html += `<p class="rec-description">${rec.description}</p>`;
            
            if (rec.actions && rec.actions.length > 0) {
                html += '<div class="rec-actions">';
                html += '<h5>Actions concrètes :</h5>';
                html += '<ul>';
                rec.actions.forEach(action => {
                    html += `<li><i class="fas fa-check"></i> ${action}</li>`;
                });
                html += '</ul>';
                html += '</div>';
            }
            
            html += '<div class="rec-footer">';
            html += `<span class="budget"><i class="fas fa-${budgetIcon}"></i> Budget ${rec.budget_estime}</span>`;
            html += `<span class="results">${rec.resultats_attendus}</span>`;
            html += '</div>';
            
            html += '</div>';
        });
        
        if (results.recommendations.conclusion) {
            html += '<div class="conclusion-box">';
            html += '<h4>Conclusion</h4>';
            html += `<p>${results.recommendations.conclusion}</p>`;
            html += '</div>';
        }
        
        html += '</div>';
    }
    
    html += '</div>';
    
    resultsContainer.innerHTML = html;
    
    // Afficher les boutons d'action
    document.getElementById('ai-results-actions').style.display = 'block';
}

// Gestion des événements Socket.io pour l'optimisation IA
if (typeof socket !== 'undefined') {
    socket.on('ai-analysis-start', (data) => {
        updateAIProgress(10, data.message);
    });
    
    socket.on('ai-analysis-progress', (data) => {
        updateAIProgress(data.progress, data.message);
    });
    
    socket.on('ai-optimization-complete', (data) => {
        updateAIProgress(100, 'Analyse terminée !');
        displayAIResults(data);
    });
    
    socket.on('ai-optimization-error', (data) => {
        console.error('Erreur optimisation IA:', data.error);
        alert('Erreur : ' + data.error);
        showScreen('screen-keyword-results');
    });
}

// Fonction pour télécharger les résultats
function downloadAIResults() {
    if (!aiOptimizationResults) return;
    
    const dataStr = JSON.stringify(aiOptimizationResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `optimisation_ia_mots_cles_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

// Fonction pour retourner aux résultats
function backToKeywordResults() {
    showScreen('screen-keyword-results');
}

// Ajouter le bouton quand les résultats de mots-clés sont affichés
document.addEventListener('keyword-results-displayed', () => {
    setTimeout(addAIOptimizationButton, 100);
});
