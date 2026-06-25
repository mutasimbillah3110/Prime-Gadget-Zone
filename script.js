
        // Firebase Configuration
      //*************************
      //*************************
      //*************************
      //*************************
      //*************************
      //*************************
    
        // Initialize Firebase
        const app = firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.database();
        const storage = firebase.storage();

        // Global State
        let currentUser = null;
        let currentProducts = [];
        let cartItems = [];
        let wishlistItems = [];
        let isDarkMode = localStorage.getItem('darkMode') === 'true';

        // Initialize App
        document.addEventListener('DOMContentLoaded', () => {
            if (isDarkMode) document.body.classList.add('dark-mode');
            initAuth();
            loadCategories();
            loadFeaturedProducts();
            loadTrendingProducts();
            loadBestSellers();
            loadCart();
            loadWishlist();
            setupSearch();
        });

        // Auth Functions
        function initAuth() {
            auth.onAuthStateChanged(user => {
                currentUser = user;
                updateAuthUI();
            });
        }

        function updateAuthUI() {
            const authBtn = document.getElementById('authBtn');
            if (currentUser) {
                authBtn.textContent = '👤 ' + currentUser.email.split('@')[0];
                authBtn.onclick = () => goToPage('profile.html');
            } else {
                authBtn.textContent = '👤 Login';
                authBtn.onclick = openAuthModal;
            }
        }

        function openAuthModal() {
            document.getElementById('authModal').classList.add('active');
        }

        function closeAuthModal() {
            document.getElementById('authModal').classList.remove('active');
        }

        async function handleAuth() {
            const email = document.getElementById('authEmail').value.trim();
            const password = document.getElementById('authPassword').value.trim();

            if (!email || !password) {
                showToast('Please fill all fields', 'warning');
                return;
            }

            try {
                // Try to sign in first
                try {
                    await auth.signInWithEmailAndPassword(email, password);
                    showToast('Signed in successfully!', 'success');
                } catch (e) {
                    // If sign in fails, try to create account
                    if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
                        await auth.createUserWithEmailAndPassword(email, password);
                        await createUserProfile(email);
                        showToast('Account created successfully!', 'success');
                    } else {
                        throw e;
                    }
                }
                closeAuthModal();
                document.getElementById('authEmail').value = '';
                document.getElementById('authPassword').value = '';
            } catch (error) {
                showToast('Error: ' + error.message, 'error');
            }
        }

        async function createUserProfile(email) {
            const user = auth.currentUser;
            if (user) {
                await db.ref(`users/${user.uid}`).set({
                    email: email,
                    createdAt: new Date().toISOString(),
                    name: '',
                    phone: '',
                    address: ''
                });
            }
        }

        function openForgotPassword() {
            const email = document.getElementById('authEmail').value;
            if (!email) {
                showToast('Please enter your email first', 'warning');
                return;
            }
            auth.sendPasswordResetEmail(email).then(() => {
                showToast('Password reset email sent! Check your inbox.', 'success');
            }).catch(error => {
                showToast('Error: ' + error.message, 'error');
            });
        }

        // Theme Toggle
        function toggleTheme() {
            isDarkMode = !isDarkMode;
            localStorage.setItem('darkMode', isDarkMode);
            if (isDarkMode) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        }

        // Search Functions
        function setupSearch() {
            const searchInput = document.getElementById('searchInput');
            const searchResults = document.getElementById('searchResults');

            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                
                if (query.length < 2) {
                    searchResults.classList.remove('active');
                    return;
                }

                const filtered = currentProducts.filter(p => 
                    p.name.toLowerCase().includes(query) ||
                    p.category.toLowerCase().includes(query)
                ).slice(0, 5);

                if (filtered.length > 0) {
                    searchResults.innerHTML = filtered.map(p => `
                        <div class="search-result-item" onclick="goToProduct('${p.id}')">
                            <strong>${p.name}</strong><br>
                            <span style="font-size: 0.85rem; color: #666;">৳${p.price}</span>
                        </div>
                    `).join('');
                    searchResults.classList.add('active');
                } else {
                    searchResults.innerHTML = '<div class="search-result-item" style="color: #999;">No products found</div>';
                    searchResults.classList.add('active');
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.search-container')) {
                    searchResults.classList.remove('active');
                }
            });
        }

        // Load Products
        async function loadFeaturedProducts() {
            try {
                const snapshot = await db.ref('products').orderByChild('featured').equalTo(true).limitToFirst(8).once('value');
                const products = [];
                snapshot.forEach(child => {
                    products.push({ id: child.key, ...child.val() });
                });
                currentProducts = [...currentProducts, ...products];
                renderProducts('featuredProducts', products);
            } catch (error) {
                console.error('Error loading featured products:', error);
            }
        }

        async function loadTrendingProducts() {
            try {
                const snapshot = await db.ref('products').orderByChild('trending').equalTo(true).limitToFirst(8).once('value');
                const products = [];
                snapshot.forEach(child => {
                    products.push({ id: child.key, ...child.val() });
                });
                currentProducts = [...currentProducts, ...products];
                renderProducts('trendingProducts', products);
            } catch (error) {
                console.error('Error loading trending products:', error);
            }
        }

        async function loadBestSellers() {
            try {
                const snapshot = await db.ref('products').orderByChild('sales').limitToFirst(8).once('value');
                const products = [];
                snapshot.forEach(child => {
                    products.push({ id: child.key, ...child.val() });
                });
                currentProducts = [...currentProducts, ...products];
                renderProducts('bestSellers', products);
            } catch (error) {
                console.error('Error loading best sellers:', error);
            }
        }

        async function loadCategories() {
            try {
                const snapshot = await db.ref('categories').once('value');
                const categories = [];
                snapshot.forEach(child => {
                    categories.push({ id: child.key, ...child.val() });
                });

                const defaultCategories = [
                    { name: 'Smartphones', icon: '📱' },
                    { name: 'Laptops', icon: '💻' },
                    { name: 'Tablets', icon: '📱' },
                    { name: 'Accessories', icon: '🔌' },
                    { name: 'Wearables', icon: '⌚' },
                    { name: 'Audio', icon: '🎧' }
                ];

                const html = defaultCategories.map(cat => `
                    <div class="category-card" onclick="filterByCategory('${cat.name}')">
                        <div class="category-icon">${cat.icon}</div>
                        <h3>${cat.name}</h3>
                    </div>
                `).join('');

                document.getElementById('categoriesGrid').innerHTML = html;
            } catch (error) {
                console.error('Error loading categories:', error);
            }
        }

        function renderProducts(containerId, products) {
            const container = document.getElementById(containerId);
            if (!products || products.length === 0) {
                container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">No products found</p>';
                return;
            }

            container.innerHTML = products.map(product => {
                const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
                const isInWishlist = wishlistItems.some(w => w.productId === product.id);
                
                return `
                    <div class="product-card">
                        <div class="product-image">
                            <img src="${product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/250x250?text=Product'}" alt="${product.name}" loading="lazy">
                            ${discount > 0 ? `<div class="product-badge">-${discount}%</div>` : `<div class="product-badge new">New</div>`}
                        </div>
                        <div class="product-info">
                            <div class="product-category">${product.category}</div>
                            <h3 class="product-title" onclick="goToProduct('${product.id}')" style="cursor: pointer;">${product.name}</h3>
                            <div class="product-rating">
                                <span class="stars">⭐⭐⭐⭐⭐</span>
                                <span class="rating-count">(${product.reviews || 0})</span>
                            </div>
                            <div class="product-price">
                                <span class="price-current">৳${product.price}</span>
                                ${product.originalPrice ? `<span class="price-original">৳${product.originalPrice}</span>` : ''}
                            </div>
                            <div class="product-actions">
                                <button class="btn-add-cart" onclick="addToCart('${product.id}', '${product.name}', ${product.price})">Add Cart</button>
                                <button class="btn-wishlist ${isInWishlist ? 'active' : ''}" onclick="toggleWishlist('${product.id}', '${product.name}')">❤️</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Cart Functions
        function addToCart(productId, productName, price) {
            if (!currentUser) {
                showToast('Please login first', 'warning');
                openAuthModal();
                return;
            }

            const existingItem = cartItems.find(item => item.productId === productId);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cartItems.push({
                    productId,
                    name: productName,
                    price,
                    quantity: 1,
                    addedAt: new Date().toISOString()
                });
            }

            saveCart();
            updateCartBadge();
            showToast(`${productName} added to cart!`, 'success');
        }

        function loadCart() {
            if (currentUser) {
                db.ref(`cart/${currentUser.uid}`).once('value').then(snapshot => {
                    cartItems = snapshot.val() || [];
                    updateCartBadge();
                });
            }
        }

        function saveCart() {
            if (currentUser) {
                db.ref(`cart/${currentUser.uid}`).set(cartItems);
            }
        }

        function updateCartBadge() {
            const badge = document.getElementById('cartBadge');
            if (cartItems.length > 0) {
                badge.textContent = cartItems.length;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }

        // Wishlist Functions
        function toggleWishlist(productId, productName) {
            if (!currentUser) {
                showToast('Please login first', 'warning');
                openAuthModal();
                return;
            }

            const existingItem = wishlistItems.findIndex(w => w.productId === productId);
            if (existingItem > -1) {
                wishlistItems.splice(existingItem, 1);
                showToast(`${productName} removed from wishlist`, 'success');
            } else {
                wishlistItems.push({ productId, name: productName });
                showToast(`${productName} added to wishlist!`, 'success');
            }

            saveWishlist();
            updateWishlistBadge();
            location.reload();
        }

        function loadWishlist() {
            if (currentUser) {
                db.ref(`wishlist/${currentUser.uid}`).once('value').then(snapshot => {
                    wishlistItems = snapshot.val() || [];
                    updateWishlistBadge();
                });
            }
        }

        function saveWishlist() {
            if (currentUser) {
                db.ref(`wishlist/${currentUser.uid}`).set(wishlistItems);
            }
        }

        function updateWishlistBadge() {
            const badge = document.getElementById('wishlistBadge');
            if (wishlistItems.length > 0) {
                badge.textContent = wishlistItems.length;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }

        // Navigation
        function goToPage(page) {
            if (!currentUser && (page === 'profile.html' || page === 'orders.html')) {
                showToast('Please login first', 'warning');
                openAuthModal();
                return;
            }
            window.location.href = page;
        }

        function goToProduct(productId) {
            window.location.href = `product.html?id=${productId}`;
        }

        function filterByCategory(category) {
            window.location.href = `products.html?category=${category}`;
        }

        function scrollToSection(sectionId) {
            const element = document.getElementById(sectionId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }

        // Mobile Menu
        function toggleMobileMenu(event) {
            if (event && event.target.id === 'mobileMenu') {
                document.getElementById('mobileMenu').classList.remove('active');
            } else {
                document.getElementById('mobileMenu').classList.toggle('active');
            }
        }

        // Toast Notifications
        function showToast(message, type = 'info') {
            const container = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = message;
            container.appendChild(toast);

            setTimeout(() => {
                toast.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        // Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(err => console.log('SW registration failed'));
        }
