const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const csv = require('csv-parse');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3006;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Serve translations
app.get('/api/translations/:lang', (req, res) => {
    const lang = req.params.lang;
    const translationPath = path.join(__dirname, 'locales', `${lang}.json`);
    
    if (fs.existsSync(translationPath)) {
        res.json(require(translationPath));
    } else {
        res.status(404).json({ error: 'Translation not found' });
    }
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Scrapi server is running',
        version: '3006',
        timestamp: new Date().toISOString()
    });
});

// Basic info endpoint
app.post('/info', async (req, res) => {
    const { url, socketId } = req.body;
    
    try {
        // Emit start event
        if (socketId) {
            io.to(socketId).emit('analyze-start', { message: 'Démarrage de l\'analyse...' });
        }
        
        // Simple site analysis
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        const title = $('title').text() || 'Sans titre';
        
        // Simulate progress
        if (socketId) {
            io.to(socketId).emit('analyze-progress', {
                visited: 1,
                validPages: 1,
                total: 1,
                progress: 50,
                currentUrl: url
            });
            
            setTimeout(() => {
                io.to(socketId).emit('analyze-complete', {
                    pages: 1,
                    tree: [url]
                });
            }, 1000);
        }
        
        res.json({
            pages: 1,
            tree: [url],
            title: title,
            baseUrl: url
        });
        
    } catch (error) {
        console.error('Error analyzing site:', error);
        if (socketId) {
            io.to(socketId).emit('analyze-error', { error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

// Start scraping endpoint
app.post('/start', async (req, res) => {
    const { url, downloadAll } = req.body;
    
    try {
        // Create downloads directory
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const domain = new URL(url).hostname;
        const downloadPath = path.join(__dirname, 'downloads', domain, timestamp);
        
        if (!fs.existsSync(downloadPath)) {
            fs.mkdirSync(downloadPath, { recursive: true });
        }
        
        // Simulate scraping process
        setTimeout(() => {
            io.emit('log', 'Démarrage du téléchargement...');
            io.emit('progress', 25);
        }, 500);
        
        setTimeout(() => {
            io.emit('log', `Téléchargement de ${url}`);
            io.emit('progress', 50);
        }, 1000);
        
        setTimeout(() => {
            io.emit('log', 'Page sauvegardée: index.html');
            io.emit('progress', 75);
        }, 1500);
        
        setTimeout(() => {
            io.emit('log', 'Scraping terminé!');
            io.emit('progress', 100);
            io.emit('done', {
                pages: 1,
                images: downloadAll ? 0 : 0,
                totalSize: '2.5 KB',
                downloadPath: downloadPath
            });
        }, 2000);
        
        res.json({ status: 'started', downloadPath });
        
    } catch (error) {
        console.error('Error starting scraping:', error);
        res.status(500).json({ error: error.message });
    }
});

// Google Business search endpoint
app.post('/google/search', async (req, res) => {
    const { websiteUrl, location, socketId } = req.body;
    
    try {
        // Simulate Google Business search
        const mockResults = [
            {
                name: 'Entreprise Example',
                address: '123 Rue Example, 1000 Lausanne, Suisse',
                phone: '+41 21 123 45 67',
                website: websiteUrl,
                rating: 4.5,
                totalRatings: 25,
                photos: []
            }
        ];
        
        if (socketId) {
            io.to(socketId).emit('google-search-start', { message: 'Recherche en cours...' });
            setTimeout(() => {
                io.to(socketId).emit('google-search-complete', { total: mockResults.length });
            }, 1000);
        }
        
        res.json({ results: mockResults });
        
    } catch (error) {
        console.error('Error searching Google Business:', error);
        res.status(500).json({ error: error.message });
    }
});

// Catchment area analysis endpoint
app.post('/api/analyze-catchment-area', async (req, res) => {
    const { locality, radius } = req.body;
    
    try {
        // Mock catchment area data
        const mockData = {
            totalPopulation: Math.floor(Math.random() * 500000) + 100000,
            totalCommunes: Math.floor(Math.random() * 50) + 20,
            center: { name: locality, commune: locality },
            topCommunes: [
                { name: 'Lausanne', canton: 'VD', population: 144160, distance: 15 },
                { name: 'Montreux', canton: 'VD', population: 26574, distance: 25 },
                { name: 'Vevey', canton: 'VD', population: 19827, distance: 20 },
                { name: 'Aigle', canton: 'VD', population: 10500, distance: 10 },
                { name: 'Bex', canton: 'VD', population: 7200, distance: 8 },
                { name: 'Ollon', canton: 'VD', population: 7100, distance: 12 }
            ]
        };
        
        res.json(mockData);
        
    } catch (error) {
        console.error('Error analyzing catchment area:', error);
        res.status(500).json({ error: error.message });
    }
});

// Client portrait endpoint
app.post('/api/create-client-portrait', async (req, res) => {
    const { downloadDir, socketId } = req.body;
    
    try {
        if (socketId) {
            io.to(socketId).emit('portrait-start', { message: 'Démarrage de l\'analyse...' });
            
            // Simulate progress
            setTimeout(() => {
                io.to(socketId).emit('portrait-progress', {
                    step: 'preparing',
                    progress: 25
                });
            }, 500);
            
            setTimeout(() => {
                io.to(socketId).emit('portrait-progress', {
                    step: 'analyzing',
                    progress: 75
                });
            }, 1500);
            
            setTimeout(() => {
                const mockPortrait = {
                    informations_client: {
                        raison_sociale: 'Entreprise Example SA',
                        site_web: 'https://example.com',
                        annee_fondation: 2010,
                        nombre_employes: 25,
                        certificats_diplomes: ['ISO 9001'],
                        nbr_apprentis: 2,
                        nbr_fiches_google: 1,
                        nombre_total_avis: 25,
                        note_globale: 4.5,
                        type_clientele: 'B2B/B2C',
                        services: [
                            { nom: 'Service 1', description: 'Description du service 1' },
                            { nom: 'Service 2', description: 'Description du service 2' }
                        ],
                        texte_presentation: 'Entreprise spécialisée dans...',
                        texte_historique: 'Fondée en 2010...',
                        valeurs: ['Qualité', 'Innovation', 'Service client']
                    },
                    metadata: {
                        date_analyse: new Date().toISOString(),
                        sources_analysees: ['1 page web', '1 fiche Google Business'],
                        taux_completude: 85
                    }
                };
                
                io.to(socketId).emit('portrait-progress', {
                    step: 'completed',
                    progress: 100,
                    completeness: 85
                });
                
                io.to(socketId).emit('portrait-complete', {
                    portrait: mockPortrait,
                    filename: `portrait_client_${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
                    completeness: 85
                });
            }, 2500);
        }
        
        res.json({ status: 'started' });
        
    } catch (error) {
        console.error('Error creating client portrait:', error);
        if (socketId) {
            io.to(socketId).emit('portrait-error', { error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

// Keyword research endpoint
app.post('/api/keyword-research', async (req, res) => {
    const { services, locations, businessLocations, socketId } = req.body;
    
    try {
        // Mock keyword data
        const mockKeywords = [
            {
                keyword: 'service professionnel',
                service: services[0]?.nom || 'Service général',
                avgMonthlySearches: 1200,
                cpc: '2.50',
                competition: 'MEDIUM',
                competitionLevel: 'Moyenne'
            },
            {
                keyword: 'entreprise locale',
                service: services[0]?.nom || 'Service général',
                avgMonthlySearches: 800,
                cpc: '1.80',
                competition: 'LOW',
                competitionLevel: 'Faible'
            }
        ];
        
        if (socketId) {
            io.to(socketId).emit('keyword-progress', {
                progress: 50,
                message: 'Analyse des mots-clés...'
            });
            
            setTimeout(() => {
                io.to(socketId).emit('keyword-progress', {
                    progress: 100,
                    message: 'Recherche terminée'
                });
                
                io.to(socketId).emit('keyword-complete', {
                    keywords: mockKeywords,
                    message: 'Données simulées utilisées pour la démonstration'
                });
            }, 1000);
        }
        
        res.json({ keywords: mockKeywords });
        
    } catch (error) {
        console.error('Error in keyword research:', error);
        res.status(500).json({ error: error.message });
    }
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.emit('socket-connected', { socketId: socket.id });
    
    socket.on('test-connection', (data) => {
        socket.emit('test-connection', { received: data, timestamp: new Date().toISOString() });
    });
    
    socket.on('test-analyze', (data) => {
        socket.emit('analyze-start', { message: 'Test analyse démarrée' });
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += 20;
            socket.emit('analyze-progress', {
                progress,
                visited: progress / 20,
                total: 5
            });
            
            if (progress >= 100) {
                clearInterval(interval);
                socket.emit('analyze-complete', { pages: 5 });
            }
        }, 500);
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Scrapi server running on port ${PORT}`);
    console.log(`📱 Access the app at: http://localhost:${PORT}`);
    console.log(`🔧 Version: 3006`);
});

module.exports = { app, server, io };