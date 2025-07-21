// Fix temporaire - ajouter l'écran dynamiquement s'il n'existe pas
if (!document.getElementById('screen-client-portrait')) {
    console.log('Création dynamique de l\'écran Portrait Client...');
    
    const portraitScreen = document.createElement('div');
    portraitScreen.id = 'screen-client-portrait';
    portraitScreen.className = 'screen';
    portraitScreen.innerHTML = `
        <div class="header">
            <button class="btn-back" onclick="goToScreen('screen-catchment-area')">← Retour</button>
            <h2>Portrait Client Intelligent</h2>
        </div>
        <div class="content">
            <div class="portrait-intro">
                <h3>Analyse complète avec Gemini AI</h3>
                <p>L'intelligence artificielle va analyser toutes les données collectées pour créer un portrait détaillé de l'entreprise.</p>
                
                <div class="portrait-info">
                    <h4>Informations qui seront extraites :</h4>
                    <ul class="portrait-fields-list">
                        <li>Raison sociale et informations légales</li>
                        <li>Année de fondation et historique</li>
                        <li>Nombre d'employés et apprentis</li>
                        <li>Certifications et diplômes</li>
                        <li>Services principaux (jusqu'à 6)</li>
                        <li>Valeurs de l'entreprise</li>
                        <li>Textes de présentation générés</li>
                    </ul>
                </div>
                
                <button id="startPortraitBtn" class="btn-primary" onclick="startPortraitAnalysis()">
                    🤖 Démarrer l'analyse AI
                </button>
            </div>
            
            <!-- Progression -->
            <div id="portraitProgressContainer" class="progress-container" style="display: none;">
                <canvas id="portraitProgressCanvas" width="200" height="200"></canvas>
                <div class="progress-text">
                    <span id="portraitProgressPercent">0%</span>
                </div>
                <p id="portraitStatus" class="status-message">Préparation de l'analyse...</p>
            </div>
            
            <!-- Résultats -->
            <div id="portraitResults" class="portrait-results" style="display: none;">
                <h3>Portrait Client Complété</h3>
                <div id="portraitContent" class="portrait-content">
                    <!-- Les résultats seront affichés ici -->
                </div>
                
                <div class="portrait-actions">
                    <button class="btn-secondary" onclick="downloadPortrait()">
                        📥 Télécharger JSON
                    </button>
                    <button class="btn-primary" onclick="goToScreen('screen-home')">
                        🏠 Nouveau scraping
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Ajouter l'écran au container
    const container = document.querySelector('.container');
    if (container) {
        container.appendChild(portraitScreen);
        console.log('✅ Écran Portrait Client créé dynamiquement');
    }
}
