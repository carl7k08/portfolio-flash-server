require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ ERREUR : Aucune clé GEMINI_API_KEY trouvée dans le fichier .env");
  process.exit(1);
}

console.log("🔍 Connexion à Google en cours...");
console.log(`🔑 Clé utilisée : ${apiKey.substring(0, 8)}...`);

// On utilise l'API REST directe pour être sûr du résultat (pas de dépendance SDK)
fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      console.error("\n❌ ERREUR GOOGLE :", data.error.message);
      return;
    }
    
    console.log("\n✅ SUCCÈS ! Voici les modèles disponibles pour ton compte :\n");
    
    const models = data.models || [];
    // On filtre pour n'afficher que les modèles 'Gemini' (pas les trucs d'embedding bizarres)
    const geminiModels = models.filter(m => m.name.includes('gemini'));

    if (geminiModels.length === 0) {
      console.log("⚠️ Aucun modèle Gemini trouvé. Ta clé est peut-être restreinte.");
    }

    geminiModels.forEach(model => {
      // On nettoie le nom (on enlève "models/")
      const cleanName = model.name.replace('models/', '');
      console.log(`🔸 ${cleanName}`);
      console.log(`   (Versions: ${model.version || 'Standard'})`);
    });
    
    console.log("\n👉 Copie un de ces noms EXACTS et mets-le dans server.js !");
  })
  .catch(err => {
    console.error("\n❌ ERREUR RÉSEAU :", err.message);
    console.log("Vérifie ta connexion internet.");
  });