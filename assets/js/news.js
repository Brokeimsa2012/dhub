
const GNEWS_API_KEY = 'pub_847922dd8d76dc99d8836daaa0a24981ade1f'; // Necesitarás registrarte en https://gnews.io/
const KEYWORDS = 'importación OR shipping OR "comercio marítimo" OR economía OR aranceles';
const DAYS_AGO = 3;
const MAX_ARTICLES = 4;

// Configuración del sistema de caché
const CACHE_KEY = 'importacion_news_cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 3 horas en milisegundos

// Función para obtener la fecha de hace X días en formato ISO
function getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
}

// Función para formatear la fecha en formato legible (DD MMM YYYY)
function formatDate(dateString) {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}

// Función para acortar el texto del resumen
function truncateText(text, maxLength = 120) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Sistema de caché
const NewsCache = {
    // Guardar datos en caché
    saveToCache: function(data) {
        const cacheItem = {
            timestamp: new Date().getTime(),
            data: data
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheItem));
        console.log('Datos guardados en caché');
    },
    
    // Obtener datos de la caché
    getFromCache: function() {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (!cachedData) {
            return null;
        }
        
        const cacheItem = JSON.parse(cachedData);
        const now = new Date().getTime();
        
        // Verificar si la caché ha expirado
        if (now - cacheItem.timestamp > CACHE_EXPIRY) {
            console.log('Caché expirada');
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        
        console.log('Usando datos de caché (guardados hace ' + 
                    Math.round((now - cacheItem.timestamp) / 60000) + 
                    ' minutos)');
        return cacheItem.data;
    }
};

// Función principal para obtener y mostrar noticias con caché
async function fetchAndDisplayNews() {
    try {
        // Intentar obtener datos de la caché primero
        const cachedNews = NewsCache.getFromCache();
        if (cachedNews) {
            // Usar datos de caché si están disponibles
            displayNews(cachedNews);
            return;
        }
        
        // Si no hay caché válida, hacer petición a la API
        console.log('Obteniendo noticias frescas de la API...');
        const fromDate = getDateDaysAgo(DAYS_AGO);
        const url = `https://newsdata.io/api/1/archive?apikey=${GNEWS_API_KEY}&q=${KEYWORDS}&language=es&from_date=${fromDate.slice(0,10)}&to_date=${new Date().toISOString().slice(0,10)}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.articles) {
            throw new Error('Error al obtener noticias');
        }
        
        // Guardar en caché y mostrar
        NewsCache.saveToCache(data.articles);
        displayNews(data.articles);
    } catch (error) {
        console.error('Error:', error);
        
        // Intentar con datos de respaldo si existe una caché anterior expirada
        const oldCache = localStorage.getItem(CACHE_KEY);
        if (oldCache) {
            console.log('Usando caché antigua como respaldo');
            const cacheItem = JSON.parse(oldCache);
            displayNews(cacheItem.data);
            return;
        }
    }
}

// Función para mostrar las noticias en el HTML
function displayNews(articles) {
    
    // Artículo destacado (el primero)
    const featuredArticle = articles[0];
    const otherArticles = articles.slice(1);
    
    // Mostrar artículo destacado
    const leftImageContainer = document.querySelector('.left-image');
    if (leftImageContainer && featuredArticle) {
        leftImageContainer.innerHTML = `
            <a href="${featuredArticle.url}" target="_blank"><img src="${featuredArticle.image || featuredArticle.urlToImage || 'assets/images/default-news.jpg'}" alt="${featuredArticle.title}"></a>
            <div class="info">
                <div class="inner-content">
                    <ul>
                        <li><i class="fa fa-calendar"></i> ${formatDate(featuredArticle.publishedAt)}</li>
                        <li><i class="fa fa-globe"></i> Comercio Internacional</li>
                        <li><i class="fa fa-folder"></i> Noticias</li>
                    </ul>
                    <a href="${featuredArticle.url}" target="_blank"><h4>${featuredArticle.title}</h4></a>
                    <p>${truncateText(featuredArticle.description || featuredArticle.content)}</p>
                    <div class="main-blue-button">
                        <a href="${featuredArticle.url}" target="_blank">Leer Más</a>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Mostrar el resto de artículos
    const rightList = document.querySelector('.right-list ul');
    if (rightList) {
        rightList.innerHTML = '';
        otherArticles.forEach(article => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <div class="left-content align-self-center">
                    <span><i class="fa fa-calendar"></i> ${formatDate(article.publishedAt)}</span>
                    <a href="${article.url}" target="_blank"><h4>${article.title}</h4></a>
                    <p>${truncateText(article.description || article.content, 80)}</p>
                </div>
                <div class="right-image">
                    <a href="${article.url}" target="_blank"><img src="${article.image || article.urlToImage || 'assets/images/default-news.jpg'}" alt="${article.title}"></a>
                </div>
            `;
            rightList.appendChild(listItem);
        });
    }
    
    // Mostrar estado de la caché (para depuración)
    console.log(`Mostrando ${articles.length} noticias`);
}


// Función para actualizar noticias manualmente (útil para agregar un botón de actualización)
function manualRefresh() {
    // Elimina la caché actual y vuelve a cargar
    localStorage.removeItem(CACHE_KEY);
    fetchAndDisplayNews();
}
// Iniciar la carga de noticias cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayNews();
});