// Socket.io connection
const socket = io();

// État global
let currentUrl = '';
let siteInfo = null;
let fichesList = [];
let fichesDetails = [];
let enrichedData = [];
let selectedCompany = null;
let socketId = null;
let socketConnected = false;
let currentDownloadPath = ''; // Pour Google Business

// Fonction pour aller à l'écran Google Business (définie ici pour éviter les erreurs)
function goToGoogleBusiness() {
    if (currentUrl) {
        goToScreen('screen-google-business');
    }
}

// Fonction pour aller à l'analyse de zone de chalandise
function goToCatchmentAreaAnalysis() {
    // Cette fonction est implémentée dans catchment-area.js
    if (typeof window.goToCatchmentAreaAnalysis === 'function') {
        window.goToCatchmentAreaAnalysis();
    }
}

// Stocker l'ID du socket quand connecté
socket.on('connect', () => {
    socketId = socket.id;
    socketConnected = true;
    console.log('Socket connecté avec ID:', socketId);
});

socket.on('disconnect', () => {
    socketConnected = false;
    console.log('Socket déconnecté');
});

socket.on('socket-connected', (data) => {
    socketId = data.socketId;
    console.log('Socket ID reçu du serveur:', socketId);
});

// Navigation
function goToScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Analyse du site avec progression
async function analyzeWebsite() {
    const url = document.getElementById('urlInput').value.trim();
    
    if (!url || !url.startsWith('http')) {
        alert(t('screens.url.errors.invalidUrl'));
        return;
    }
    
    // Attendre que le socket soit connecté
    if (!socketConnected || !socketId) {
        console.log('En attente de connexion Socket.io...');
        // Réessayer après un court délai
        setTimeout(() => analyzeWebsite(), 500);
        return;
    }
    
    currentUrl = url;
    goToScreen('screen-info');
    
    // Afficher la jauge de progression
    const progressContainer = document.getElementById('analyzeProgressContainer');
    const analyzeStatus = document.getElementById('analyzeStatus');
    const infoDiv = document.getElementById('siteInfo');
    const treeDiv = document.getElementById('siteTree');
    
    progressContainer.style.display = 'block';
    analyzeStatus.style.display = 'block';
    infoDiv.style.display = 'none';
    treeDiv.style.display = 'none';
    
    // Initialiser la jauge
    updateAnalyzeProgress(0);
    document.getElementById('analyzeMessage').textContent = t('screens.analysis.status.starting');
    document.getElementById('analyzeDetails').textContent = '';
    
    try {
        const response = await fetch('/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                url,
                socketId: socket.id // Envoyer l'ID du socket pour la progression
            })
        });
        
        if (!response.ok) throw new Error('Erreur lors de l\'analyse');
        
        siteInfo = await response.json();
        
        // Masquer la progression et afficher les résultats
        setTimeout(() => {
            progressContainer.style.display = 'none';
            analyzeStatus.style.display = 'none';
            infoDiv.style.display = 'block';
            treeDiv.style.display = 'block';
            
            // Afficher les résultats avec les statistiques de filtrage
            let statsHtml = `
                <p><strong>${t('screens.analysis.results.pagesFound')}</strong> ${siteInfo.pages}</p>
                <p><strong>${t('screens.analysis.results.baseUrl')}</strong> ${url}</p>
            `;
            
            // Ajouter les statistiques de filtrage si disponibles
            if (siteInfo.skipped) {
                const totalSkipped = Object.values(siteInfo.skipped).reduce((a, b) => a + b, 0);
                statsHtml += `
                    <div class="filter-stats" style="margin-top: 15px;">
                        <h4>Statistiques de filtrage</h4>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <span class="stat-label">Pages HTML valides</span>
                                <span class="stat-value">${siteInfo.pages}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Total URLs visitées</span>
                                <span class="stat-value">${siteInfo.totalVisited || siteInfo.pages}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Images ignorées</span>
                                <span class="stat-value">${siteInfo.skipped.images || 0}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Documents ignorés</span>
                                <span class="stat-value">${siteInfo.skipped.documents || 0}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Médias ignorés</span>
                                <span class="stat-value">${siteInfo.skipped.media || 0}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Total filtré</span>
                                <span class="stat-value">${totalSkipped}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            infoDiv.innerHTML = statsHtml;
            
            // Afficher l'arborescence
            treeDiv.innerHTML = `<strong>${t('screens.analysis.results.treeTitle')}</strong><br>` + 
                siteInfo.tree.map(page => {
                    const path = page.replace(url, '');
                    const depth = (path.match(/\//g) || []).length;
                    return '  '.repeat(depth) + '├ ' + (path || '/');
                }).join('<br>');
        }, 500);
            
    } catch (error) {
        console.error('Erreur:', error);
        progressContainer.style.display = 'none';
        analyzeStatus.style.display = 'none';
        infoDiv.style.display = 'block';
        infoDiv.innerHTML = `<p style="color: red;">❌ Erreur: ${error.message}</p>`;
    }
}

// Démarrer le scraping
async function startScraping() {
    goToScreen('screen-progress');
    
    const downloadImages = document.getElementById('downloadImages').checked;
    
    // Réinitialiser la progression
    updateProgress(0);
    document.getElementById('logs').innerHTML = '';
    
    try {
        const response = await fetch('/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                url: currentUrl, 
                downloadAll: downloadImages 
            })
        });
        
        if (!response.ok) throw new Error('Erreur lors du démarrage');
        
    } catch (error) {
        console.error('Erreur:', error);
        addLog(`❌ Erreur: ${error.message}`);
    }
}

// Rechercher des fiches
async function searchFiches() {
    goToScreen('screen-fiches');
    
    const listDiv = document.getElementById('fichesList');
    listDiv.innerHTML = '<div class="loading">Recherche de fiches en cours...</div>';
    
    try {
        const response = await fetch('/fiches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ baseUrl: currentUrl })
        });
        
        if (!response.ok) throw new Error('Erreur lors de la recherche');
        
        const data = await response.json();
        fichesList = data.ficheLinks || [];
        
        if (fichesList.length === 0) {
            listDiv.innerHTML = '<p>Aucune fiche trouvée sur ce site.</p>';
        } else {
            listDiv.innerHTML = `
                <p><strong>${fichesList.length} fiches trouvées:</strong></p>
                ${fichesList.map((url, index) => `
                    <div class="fiche-item" onclick="toggleFiche(${index})">
                        ${url}
                    </div>
                `).join('')}
            `;
        }
        
    } catch (error) {
        console.error('Erreur:', error);
        listDiv.innerHTML = `<p style="color: red;">❌ Erreur: ${error.message}</p>`;
    }
}

// Sélectionner/désélectionner une fiche
function toggleFiche(index) {
    const item = document.querySelectorAll('.fiche-item')[index];
    item.classList.toggle('selected');
}

// Extraire les détails des fiches
async function extractFichesDetails() {
    const selectedFiches = [];
    document.querySelectorAll('.fiche-item.selected').forEach(item => {
        selectedFiches.push(item.textContent.trim());
    });
    
    if (selectedFiches.length === 0) {
        alert('Veuillez sélectionner au moins une fiche');
        return;
    }
    
    goToScreen('screen-fiche-details');
    
    const detailsDiv = document.getElementById('fichesDetails');
    detailsDiv.innerHTML = '<div class="loading">Extraction des détails en cours...</div>';
    
    try {
        const response = await fetch('/fiches/details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ficheLinks: selectedFiches,
                downloadAll: document.getElementById('downloadImages').checked
            })
        });
        
        if (!response.ok) throw new Error('Erreur lors de l\'extraction');
        
        const data = await response.json();
        fichesDetails = data.results || [];
        enrichedData = data.results || []; // Stocker aussi pour l'enrichissement
        
        displayFichesDetails();
        
    } catch (error) {
        console.error('Erreur:', error);
        detailsDiv.innerHTML = `<p style="color: red;">❌ Erreur: ${error.message}</p>`;
    }
}

// Afficher les détails des fiches
function displayFichesDetails() {
    const detailsDiv = document.getElementById('fichesDetails');
    
    detailsDiv.innerHTML = fichesDetails.map((fiche, index) => `
        <div class="fiche-detail">
            <h3>${fiche.nom || 'Sans nom'}</h3>
            <div class="detail-row">
                <span class="detail-label">Domaine:</span>
                <span class="detail-value">${fiche.domaine || 'Non spécifié'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Téléphone:</span>
                <span class="detail-value">${fiche.tel || 'Non disponible'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Adresse:</span>
                <span class="detail-value">${fiche.adresse || 'Non disponible'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Localité:</span>
                <span class="detail-value">${fiche.localite || 'Non disponible'}</span>
            </div>
            ${fiche.note ? `
                <div class="detail-row">
                    <span class="detail-label">Note moyenne:</span>
                    <span class="detail-value">${fiche.note}/5 (${fiche.avisCount || 0} avis)</span>
                </div>
            ` : ''}
            ${fiche.horaires ? `
                <div class="detail-row">
                    <span class="detail-label">Horaires:</span>
                    <span class="detail-value">${fiche.horaires}</span>
                </div>
            ` : ''}
            ${fiche.services && fiche.services.length > 0 ? `
                <div class="detail-row">
                    <span class="detail-label">Services:</span>
                    <span class="detail-value">${fiche.services.join(', ')}</span>
                </div>
            ` : ''}
            ${fiche.avis && fiche.avis.length > 0 ? `
                <div class="reviews-container">
                    <strong>Avis clients (${fiche.avis.length}):</strong>
                    ${fiche.avis.slice(0, 3).map(avis => `
                        <div class="review-item">
                            <div class="review-header">
                                <span>${avis.nomPrenom || 'Anonyme'}</span>
                                <span class="review-rating">${'★'.repeat(Math.round(avis.note))}</span>
                            </div>
                            <div>${avis.commentaire}</div>
                            <small>${avis.date || ''}</small>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Enrichir avec l'IA
function enrichWithAI() {
    goToScreen('screen-enrichment');
    displayEnrichedData();
}

// Afficher les données enrichies
function displayEnrichedData() {
    const enrichmentDiv = document.getElementById('enrichmentResults');
    
    enrichmentDiv.innerHTML = enrichedData.map((data, index) => `
        <div class="fiche-detail">
            <h3>${data.nom || 'Sans nom'}</h3>
            <div class="detail-row">
                <span class="detail-label">Raison sociale:</span>
                <span class="detail-value">${data.raisonSociale || data.nom}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Nombre d'employés:</span>
                <span class="detail-value">${data.nombreEmployes || 'Non disponible'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Année de fondation:</span>
                <span class="detail-value">${data.anneeFondation || 'Non disponible'}</span>
            </div>
            ${data.certifications && data.certifications.length > 0 ? `
                <div class="detail-row">
                    <span class="detail-label">Certifications:</span>
                    <span class="detail-value">${data.certifications.join(', ')}</span>
                </div>
            ` : ''}
            ${data.presentation ? `
                <div class="detail-row">
                    <span class="detail-label">Présentation:</span>
                    <span class="detail-value">${data.presentation}</span>
                </div>
            ` : ''}
            ${data.historique ? `
                <div class="detail-row">
                    <span class="detail-label">Historique:</span>
                    <span class="detail-value">${data.historique}</span>
                </div>
            ` : ''}
            ${data.valeurs && data.valeurs.length > 0 ? `
                <div class="detail-row">
                    <span class="detail-label">Valeurs:</span>
                    <span class="detail-value">${data.valeurs.join(', ')}</span>
                </div>
            ` : ''}
            <button class="btn-secondary" onclick="selectCompanyForPlan(${index})" style="margin-top: 15px;">
                Sélectionner pour le plan d'action
            </button>
        </div>
    `).join('');
}

// Sélectionner une entreprise pour le plan d'action
function selectCompanyForPlan(index) {
    selectedCompany = enrichedData[index];
    goToPlanAction();
}

// Aller au plan d'action
function goToPlanAction() {
    if (!selectedCompany && enrichedData.length > 0) {
        selectedCompany = enrichedData[0];
    }
    goToScreen('screen-plan');
}

// Générer le plan d'action
async function generatePlan() {
    if (!selectedCompany) {
        alert('Veuillez d\'abord sélectionner une entreprise');
        return;
    }
    
    const budget = document.getElementById('budgetInput').value;
    const startMonth = document.getElementById('startMonthInput').value;
    const endMonth = document.getElementById('endMonthInput').value;
    
    const planDiv = document.getElementById('planResults');
    planDiv.innerHTML = '<div class="loading">Génération du plan d\'action en cours...</div>';
    
    try {
        const response = await fetch('/plan-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                companyInfo: selectedCompany,
                budget,
                startMonth,
                endMonth
            })
        });
        
        if (!response.ok) throw new Error('Erreur lors de la génération');
        
        const data = await response.json();
        
        // Convertir le markdown en HTML
        planDiv.innerHTML = `<div class="markdown-content">${markdownToHtml(data.plan)}</div>`;
        
    } catch (error) {
        console.error('Erreur:', error);
        planDiv.innerHTML = `<p style="color: red;">❌ Erreur: ${error.message}</p>`;
    }
}

// Fonction pour mettre à jour l'affichage des statistiques de filtrage
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

// Socket.io events pour l'analyse
socket.on('analyze-start', (data) => {
    console.log('Reçu analyze-start:', data);
    document.getElementById('analyzeMessage').textContent = 'Démarrage de l\'analyse...';
    updateAnalyzeProgress(5);
    // Réinitialiser les stats
    updateFilterStats({ validPages: 0, visited: 0, skipped: { images: 0, documents: 0, media: 0, anchors: 0, other: 0 } });
});

socket.on('analyze-progress', (data) => {
    console.log('Reçu analyze-progress:', data);
    const { visited, validPages, remaining, total, progress, currentUrl, totalDiscovered } = data;
    
    // Calculer la progression basée sur les pages traitées (visited) par rapport au total découvert
    let realProgress = 0;
    if (totalDiscovered && totalDiscovered > 0) {
        realProgress = Math.round((visited / totalDiscovered) * 100);
    } else if (total && total > 0) {
        realProgress = Math.round((visited / total) * 100);
    } else {
        realProgress = progress; // Fallback sur l'ancienne valeur
    }
    
    // Utiliser la vraie progression pour la jauge
    updateAnalyzeProgress(realProgress);
    
    // Mettre à jour les statistiques de filtrage
    updateFilterStats(data);
    
    // Mettre à jour le message avec les vraies pages HTML et le total découvert
    if (data.skipped) {
        const totalSkipped = data.skipped.images + data.skipped.documents + 
                           data.skipped.media + data.skipped.anchors + data.skipped.other;
        document.getElementById('analyzeMessage').textContent = `Analyse en cours: ${validPages || 0} pages HTML trouvées sur ${totalDiscovered || visited} URLs découvertes`;
    } else {
        // Fallback si pas de données de filtrage
        document.getElementById('analyzeMessage').textContent = `Analyse en cours: ${validPages || visited} pages traitées`;
    }
    document.getElementById('analyzeDetails').textContent = `${remaining} URLs restantes à analyser (${visited}/${totalDiscovered || total} traitées)`;
});

socket.on('analyze-error', (data) => {
    console.error('Erreur d\'analyse:', data);
});

socket.on('analyze-complete', (data) => {
    console.log('Reçu analyze-complete:', data);
    updateAnalyzeProgress(100);
    
    // Mettre à jour les statistiques finales
    updateFilterStats(data);
    
    // Afficher un résumé complet
    if (data.skipped) {
        const totalSkipped = data.skipped.total || 
                           (data.skipped.images + data.skipped.documents + 
                            data.skipped.media + data.skipped.anchors + data.skipped.other);
        document.getElementById('analyzeMessage').textContent = `Analyse terminée: ${data.pages} pages HTML valides trouvées (${totalSkipped} URLs filtrées)`;
    } else {
        document.getElementById('analyzeMessage').textContent = t('screens.analysis.status.complete');
    }
    document.getElementById('analyzeDetails').textContent = t('screens.analysis.status.found', { pages: data.pages });
});

// Socket.io events pour le scraping
socket.on('log', (message) => {
    addLog(message);
});

socket.on('progress', (percent) => {
    updateProgress(percent);
});

socket.on('done', (results) => {
    addLog('✅ Scraping terminé!');
    setTimeout(() => {
        goToScreen('screen-results');
        displayResults(results);
    }, 1500);
});

// Ajouter un log
function addLog(message) {
    const logsDiv = document.getElementById('logs');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logsDiv.appendChild(entry);
    logsDiv.scrollTop = logsDiv.scrollHeight;
}

// Mettre à jour la progression de l'analyse
function updateAnalyzeProgress(percent) {
    const canvas = document.getElementById('analyzeProgressCanvas');
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
    
    // Arc de progression avec couleur dynamique
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (2 * Math.PI * percent / 100);
    
    // Couleur dynamique selon la progression
    let color = '#FF3B30'; // Rouge
    if (percent > 30) color = '#FF9500'; // Orange
    if (percent > 60) color = '#007AFF'; // Bleu
    if (percent > 90) color = '#34C759'; // Vert
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Texte
    document.getElementById('analyzeProgressPercent').textContent = percent + '%';
}

// Mettre à jour la progression du téléchargement
function updateProgress(percent) {
    const canvas = document.getElementById('progressCanvas');
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
    ctx.strokeStyle = '#007AFF';
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Texte
    document.getElementById('progressPercent').textContent = percent + '%';
}

// Afficher les résultats
function displayResults(results) {
    const resultsDiv = document.getElementById('resultsInfo');
    
    // Stocker le chemin de téléchargement pour Google Business
    if (results.downloadPath) {
        currentDownloadPath = results.downloadPath;
    }
    
    resultsDiv.innerHTML = `
        <h3>${t('screens.results.success')}</h3>
        <div class="detail-row">
            <span class="detail-label">${t('screens.results.details.pagesDownloaded')}</span>
            <span class="detail-value">${results.pages}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">${t('screens.results.details.imagesDownloaded')}</span>
            <span class="detail-value">${results.images}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">${t('screens.results.details.totalSize')}</span>
            <span class="detail-value">${results.totalSize}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">${t('screens.results.details.savePath')}</span>
            <span class="detail-value" style="word-break: break-all;">${results.downloadPath}</span>
        </div>
    `;
}

// Télécharger les résultats (placeholder)
function downloadResults() {
    alert(t('screens.results.alerts.savedOnServer'));
}

// Convertir markdown en HTML basique
function markdownToHtml(markdown) {
    return markdown
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Lists
        .replace(/^\* (.+)$/gim, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
        .replace(/^\d+\. (.+)$/gim, '<li>$1</li>')
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        // Wrap in paragraphs
        .replace(/^(.+)$/gim, '<p>$1</p>')
        // Tables (basic)
        .replace(/\|(.+)\|/g, function(match) {
            const cells = match.split('|').filter(c => c.trim());
            return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
        })
        .replace(/(<tr>.*<\/tr>)/s, '<table>$1</table>');
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Définir la date par défaut
    const now = new Date();
    document.getElementById('startMonthInput').value = now.toISOString().slice(0, 7);
    
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 12);
    document.getElementById('endMonthInput').value = endDate.toISOString().slice(0, 7);
});
