require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const archiver = require('archiver');
const multer = require('multer');
const path = require('path');

const app = express();
const port = 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

if (!process.env.GEMINI_API_KEY) {
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function cleanAndParseJSON(text) {
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  
  if (firstBrace === -1 || lastBrace === -1) throw new Error("Format JSON invalide");
  
  clean = clean.substring(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(clean);
  } catch (e) {
    try {
      const fixed = clean.replace(/,(\s*})/g, '$1');
      return JSON.parse(fixed);
    } catch (e2) {
      throw new Error(e.message);
    }
  }
}

app.post('/generate', upload.any(), async (req, res) => {
  let data;
  try {
    data = JSON.parse(req.body.portfolioData);
  } catch (e) {
    return res.status(400).json({ error: "Données invalides" });
  }

  const avatarFile = req.files.find(f => f.fieldname === 'avatar');
  const logoFile = req.files.find(f => f.fieldname === 'logoImage');
  
  let avatarPath = null;
  let logoPath = null;

  const safeName = (name) => name.replace(/[^a-zA-Z0-9.]/g, '_');

  if (avatarFile) {
    avatarPath = `images/avatar_${safeName(avatarFile.originalname)}`;
    data.avatar = avatarPath;
  }
  
  if (data.logoType === 'image' && logoFile) {
    logoPath = `images/logo_${safeName(logoFile.originalname)}`;
    data.logoPath = logoPath;
  }

  const MAX_RETRIES = 3;
  let attempt = 0;
  let success = false;
  let finalError = null;

  while (attempt < MAX_RETRIES && !success) {
    attempt++;
    console.log(`Tentative ${attempt}/${MAX_RETRIES}...`);

    try {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-pro",
        generationConfig: { temperature: 0.85 }
      });

      const prompt = `
        Tu es un Développeur Web Expert et membre du jury Awwwards.
        Génère un portfolio HTML/CSS/JS exceptionnel.

        1. IDENTITÉ & CONTENU :
        - Nom : ${data.fullName}
        - Titre : ${data.title}
        - Phrase d'accroche : "${data.tagline}" (H1 Impactant)
        - Bio : "${data.bio}" (Ton: ${data.tone}, Archétype: ${data.archetype}, Longueur: ${data.bioLength})
        - Localisation : ${data.location}
        - Statut : ${data.availability}
        - Langues : ${data.languages}
        - Avatar : ${avatarPath ? `UTILISE CETTE SOURCE EXACTE : <img src="${avatarPath}" alt="Profil">` : 'Utilise un placeholder Unsplash'}
        
        2. ARCHITECTURE & STRUCTURE :
        - Style Héro : ${data.heroStyle} (Alignement: ${data.heroAlign})
        - Navigation : ${data.navPosition} (Style liens: ${data.navLinkStyle})
        - Galerie Projets : ${data.galleryLayout} (Ratio: ${data.imageRatio}, Clic: ${data.projectClickAction})
        - Mise en page "À Propos" : ${data.aboutLayout}
        - Style Footer : ${data.footerStyle}

        3. DESIGN SYSTEM :
        - Thème : ${data.theme} (Nuance fond: ${data.bgShade})
        - Couleurs : Primaire ${data.primaryColor}, Secondaire ${data.secondaryColor}
        - Typographie : ${data.fontPairing} (Échelle: ${data.fontScale})
        - Formes : Radius ${data.radiusStyle} (${data.borderRadius}px), Bordures ${data.borderStyle}
        - Texture : Grain ${data.grainIntensity}%
        - Effets : Glassmorphism ${data.glassEffect ? 'OUI' : 'NON'}, Ombres ${data.shadow}

        4. EXPÉRIENCE & MOUVEMENT :
        - Intro/Loader : ${data.loaderStyle}
        - Curseur : ${data.cursorStyle} (Trail: ${data.cursorTrail})
        - Scroll : ${data.scrollType}
        - Animations Scroll : ${data.scrollAnimations}
        - Page 404 : ${data.page404}

        5. MODULES & CONTENU :
        - Compétences : Affichage=${data.skillsDisplay}, Couleur=${data.skillsColor}, Catégories=${data.skillsCategories.join(', ')}
        - Sections actives : ${JSON.stringify(data.sections)}
        - Modules actifs : ${JSON.stringify(data.modules)}
        - Newsletter : ${data.newsletter ? `OUI (Action: ${data.newsletterUrl})` : 'NON'}
        - CTA Principal : Type ${data.ctaType}, Texte "${data.ctaText}"
        - Méthode Contact : ${data.contactMethod}

        6. TECH & SEO :
        - SEO Mots-clés : ${data.seoKeywords}
        - SEO Description : ${data.seoDesc}
        - Favicon : ${data.favicon}
        - Titre Onglet : ${data.tabTitle}

        7. DATA :
        - Réseaux Sociaux : ${JSON.stringify(data.socials)}
        - Projets : ${JSON.stringify(data.projects)}

        INSTRUCTIONS TECHNIQUES STRICTES :
        1. Renvoie UNIQUEMENT un JSON brut : { "html": "...", "css": "...", "js": "..." }
        2. HTML5 Sémantique, W3C Valide.
        3. CSS3 Moderne avec Variables CSS (:root).
        4. JS ES6+ (Pas de jQuery).
        5. Importe Google Fonts et FontAwesome via CDN.
        6. Importe AOS (Animate On Scroll) via CDN si animations activées.
        7. IMPORTANT : Pour l'image de profil, utilise strictement src="${avatarPath || ''}" si une image est fournie.
        8. Il faut mettre des zones de texte avec un texte comme "a completer pour indiquer à l'utilisateur où est-ce qu'il peut rajouter du texte et sur quel theme il doit ajouter du texte pour avoir un portfolio parfait.
        9. Il faut obligatoirement mettre <link rel="stylesheet" href="style.css"> et <script src="script.js"></script> dans le html, c'est fondamental.
        10. fait que tout les boutons générés soient fonctionnels et si il le faut, ajoute des textes ou des cases à remplir ou a supprimer juste pour montrer que les boutons fonctionnent bien.

        INSTRUCTIONS SPÉCIFIQUES SUR LE LOGO DU SITE :
        Le client a choisi un logo de type : "${data.logoType}".
        - SI logoType est "emoji" : Utilise cet emoji : ${data.logoEmoji}. Affiche-le dans un <span> stylisé (taille, ombre).
        - SI logoType est "image" : Une image locale existe à "./${data.logoPath}". Utilise une balise <img> avec cette src exacte. Assure-toi que le CSS limite sa hauteur (ex: max-height: 50px) pour ne pas casser la navbar.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const code = cleanAndParseJSON(text);

      if (!code.html || !code.css) throw new Error("Code incomplet");

      const archive = archiver('zip', { zlib: { level: 9 } });
      res.attachment('portfolio_pro.zip');
      archive.pipe(res);

      archive.append(code.html, { name: 'index.html' });
      archive.append(code.css, { name: 'style.css' });
      archive.append(code.js || '', { name: 'script.js' });

      if (avatarFile) archive.append(avatarFile.buffer, { name: avatarPath });
      if (logoFile && data.logoType === 'image') archive.append(logoFile.buffer, { name: logoPath });

      await archive.finalize();
      success = true;

    } catch (error) {
      console.error(`Erreur ${attempt}:`, error.message);
      finalError = error;
    }
  }

  if (!success) {
    res.status(500).json({ error: "Échec de génération", details: finalError?.message });
  }
});

app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});