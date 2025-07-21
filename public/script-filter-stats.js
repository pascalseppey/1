// Script amélioré pour afficher les statistiques de filtrage

// Fonction pour mettre à jour l'affichage des statistiques
function updateFilterStats(data) {
    const statsContainer = document.getElementById('filterStats');
    if (!statsContainer) {
        // Créer le conteneur s'il n'existe pas
        const analyzeStatus = document.getElementById('analyzeStatus');
        if (analyzeStatus) {
            const statsDiv = document.createElement('div');
            statsDiv.id = 'filterStats';
            statsDiv.className = 'filter-stats';
            analyzeStatus.appendChild(statsDiv);
        }
    }
    
    // Mettre à jour les statistiques
    const stats = `
        <div class="stats-grid">
            <div class="stat-item">
                <span class="stat-label">Pages HTML valides:</span>
                <span class="stat-value">${data.validPages || 0}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">URLs visitées:</span>
                <span class="stat-value">${data.visited || 0}</span>
            </div>
            ${data.skipped ? `
                <div class="stat-item">
                    <span class="stat-label">Images ignorées:</span>
                    <span class="stat-value">${data.skipped.images || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Documents ignorés:</span>
                    <span class="stat-value">${data.skipped.documents || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Médias ignorés:</span>
                    <span class="stat-value">${data.skipped.media || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Ancres ignorées:</span>
                    <span class="stat-value">${data.skipped.anchors || 0}</span>
                </div>
            ` : ''}
        </div>
    `;
    
    const statsEl = document.getElementById('filterStats');
    if (statsEl) {
        statsEl.innerHTML = stats;
    }
}

// Modifier la fonction existante pour gérer les événements Socket.io
function setupSocketListeners() {
    // Conserver les listeners existants
    const originalOnAnalyzeProgress = socket._callbacks['$analyze-progress'];
    const originalOnAnalyzeComplete = socket._callbacks['$analyze-complete'];
    
    // Ajouter notre logique
    socket.on('analyze-progress', (data) => {
        // Appeler le handler original s'il existe
        if (originalOnAnalyzeProgress) {
            originalOnAnalyzeProgress[0](data);
        }
        
        // Mettre à jour les statistiques de filtrage
        updateFilterStats(data);
        
        // Mettre à jour le message avec plus de détails
        const analyzeMessage = document.getElementById('analyzeMessage');
        if (analyzeMessage && data.skipped) {
            const totalSkipped = data.skipped.images + data.skipped.documents + 
                               data.skipped.media + data.skipped.anchors + data.skipped.other;
            analyzeMessage.textContent = `Analyse en cours: ${data.validPages} pages HTML trouvées sur ${data.visited} URLs visitées (${totalSkipped} ignorées)`;
        }
    });
    
    socket.on('analyze-complete', (data) => {
        // Appeler le handler original s'il existe
        if (originalOnAnalyzeComplete) {
            originalOnAnalyzeComplete[0](data);
        }
        
        // Mettre à jour les statistiques finales
        updateFilterStats(data);
        
        // Afficher un résumé
        const analyzeMessage = document.getElementById('analyzeMessage');
        if (analyzeMessage && data.skipped) {
            const totalSkipped = data.skipped.total || 
                               (data.skipped.images + data.skipped.documents + 
                                data.skipped.media + data.skipped.anchors + data.skipped.other);
            analyzeMessage.textContent = `Analyse terminée: ${data.pages} pages HTML valides trouvées (${totalSkipped} URLs filtrées)`;
        }
    });
}

// Appeler cette fonction après la connexion Socket.io
socket.on('connect', () => {
    console.log('Socket connecté, configuration des listeners de filtrage');
    setupSocketListeners();
});

// Ajouter les styles CSS pour les statistiques
const style = document.createElement('style');
style.textContent = `
.filter-stats {
    margin-top: 20px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e9ecef;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px;
    background: white;
    border-radius: 6px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.stat-label {
    font-size: 12px;
    color: #6c757d;
    margin-bottom: 5px;
}

.stat-value {
    font-size: 20px;
    font-weight: bold;
    color: #007bff;
}
`;
document.head.appendChild(style);
