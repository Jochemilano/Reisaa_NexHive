
#diagrama
index.js       --> renderiza <App />
App.js          --> contiene <AppRouter />
AppRouter.jsx   --> define todas las rutas
pages/Home.jsx  --> página específica
components/    --> componentes que usan las páginas

#folders
Components-> los componentes reutilizables
pages->paginas enteras, donde puedes poner los componentes reutilizables
router-> solo un archivo para manejar las rutas de las paginas, y se manda a app.js
hooks->imegenes, audios y contenido
services->logica externa APIs, Firebase, etc,
utils->funciones utiles de procesamiento

#css
index.css(Reset, html, body) no lo vuelvas a tocar
App.css(variables, tema, layout general)
Páginas y componentes (Home.css,Login.css,Navbar.css)

#frontend
npm install react-router-dom
----
npm install 
---
npm install react-big-calendar date-fns
---
npm install react-icons
---
npm install socket.io-client
---
npm install simple-peer

#backend
crear /backend en raiz
npm init -y
dir(debe estar package.json)
npm install express mysql2 
npm list mysql2
---
npm install jsonwebtoken
---
npm install socket.io