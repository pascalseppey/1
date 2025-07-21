// Module de gestion des traductions côté client
class Translator {
    constructor() {
        this.translations = {};
        this.currentLang = 'fr';
        this.loadTranslations();
    }

    async loadTranslations() {
        try {
            const response = await fetch(`/api/translations/${this.currentLang}`);
            if (response.ok) {
                this.translations = await response.json();
                this.updateUI();
            }
        } catch (error) {
            console.error('Erreur chargement traductions:', error);
            // Utiliser les traductions par défaut si erreur
            this.loadDefaultTranslations();
        }
    }

    loadDefaultTranslations() {
        // Traductions par défaut intégrées
        this.translations = {
            app: {
                name: "Scrapi",
                tagline: "Extraction intelligente de données web"
            },
            screens: {
                home: {
                    title: "Bienvenue sur Scrapi",
                    subtitle: "Analysez et enrichissez les données de n'importe quel site web avec l'IA",
                    buttons: {
                        start: "Démarrer le scraping"
                    }
                },
                url: {
                    title: "Entrez l'URL du site",
                    placeholder: "https://exemple.com",
                    options: {
                        downloadImages: "Télécharger les images"
                    },
                    buttons: {
                        next: "Suivant",
                        back: "Retour"
                    },
                    errors: {
                        invalidUrl: "Veuillez entrer une URL valide (commençant par http:// ou https://)"
                    }
                },
                analysis: {
                    title: "Analyse du site",
                    status: {
                        starting: "Démarrage de l'analyse...",
                        inProgress: "Analyse en cours: {{visited}} pages traitées",
                        remaining: "{{remaining}} pages restantes à analyser",
                        complete: "Analyse terminée!",
                        found: "{{pages}} pages trouvées",
                        checking: "Vérification du site..."
                    },
                    results: {
                        pagesFound: "Nombre de pages trouvées:",
                        baseUrl: "URL de base:",
                        treeTitle: "Arborescence (aperçu):"
                    },
                    buttons: {
                        download: "Télécharger les pages",
                        searchCards: "Rechercher des fiches",
                        back: "Retour"
                    },
                    errors: {
                        analysisError: "Erreur lors de l'analyse"
                    }
                },
                progress: {
                    title: "Téléchargement en cours",
                    logs: {
                        downloading: "📥 Téléchargement de {{url}}",
                        pageSaved: "✅ Page sauvegardée: {{filename}}",
                        imageDownloaded: "🖼️ Image téléchargée: {{filename}}",
                        imageError: "❌ Erreur image: {{src}}",
                        error: "❌ Erreur {{url}}: {{message}}",
                        complete: "✅ Scraping terminé!"
                    }
                },
                results: {
                    title: "Résultats",
                    success: "Scraping terminé avec succès!",
                    details: {
                        pagesDownloaded: "Pages téléchargées:",
                        imagesDownloaded: "Images téléchargées:",
                        totalSize: "Taille totale:",
                        savePath: "Dossier de sauvegarde:"
                    },
                    buttons: {
                        newScraping: "Nouveau scraping",
                        downloadResults: "Télécharger les résultats"
                    },
                    alerts: {
                        savedOnServer: "Les résultats ont été sauvegardés sur le serveur.\nVeuillez accéder au dossier indiqué pour récupérer les fichiers."
                    }
                },
                fiches: {
                    title: "Fiches trouvées",
                    status: {
                        searching: "Recherche de fiches en cours...",
                        found: "{{count}} fiches trouvées:",
                        notFound: "Aucune fiche trouvée sur ce site."
                    },
                    buttons: {
                        extract: "Extraire les détails",
                        back: "Retour"
                    },
                    errors: {
                        searchError: "Erreur lors de la recherche",
                        selectAtLeast: "Veuillez sélectionner au moins une fiche"
                    }
                },
                ficheDetails: {
                    title: "Détails des fiches",
                    status: {
                        extracting: "Extraction des détails en cours..."
                    },
                    labels: {
                        domain: "Domaine:",
                        phone: "Téléphone:",
                        address: "Adresse:",
                        locality: "Localité:",
                        rating: "Note moyenne:",
                        reviews: "avis",
                        hours: "Horaires:",
                        services: "Services:",
                        customerReviews: "Avis clients",
                        anonymous: "Anonyme"
                    },
                    defaults: {
                        unnamed: "Sans nom",
                        notSpecified: "Non spécifié",
                        notAvailable: "Non disponible"
                    },
                    buttons: {
                        enrichWithAI: "Enrichir avec l'IA",
                        selectForPlan: "Sélectionner pour le plan d'action",
                        back: "Retour"
                    },
                    errors: {
                        extractionError: "Erreur lors de l'extraction"
                    }
                },
                enrichment: {
                    title: "Enrichissement IA",
                    labels: {
                        legalName: "Raison sociale:",
                        employees: "Nombre d'employés:",
                        foundationYear: "Année de fondation:",
                        certifications: "Certifications:",
                        presentation: "Présentation:",
                        history: "Historique:",
                        values: "Valeurs:"
                    },
                    buttons: {
                        createActionPlan: "Créer un plan d'action",
                        back: "Retour"
                    }
                },
                actionPlan: {
                    title: "Plan d'action marketing",
                    form: {
                        monthlyBudget: "Budget mensuel (€)",
                        start: "Début",
                        end: "Fin"
                    },
                    buttons: {
                        generate: "Générer le plan",
                        back: "Retour"
                    },
                    status: {
                        generating: "Génération du plan d'action en cours..."
                    },
                    errors: {
                        selectCompany: "Veuillez d'abord sélectionner une entreprise",
                        generationError: "Erreur lors de la génération"
                    }
                }
            }
        };
        this.updateUI();
    }

    // Obtenir une traduction avec support des placeholders
    t(key, params = {}) {
        const keys = key.split('.');
        let value = this.translations;
        
        for (const k of keys) {
            if (value && value[k]) {
                value = value[k];
            } else {
                return key; // Retourner la clé si traduction non trouvée
            }
        }
        
        // Remplacer les placeholders {{variable}}
        if (typeof value === 'string') {
            return value.replace(/\{\{(\w+)\}\}/g, (match, param) => {
                return params[param] !== undefined ? params[param] : match;
            });
        }
        
        return value;
    }

    // Mettre à jour l'interface avec les traductions
    updateUI() {
        // Mettre à jour tous les éléments avec data-i18n
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            if (translation && translation !== key) {
                element.textContent = translation;
            }
        });

        // Mettre à jour les placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            if (translation && translation !== key) {
                element.placeholder = translation;
            }
        });

        // Mettre à jour les attributs title
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            const translation = this.t(key);
            if (translation && translation !== key) {
                element.title = translation;
            }
        });
    }

    // Formater un message avec des paramètres
    format(key, params = {}) {
        return this.t(key, params);
    }
}

// Instance globale du traducteur
const translator = new Translator();

// Fonction helper globale
function t(key, params) {
    return translator.t(key, params);
}

// Exporter pour utilisation dans d'autres scripts
window.translator = translator;
window.t = t;
