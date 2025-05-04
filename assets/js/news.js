// Configuración general
const NEWSDATA_API_KEY = 'pub_847922dd8d76dc99d8836daaa0a24981ade1f';
const DAYS_AGO = 3;
const MAX_ARTICLES = 4;

const CACHE_KEY = 'importacion_news_cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 3 horas

// Utilidades de caché
const NewsCache = {
    getFromCache: function() {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const { timestamp, data } = JSON.parse(raw);
        if (Date.now() - timestamp > CACHE_EXPIRY) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        console.log('Usando caché');
        return data;
    },
    saveToCache: function(data) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data
        }));
    }
};

function getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().slice(0, 10);
}

async function fetchAndDisplayNews() {
    try {
        const cachedNews = NewsCache.getFromCache();
        if (cachedNews) {
            displayNews(cachedNews);
            return;
        }

        console.log('Obteniendo noticias frescas de la API...');
        const q    = 'importación OR shipping OR "comercio marítimo" OR economía OR aranceles';

        const url = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}` +
            `&q=${q}&language=es`;


        console.log('URL generada:', url);

        const response = await fetch(url);

        if (!response.ok) {
            const errorBody = await response.text(); // capturamos el texto completo
            console.error(`❌ ERROR ${response.status}: ${response.statusText}`);
            console.error(`🧾 Respuesta de la API:\n${errorBody}`);
            throw new Error(`Newsdata.io devolvió ${response.status}`);
        }

        const data = await response.json();

        if (!data.results || !Array.isArray(data.results)) {
            console.warn('⚠️ Formato inesperado en respuesta:');
            console.dir(data);
            throw new Error('Respuesta inesperada de Newsdata.io');
        }

        NewsCache.saveToCache(data.results);
        displayNews(data.results);

    } catch (error) {
        console.error('❗ Error en fetchAndDisplayNews:', error);
        const oldCache = localStorage.getItem(CACHE_KEY);
        if (oldCache) {
            console.log('♻️ Usando caché antigua como respaldo');
            const cacheItem = JSON.parse(oldCache);
            displayNews(cacheItem.data);
        }
    }
}


function displayNews(articles) {
    const featuredArticle = articles[0];
    const otherArticles = articles.slice(1);

    // Mejorar la noticia destacada con un diseño más llamativo
    const leftImageContainer = document.querySelector('.news-image');
    if (leftImageContainer && featuredArticle) {
        // Determinar si hay imagen disponible
        const hasImage = featuredArticle.image_url && featuredArticle.image_url.trim() !== '';
        
        leftImageContainer.innerHTML = `
            <div class="featured-article ${!hasImage ? 'no-image' : ''}">
                ${hasImage ? `
                <div class="featured-image">
                    <a href="${featuredArticle.link}" target="_blank">
                        <img src="${featuredArticle.image_url}" alt="${featuredArticle.title}">
                        <div class="overlay">
                            <div class="featured-badge">DESTACADO</div>
                        </div>
                    </a>
                </div>
                ` : `
                <div class="featured-badge-no-image">DESTACADO</div>
                `}
                <div class="featured-info">
                    <div class="inner-content">
                        <ul class="meta-info">
                            <li><i class="fa fa-calendar"></i> ${formatDate(featuredArticle.pubDate)}</li>
                            <li><i class="fa fa-globe"></i> Comercio Internacional</li>
                            <li><i class="fa fa-folder"></i> Noticias</li>
                        </ul>
                        <a href="${featuredArticle.link}" target="_blank">
                            <h3 class="featured-title">${featuredArticle.title}</h3>
                        </a>
                        <p class="featured-desc">${truncateText(featuredArticle.description, 150)}</p>
                        <div class="main-blue-button pulse-button">
                            <a href="${featuredArticle.link}" target="_blank">Leer Más</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Cambiar las noticias secundarias para que aparezcan en filas (una al lado de otra)
    const newsGrid = document.querySelector('.news-grid');
    if (newsGrid) {
        newsGrid.innerHTML = '';
        
        // Agrupar las noticias en filas de 2
        for (let i = 0; i < otherArticles.length; i += 2) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'news-row';
            
            // Agregar primera noticia de la fila
            const article1 = otherArticles[i];
            const hasImage1 = article1.image_url && article1.image_url.trim() !== '';
            
            const newsItem1 = document.createElement('div');
            newsItem1.className = 'news-item';
            newsItem1.innerHTML = `
                <div class="news-card ${!hasImage1 ? 'no-image' : ''}">
                    ${hasImage1 ? `
                    <div class="news-image-container">
                        <a href="${article1.link}" target="_blank">
                            <img src="${article1.image_url}" alt="${article1.title}">
                        </a>
                    </div>
                    ` : ''}
                    <div class="news-content">
                        <span class="news-date"><i class="fa fa-calendar"></i> ${formatDate(article1.pubDate)}</span>
                        <a href="${article1.link}" target="_blank">
                            <h4 class="news-title">${article1.title}</h4>
                        </a>
                        <p class="news-excerpt">${truncateText(article1.description, 80)}</p>
                        <a href="${article1.link}" target="_blank" class="read-more">Leer más <i class="fa fa-arrow-right"></i></a>
                    </div>
                </div>
            `;
            rowDiv.appendChild(newsItem1);
            
            // Agregar segunda noticia de la fila (si existe)
            if (i + 1 < otherArticles.length) {
                const article2 = otherArticles[i + 1];
                const hasImage2 = article2.image_url && article2.image_url.trim() !== '';
                
                const newsItem2 = document.createElement('div');
                newsItem2.className = 'news-item';
                newsItem2.innerHTML = `
                    <div class="news-card ${!hasImage2 ? 'no-image' : ''}">
                        ${hasImage2 ? `
                        <div class="news-image-container">
                            <a href="${article2.link}" target="_blank">
                                <img src="${article2.image_url}" alt="${article2.title}">
                            </a>
                        </div>
                        ` : ''}
                        <div class="news-content">
                            <span class="news-date"><i class="fa fa-calendar"></i> ${formatDate(article2.pubDate)}</span>
                            <a href="${article2.link}" target="_blank">
                                <h4 class="news-title">${article2.title}</h4>
                            </a>
                            <p class="news-excerpt">${truncateText(article2.description, 80)}</p>
                            <a href="${article2.link}" target="_blank" class="read-more">Leer más <i class="fa fa-arrow-right"></i></a>
                        </div>
                    </div>
                `;
                rowDiv.appendChild(newsItem2);
            }
            
            newsGrid.appendChild(rowDiv);
        }
    }
    
    console.log(`Mostrando ${articles.length} noticias`);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}

function truncateText(text, maxLength = 150) {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
}

function manualRefresh() {
    localStorage.removeItem(CACHE_KEY);
    fetchAndDisplayNews();
}

document.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayNews();
});
