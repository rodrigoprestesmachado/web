// Custom Navbar Web Component
class CustomNavbar extends HTMLElement {
    constructor() {
        super();
    }
    
    connectedCallback() {
        this.innerHTML = `
            <nav class="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 shadow-lg">
                <div class="container mx-auto px-4">
                    <div class="flex items-center justify-between h-16">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                </svg>
                            </div>
                            <div>
                                <span class="text-white font-bold text-xl tracking-tight">Mover</span>
                                <span class="text-indigo-200 font-light text-xl">Cycles</span>
                            </div>
                        </div>
                        
                        <div class="hidden md:flex items-center space-x-6">
                            <a href="#" class="text-indigo-100 hover:text-white transition-colors flex items-center space-x-1">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                                </svg>
                                <span>Home</span>
                            </a>
                            <a href="#" class="text-indigo-100 hover:text-white transition-colors flex items-center space-x-1">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                </svg>
                                <span>Dashboard</span>
                            </a>
                            <a href="#" class="text-indigo-100 hover:text-white transition-colors flex items-center space-x-1">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <span>Ajuda</span>
                            </a>
                        </div>
                        
                        <div class="flex items-center">
                            <button class="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors" id="mobileMenuBtn">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Mobile menu -->
                <div class="md:hidden hidden" id="mobileMenu">
                    <div class="px-4 py-3 space-y-2 bg-indigo-800">
                        <a href="#" class="block text-indigo-100 hover:text-white py-2 transition-colors">Home</a>
                        <a href="#" class="block text-indigo-100 hover:text-white py-2 transition-colors">Dashboard</a>
                        <a href="#" class="block text-indigo-100 hover:text-white py-2 transition-colors">Ajuda</a>
                    </div>
                </div>
            </nav>
        `;
        
        // Mobile menu toggle
        const mobileMenuBtn = this.querySelector('#mobileMenuBtn');
        const mobileMenu = this.querySelector('#mobileMenu');
        
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }
    }
}

// Register the custom element
customElements.define('custom-navbar', CustomNavbar);
