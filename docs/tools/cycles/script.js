// API Configuration
const USE_LOCAL_PROXY = false; // Set to true if running proxy-server.js
const LOCAL_PROXY = 'http://localhost:8080';
const API_BASE = USE_LOCAL_PROXY ? LOCAL_PROXY + '/generate' : 'https://movercycles.fly.dev/cycles/generate';
const API_ANALYSIS = USE_LOCAL_PROXY ? LOCAL_PROXY + '/analysis' : 'https://movercycles.fly.dev/cycles/generate/analysis';

// Debug mode (set to false in production)
const DEBUG = false;
function log(...args) {
    if (DEBUG) console.log('[CycleSync]', ...args);
}

// Custom fetch with CORS proxy
async function fetchWithCorsProxy(url, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 min timeout
    
    try {
        // If using local proxy, try direct fetch (it has CORS enabled)
        if (USE_LOCAL_PROXY) {
            log('Usando proxy local:', url);
            const response = await fetch(url, { 
                ...options, 
                signal: controller.signal 
            });
            clearTimeout(timeoutId);
            
            if (response.ok) {
                log('Proxy local funcionou!');
                return response;
            }
            
            // If local proxy failed, might not be running
            console.warn('Proxy local não está respondendo. Inicie o servidor proxy com: node proxy-server.js');
            throw new Error('Proxy local não disponível. Por favor, inicie o servidor proxy (node proxy-server.js)');
        }
        
        // Try direct fetch first (in case CORS is enabled on server)
        log('Tentando requisição direta...');
        const directResponse = await fetch(url, { 
            ...options, 
            signal: controller.signal 
        });
        
        if (directResponse.ok) {
            clearTimeout(timeoutId);
            log('Requisição direta funcionou!');
            return directResponse;
        }
    } catch (e) {
        if (USE_LOCAL_PROXY) {
            throw e; // Don't try other proxies if local proxy is configured
        }
        log('Requisição direta falhou:', e.message);
    }
    
    // Use corsproxy.io as fallback
    const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
    log('Usando proxy CORS externo...');
    
    try {
        const response = await fetch(proxyUrl, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
            log('Proxy CORS funcionou!');
            return response;
        }
        throw new Error(`Proxy retornou status: ${response.status}`);
    } catch (e) {
        clearTimeout(timeoutId);
        log('Proxy CORS falhou:', e.message);
        
        if (e.name === 'AbortError') {
            throw new Error('A requisição excedeu o tempo limite de 3 minutos.');
        }
        throw new Error(`Falha na conexão: ${e.message}`);
    }
}

// DOM Elements
const trainingForm = document.getElementById('trainingForm');
const resultsSection = document.getElementById('resultsSection');
const resultsBody = document.getElementById('resultsBody');
const downloadBtn = document.getElementById('downloadBtn');

// Store current data for CSV download
let currentData = null;

// Form submission handler
trainingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Collect form data
    const formData = getFormData();
    
    // Show loading state
    const submitBtn = trainingForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Gerando...
    `;
    submitBtn.disabled = true;
    
    try {
        log('Enviando requisição para:', API_BASE);
        log('Dados do formulário:', formData);
        
        const response = await fetchWithCorsProxy(API_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        log('Resposta recebida, status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        log('Dados recebidos:', data);
        log('Semanas:', data.weeks?.length || 0);
        
        currentData = data;
        
        // Render results
        renderResults(data);
        
        // Show results section with animation
        log('Mostrando seção de resultados');
        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Erro ao gerar plano:', error);
        log('Erro detalhado:', error.message, error.stack);
        alert('Erro ao gerar o plano de treinamento: ' + error.message);
    } finally {
        // Restore button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

// Render results to table
function renderResults(data) {
    resultsBody.innerHTML = '';
    
    if (!data.weeks || data.weeks.length === 0) {
        resultsBody.innerHTML = '<tr><td colspan="9" class="px-4 py-4 text-center text-gray-500">Nenhum dado disponível</td></tr>';
        return;
    }
    
    data.weeks.forEach((week, index) => {
        const row = document.createElement('tr');
        
        // Add alternating row colors and highlight for deload weeks
        const isDeload = week.objective && week.objective.toLowerCase().includes('deload');
        row.className = isDeload 
            ? 'bg-amber-50 hover:bg-amber-100 transition-colors' 
            : (index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100') + ' transition-colors';
        
        // Format date
        const startDate = new Date(week.startPoint);
        const formattedDate = startDate.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        row.innerHTML = `
            <td class="px-4 py-4 whitespace-nowrap">
                <span class="inline-flex items-center justify-center w-8 h-8 rounded-full ${isDeload ? 'bg-amber-200 text-amber-800' : 'bg-indigo-100 text-indigo-800'} font-semibold text-sm">
                    ${week.weekNumber}
                </span>
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">${formattedDate}</td>
            <td class="px-4 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <span class="text-sm font-medium text-gray-900">${week.ctl}</span>
                    <svg class="w-4 h-4 mx-1 ${week.ctlGoal > week.ctl ? 'text-green-500' : 'text-red-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${week.ctlGoal > week.ctl ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'}"></path>
                    </svg>
                    <span class="text-sm text-gray-500">${week.ctlGoal}</span>
                </div>
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">${week.tss}</td>
            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">${week.weight.toFixed(1)} kg</td>
            <td class="px-4 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <svg class="w-4 h-4 mr-1 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16 8v8m-8-5v5m8-9a3 3 0 11-6 0 3 3 0 016 0zM9 21h6"></path>
                    </svg>
                    <span class="text-sm text-gray-900">${week.running} km</span>
                </div>
            </td>
            <td class="px-4 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <svg class="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <circle cx="5.5" cy="17.5" r="3.5"></circle>
                        <circle cx="18.5" cy="17.5" r="3.5"></circle>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 6l-3.5 9M9 12l2.5 5.5M12 12h5"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17 9l-2-3h-3"></path>
                    </svg>
                    <span class="text-sm text-gray-900">${week.cycling} km</span>
                </div>
            </td>
            <td class="px-4 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <svg class="w-4 h-4 mr-1 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <circle cx="8" cy="5" r="2"></circle>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 18c1.5-1 3-1.5 5-1.5s3.5.5 5 1.5c1.5 1 3 1.5 5 1.5s3.5-.5 5-1.5"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 8l4 4 6-3"></path>
                    </svg>
                    <span class="text-sm text-gray-900">${week.swimming || 0} km</span>
                </div>
            </td>
            <td class="px-4 py-4 whitespace-nowrap">
                ${week.objective ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDeload ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}">${week.objective}</span>` : '-'}
            </td>
        `;
        
        resultsBody.appendChild(row);
    });
    
    // Reinitialize feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

// Download CSV handler
downloadBtn.addEventListener('click', () => {
    if (!currentData || !currentData.weeks) {
        alert('Nenhum dado disponível para download.');
        return;
    }
    
    // Create CSV content
    const headers = ['Semana', 'Data Início', 'CTL', 'CTL Meta', 'TSS', 'Peso (kg)', 'Corrida (km)', 'Ciclismo (km)', 'Natação (km)', 'Objetivo'];
    const rows = currentData.weeks.map(week => [
        week.weekNumber,
        week.startPoint,
        week.ctl,
        week.ctlGoal,
        week.tss,
        week.weight,
        week.running,
        week.cycling,
        week.swimming,
        week.objective || ''
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `plano-treinamento-${currentData.raceDate}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// ============================================
// AI ANALYSIS FUNCTIONALITY
// ============================================

// Wait for DOM to be ready before getting analysis elements
let analyzeBtn, analysisSection, analysisLoading, analysisLoadingText, analysisContent, analysisText;

function initAnalysisElements() {
    analyzeBtn = document.getElementById('analyzeBtn');
    analysisSection = document.getElementById('analysisSection');
    analysisLoading = document.getElementById('analysisLoading');
    analysisLoadingText = document.getElementById('analysisLoadingText');
    analysisContent = document.getElementById('analysisContent');
    analysisText = document.getElementById('analysisText');
    
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', handleAnalysisClick);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnalysisElements);
} else {
    initAnalysisElements();
}

// Loading messages that rotate while waiting for AI (enough for 3+ minutes)
const loadingMessages = [
    'Iniciando análise com IA...',
    'Conectando ao modelo de inteligência artificial...',
    'Analisando seu plano de treinamento...',
    'Avaliando progressão de carga semanal...',
    'Verificando distribuição de volume...',
    'Calculando risco de overtraining...',
    'Analisando semanas de recuperação...',
    'Verificando balanço entre modalidades...',
    'Avaliando taxa de progressão de peso...',
    'Analisando periodização do treino...',
    'Verificando consistência do plano...',
    'Preparando recomendações personalizadas...',
    'A IA está processando os dados...',
    'Gerando insights detalhados...',
    'Analisando relação volume x intensidade...',
    'Verificando distribuição de TSS semanal...',
    'Avaliando curva de progressão de CTL...',
    'Calculando janelas de recuperação ideais...',
    'Analisando impacto das semanas de deload...',
    'Verificando sustentabilidade do plano...',
    'Avaliando adaptações fisiológicas esperadas...',
    'Calculando margem de segurança do treino...',
    'Analisando equilíbrio entre corrida e bike...',
    'Verificando progressão de volume total...',
    'Avaliando prontidão para a prova...',
    'Gerando sugestões de ajuste fino...',
    'Processando análise de riscos...',
    'Verificando alinhamento com objetivo...',
    'Consolidando dados da análise...',
    'Refinando recomendações finais...',
    'A análise está sendo finalizada...',
    'Quase pronto, aguarde mais um pouco...',
    'Preparando relatório completo...',
    'Últimos ajustes na análise...',
    'Finalizando processamento...',
    'A IA está concluindo a análise...',
    'Seu relatório está quase pronto...',
    'Validando recomendações geradas...',
    'Formatando resultado final...',
    'Concluindo análise detalhada...'
];

let loadingInterval = null;
let timerInterval = null;
let messageIndex = 0;
let elapsedSeconds = 0;

function startLoadingAnimation() {
    messageIndex = 0;
    elapsedSeconds = 0;
    analysisLoadingText.textContent = loadingMessages[0];
    
    // Update loading message every 4 seconds
    loadingInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        analysisLoadingText.textContent = loadingMessages[messageIndex];
    }, 4000);
    
    // Update timer every second
    const timerElement = document.getElementById('analysisTimer');
    if (timerElement) {
        timerInterval = setInterval(() => {
            elapsedSeconds++;
            const minutes = Math.floor(elapsedSeconds / 60);
            const seconds = elapsedSeconds % 60;
            if (minutes > 0) {
                timerElement.textContent = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
            } else {
                timerElement.textContent = `${seconds}s`;
            }
        }, 1000);
    }
}

function stopLoadingAnimation() {
    if (loadingInterval) {
        clearInterval(loadingInterval);
        loadingInterval = null;
    }
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Collect form data helper
function getFormData() {
    return {
        startCTL: parseFloat(document.getElementById('startCTL').value),
        ramp: parseFloat(document.getElementById('ramp').value),
        raceDate: document.getElementById('raceDate').value,
        numberOfWeeks: parseInt(document.getElementById('numberOfWeeks').value),
        deloadWeeks: parseInt(document.getElementById('deloadWeeks').value),
        deloadCtlReduction: parseFloat(document.getElementById('deloadCtlReduction').value),
        initialWeight: parseFloat(document.getElementById('initialWeight').value),
        decreaseWeight: parseFloat(document.getElementById('decreaseWeight').value),
        initialRunningVolume: parseInt(document.getElementById('initialRunningVolume').value),
        runningIncreaseTax: parseFloat(document.getElementById('runningIncreaseTax').value),
        initialCyclingVolume: parseInt(document.getElementById('initialCyclingVolume').value),
        cyclingIncreaseTax: parseFloat(document.getElementById('cyclingIncreaseTax').value),
        initialSwimmingVolume: parseInt(document.getElementById('initialSwimmingVolume').value) || 0,
        swimmingIncreaseTax: parseFloat(document.getElementById('swimmingIncreaseTax').value) || 0
    };
}

// Format analysis text with markdown-like styling
function formatAnalysisText(text) {
    // Convert markdown-like formatting to HTML
    let formatted = text
        // Headers
        .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-gray-800 mt-6 mb-2">$1</h3>')
        .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-gray-800 mt-6 mb-3">$1</h2>')
        .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-purple-700 mt-4 mb-4">$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
        // Lists
        .replace(/^- (.*$)/gm, '<li class="ml-4 text-gray-700">$1</li>')
        .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 text-gray-700"><span class="font-medium">$1.</span> $2</li>')
        // Line breaks
        .replace(/\n\n/g, '</p><p class="mb-4 text-gray-700 leading-relaxed">')
        .replace(/\n/g, '<br>');
    
    // Wrap lists
    formatted = formatted.replace(/(<li.*?<\/li>)+/g, '<ul class="list-disc mb-4 space-y-1">$&</ul>');
    
    // Wrap in paragraph
    formatted = '<p class="mb-4 text-gray-700 leading-relaxed">' + formatted + '</p>';
    
    return formatted;
}

// AI Analysis button handler
async function handleAnalysisClick() {
    const formData = getFormData();
    
    // Validate form
    if (!formData.raceDate) {
        alert('Por favor, preencha a data da corrida antes de gerar a análise.');
        return;
    }
    
    // Show analysis section with loading state
    analysisSection.classList.remove('hidden');
    analysisLoading.classList.remove('hidden');
    analysisContent.classList.add('hidden');
    
    // Scroll to analysis section
    analysisSection.scrollIntoView({ behavior: 'smooth' });
    
    // Start loading animation
    startLoadingAnimation();
    
    // Disable button
    const originalBtnText = analyzeBtn.innerHTML;
    analyzeBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Analisando...
    `;
    analyzeBtn.disabled = true;
    
    try {
        log('Enviando requisição de análise para:', API_ANALYSIS);
        
        const response = await fetchWithCorsProxy(API_ANALYSIS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Get response as text first
        const responseText = await response.text();
        log('Análise recebida (raw):', responseText);
        
        // Try to parse as JSON, if fail use as markdown text
        let analysisResponse;
        try {
            const data = JSON.parse(responseText);
            analysisResponse = data.analysis || data.text || data.content || data.message || JSON.stringify(data, null, 2);
        } catch (e) {
            // Response is not JSON, use as markdown text directly
            log('Response is not JSON, using as markdown text');
            analysisResponse = responseText;
        }
        
        // Stop loading animation
        stopLoadingAnimation();
        
        // Hide loading, show content
        analysisLoading.classList.add('hidden');
        analysisContent.classList.remove('hidden');
        
        // Render analysis
        analysisText.innerHTML = formatAnalysisText(analysisResponse);
        
    } catch (error) {
        console.error('Erro ao gerar análise:', error);
        stopLoadingAnimation();
        
        // Show error message
        analysisLoading.classList.add('hidden');
        analysisContent.classList.remove('hidden');
        analysisText.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <svg class="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <h3 class="text-lg font-semibold text-red-800 mb-2">Erro ao gerar análise</h3>
                <p class="text-red-600">${error.message}</p>
                <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                    Tentar novamente
                </button>
            </div>
        `;
    } finally {
        // Restore button
        if (analyzeBtn) {
            analyzeBtn.innerHTML = originalBtnText;
            analyzeBtn.disabled = false;
        }
    }
}
