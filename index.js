// Global Application State
let breedsData = [];
let ratingsData = {};
let shoppingCart = {};
let savedPuppies = [];
let currentFilterLocation = 'all';
let currentSearchQuery = '';
let currentSortOption = 'default';
let currentUser = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadCurrentUser();
    fetchBreeds();
    loadSavedPuppies();
    initializeEventListeners();
});

// Theme Toggle Logic
function initTheme() {
    const themeBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    
    // Check local storage for preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeIcon.className = 'fa-solid fa-sun';
    } else {
        document.body.classList.remove('dark-mode');
        themeIcon.className = 'fa-solid fa-moon';
    }
    
    themeBtn.addEventListener('click', () => {
        if (document.body.classList.contains('dark-mode')) {
            document.body.classList.remove('dark-mode');
            themeIcon.className = 'fa-solid fa-moon';
            localStorage.setItem('theme', 'light');
        } else {
            document.body.classList.add('dark-mode');
            themeIcon.className = 'fa-solid fa-sun';
            localStorage.setItem('theme', 'dark');
        }
    });
}

// Fetch Breeds and Ratings from API
async function fetchBreeds() {
    try {
        let response = await fetch('/api/breeds');
        let data;
        if (!response.ok) {
            // Static Netlify hosting fallback
            response = await fetch('/breeds_data.json');
            if (!response.ok) throw new Error('Static fallback failed');
            data = { breeds: await response.json(), ratings: JSON.parse(localStorage.getItem('netlify_ratings') || '{}') };
        } else {
            data = await response.json();
        }
        
        const netlifyBreeds = JSON.parse(localStorage.getItem('netlify_breeds') || '[]');
        breedsData = [...data.breeds, ...netlifyBreeds];
        ratingsData = data.ratings || {};
        
        renderBreeds();
    } catch (error) {
        console.error('Error fetching breeds:', error);
        document.getElementById('breedsGrid').innerHTML = `
            <div class="loading-spinner">
                <i class="fa-solid fa-circle-exclamation" style="color: #e63946;"></i>
                <p>Failed to load dog breeds. Please make sure the Java server is running or breeds_data.json is present.</p>
            </div>
        `;
    }
}

// Render Breeds Grid
function renderBreeds() {
    const grid = document.getElementById('breedsGrid');
    grid.innerHTML = '';
    
    // Apply filters
    let filtered = breedsData.filter(breed => {
        // Location Filter
        const matchesLocation = currentFilterLocation === 'all' || 
            (breed.locations && breed.locations.includes(currentFilterLocation));
            
        // Search Filter
        const query = currentSearchQuery.toLowerCase();
        const matchesSearch = breed.name.toLowerCase().includes(query) || 
            breed.description.toLowerCase().includes(query) ||
            breed.colors_raw.toLowerCase().includes(query);
            
        return matchesLocation && matchesSearch;
    });
    
    // Apply sorting
    if (currentSortOption === 'price-asc') {
        filtered.sort((a, b) => a.price_inr_min - b.price_inr_min);
    } else if (currentSortOption === 'price-desc') {
        filtered.sort((a, b) => b.price_inr_min - a.price_inr_min);
    } else if (currentSortOption === 'popularity') {
        filtered.sort((a, b) => {
            const ratingA = getAverageRating(a.name);
            const ratingB = getAverageRating(b.name);
            return ratingB - ratingA;
        });
    }
    
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="loading-spinner">
                <i class="fa-solid fa-dog"></i>
                <p>No dog breeds matched your search criteria.</p>
            </div>
        `;
        return;
    }
    
    filtered.forEach(breed => {
        const card = createBreedCard(breed);
        grid.appendChild(card);
    });
}

// Calculate Breed Rating
function getAverageRating(breedName) {
    const list = ratingsData[breedName] || [];
    const netlifyRatings = JSON.parse(localStorage.getItem('netlify_ratings') || '{}')[breedName] || [];
    const combined = [...list, ...netlifyRatings];
    if (combined.length > 0) {
        const sum = combined.reduce((a, b) => a + b, 0);
        return sum / combined.length;
    }
    return 4.5; // default starting rating
}

function getRatingCount(breedName) {
    const list = ratingsData[breedName] || [];
    const netlifyRatings = JSON.parse(localStorage.getItem('netlify_ratings') || '{}')[breedName] || [];
    return list.length + netlifyRatings.length || 3; // default starting ratings count
}

// Create Card Element
function createBreedCard(breed) {
    const card = document.createElement('div');
    card.className = 'breed-card';
    card.dataset.breedName = breed.name;
    
    const avgRating = getAverageRating(breed.name);
    const ratingCount = getRatingCount(breed.name);
    const isSaved = savedPuppies.includes(breed.name);
    
    // Location Badges HTML
    const locationBadges = breed.locations.map(loc => 
        `<span class="card-loc-badge">${loc}</span>`
    ).join('');

    // Generate sliders indicators
    const dotsHtml = breed.images.map((_, i) => 
        `<span class="slider-dot ${i === 0 ? 'active' : ''}"></span>`
    ).join('');

    // Format prices in INR
    const priceTextInr = `₹${breed.price_inr_min.toLocaleString()} - ₹${breed.price_inr_max.toLocaleString()}`;

    card.innerHTML = `
        <div class="card-gallery">
            <button class="save-card-btn ${isSaved ? 'saved' : ''}" onclick="toggleSavePuppy('${breed.name}')">
                <i class="fa-${isSaved ? 'solid' : 'regular'} fa-heart"></i>
            </button>
            <div class="slider-container" style="transform: translateX(0px);">
                ${breed.images.map(img => `<img src="${encodeURIComponent(img)}" class="slider-img" alt="${breed.name}">`).join('')}
            </div>
            ${breed.images.length > 1 ? `
                <button class="slider-btn slider-prev" onclick="moveSlider(this, -1)"><i class="fa-solid fa-chevron-left"></i></button>
                <button class="slider-btn slider-next" onclick="moveSlider(this, 1)"><i class="fa-solid fa-chevron-right"></i></button>
                <div class="slider-dots">${dotsHtml}</div>
            ` : ''}
        </div>
        <div class="card-content">
            <div class="card-title-row">
                <h3>${breed.name}</h3>
                <div>
                    <span class="price-range-tag">${priceTextInr}</span>
                </div>
            </div>
            <div class="location-badges-row">${locationBadges}</div>
            <p class="card-description">${breed.description}</p>
            <div class="colors-box">
                <div class="colors-title">Available Colors</div>
                <div class="colors-desc">${breed.colors_raw}</div>
            </div>
            
            <!-- Ratings -->
            <div class="ratings-box">
                <div class="stars-container" data-breed="${breed.name}">
                    ${generateStarsHtml(avgRating)}
                </div>
                <span class="rating-count-text">${avgRating.toFixed(1)} (${ratingCount} reviews)</span>
            </div>
            
            <!-- Actions -->
            <div class="card-actions">
                <button class="card-btn btn-reserve" onclick="openReserveModal('${breed.name}', '${priceTextInr}')">
                    <i class="fa-solid fa-calendar-check"></i> Reserve
                </button>
                <button class="card-btn btn-cart" onclick="addToCart('${breed.name}')">
                    <i class="fa-solid fa-cart-plus"></i> Add to Cart
                </button>
            </div>
        </div>
    `;
    
    // Attach rating star event listeners inside the rating container
    const stars = card.querySelectorAll('.star-icon');
    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            submitRating(breed.name, index + 1);
        });
    });

    return card;
}

// Generate HTML for Star Icons
function generateStarsHtml(rating) {
    let starsHtml = '';
    const roundedRating = Math.round(rating);
    for (let i = 1; i <= 5; i++) {
        if (i <= roundedRating) {
            starsHtml += `<i class="fa-solid fa-star star-icon filled"></i>`;
        } else {
            starsHtml += `<i class="fa-solid fa-star star-icon"></i>`;
        }
    }
    return starsHtml;
}

// Slider Functionality
function moveSlider(button, direction) {
    const gallery = button.closest('.card-gallery');
    const container = gallery.querySelector('.slider-container');
    const imgs = container.querySelectorAll('.slider-img');
    const dots = gallery.querySelectorAll('.slider-dot');
    
    // Find current index based on transform position
    let currentIndex = 0;
    const currentTransform = container.style.transform;
    const match = currentTransform.match(/translateX\(([-\d]+)px\)/);
    if (match) {
        const offset = parseInt(match[1]);
        const width = gallery.offsetWidth;
        currentIndex = Math.abs(Math.round(offset / width));
    }
    
    // Compute next index
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = imgs.length - 1;
    if (nextIndex >= imgs.length) nextIndex = 0;
    
    // Apply transform slide
    const slideWidth = gallery.offsetWidth;
    container.style.transform = `translateX(-${nextIndex * slideWidth}px)`;
    
    // Update dots indicator
    dots.forEach((dot, i) => {
        if (i === nextIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// Star Rating Submission
async function submitRating(breedName, ratingValue) {
    try {
        let response = await fetch('/api/rate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ breed: breedName, rating: ratingValue })
        });
        
        let data;
        if (!response.ok) {
            // Netlify fallback
            const netlifyRatings = JSON.parse(localStorage.getItem('netlify_ratings') || '{}');
            if (!netlifyRatings[breedName]) {
                netlifyRatings[breedName] = [];
            }
            netlifyRatings[breedName].push(ratingValue);
            localStorage.setItem('netlify_ratings', JSON.stringify(netlifyRatings));
            data = { success: true };
        } else {
            data = await response.json();
        }
        
        if (data.success) {
            fetchBreeds();
        }
    } catch (error) {
        console.error('Error submitting rating:', error);
        alert('Could not submit rating.');
    }
}

// Cart Management
function addToCart(breedName) {
    if (!currentUser) {
        alert("Please login or create an account to add items to your cart and make a purchase.");
        openAuthModal();
        return;
    }
    const breed = breedsData.find(b => b.name === breedName);
    if (!breed) return;
    
    if (shoppingCart[breedName]) {
        shoppingCart[breedName].qty += 1;
    } else {
        shoppingCart[breedName] = {
            name: breedName,
            price_inr: breed.price_inr_min, // using min price as store checkout item cost
            price_usd: breed.price_usd_min,
            image: breed.images[0],
            qty: 1
        };
    }
    
    updateCartCount();
    renderCart();
    
    // Open Cart Drawer automatically for feedback
    document.getElementById('cartDrawer').classList.add('active');
    document.getElementById('cartOverlay').classList.add('active');
}

function updateCartCount() {
    const count = Object.values(shoppingCart).reduce((a, b) => a + b.qty, 0);
    document.getElementById('cartCount').innerText = count;
}

function renderCart() {
    const list = document.getElementById('cartItemsList');
    const summary = document.getElementById('cartSummary');
    
    list.innerHTML = '';
    
    const items = Object.values(shoppingCart);
    if (items.length === 0) {
        list.innerHTML = `<p class="empty-message">Your shopping cart is empty.</p>`;
        summary.style.display = 'none';
        return;
    }
    
    summary.style.display = 'block';
    let totalInr = 0;
    let totalUsd = 0;
    
    items.forEach(item => {
        totalInr += item.price_inr * item.qty;
        totalUsd += item.price_usd * item.qty;
        
        const itemCard = document.createElement('div');
        itemCard.className = 'drawer-item-card';
        itemCard.innerHTML = `
            <img src="${encodeURIComponent(item.image)}" class="drawer-item-img" alt="${item.name}">
            <div class="drawer-item-info">
                <h4>${item.name}</h4>
                <p>₹${item.price_inr.toLocaleString()}</p>
            </div>
            <div class="drawer-item-actions">
                <div class="qty-controls">
                    <button class="qty-btn" onclick="updateCartQty('${item.name}', -1)"><i class="fa-solid fa-minus"></i></button>
                    <span class="qty-val">${item.qty}</span>
                    <button class="qty-btn" onclick="updateCartQty('${item.name}', 1)"><i class="fa-solid fa-plus"></i></button>
                </div>
                <button class="remove-item-btn" onclick="removeCartItem('${item.name}')"><i class="fa-solid fa-trash-can"></i> Remove</button>
            </div>
        `;
        list.appendChild(itemCard);
    });
    
    document.getElementById('cartSubtotal').innerText = `₹${totalInr.toLocaleString()}`;
}

function updateCartQty(name, delta) {
    if (!shoppingCart[name]) return;
    shoppingCart[name].qty += delta;
    if (shoppingCart[name].qty <= 0) {
        delete shoppingCart[name];
    }
    updateCartCount();
    renderCart();
}

function removeCartItem(name) {
    delete shoppingCart[name];
    updateCartCount();
    renderCart();
}

// LocalStorage Saved/Favorite System
function loadSavedPuppies() {
    const saved = localStorage.getItem('saved_puppies');
    if (saved) {
        savedPuppies = JSON.parse(saved);
    }
    updateSavedCount();
    renderSavedDrawer();
}

function updateSavedCount() {
    document.getElementById('savedCount').innerText = savedPuppies.length;
}

function toggleSavePuppy(breedName) {

    // Require login before saving
    if (!currentUser) {
        alert("Please login or create an account to save your favorite puppies.");
        openAuthModal();
        return;
    }

    const idx = savedPuppies.indexOf(breedName);

    if (idx > -1) {
        savedPuppies.splice(idx, 1);
    } else {
        savedPuppies.push(breedName);
    }

    localStorage.setItem('saved_puppies', JSON.stringify(savedPuppies));

    updateSavedCount();
    renderSavedDrawer();

    // Update heart icon
    const cards = document.querySelectorAll('.breed-card');

    cards.forEach(card => {
        if (card.dataset.breedName === breedName) {
            const heartBtn = card.querySelector('.save-card-btn');
            const heartIcon = heartBtn.querySelector('i');

            if (savedPuppies.includes(breedName)) {
                heartBtn.classList.add('saved');
                heartIcon.className = 'fa-solid fa-heart';
            } else {
                heartBtn.classList.remove('saved');
                heartIcon.className = 'fa-regular fa-heart';
            }
        }
    });
}

function renderSavedDrawer() {
    const list = document.getElementById('savedItemsList');
    list.innerHTML = '';
    
    if (savedPuppies.length === 0) {
        list.innerHTML = `<p class="empty-message">No saved puppies yet. Click the heart icon on breed cards to save them!</p>`;
        return;
    }
    
    savedPuppies.forEach(name => {
        const breed = breedsData.find(b => b.name === name);
        if (!breed) return;
        
        const priceTextInr = `₹${breed.price_inr_min.toLocaleString()} - ₹${breed.price_inr_max.toLocaleString()}`;
        
        const card = document.createElement('div');
        card.className = 'drawer-item-card';
        card.innerHTML = `
            <img src="${encodeURIComponent(breed.images[0])}" class="drawer-item-img" alt="${breed.name}">
            <div class="drawer-item-info">
                <h4>${breed.name}</h4>
                <p>₹${breed.price_inr_min.toLocaleString()} - ₹${breed.price_inr_max.toLocaleString()}</p>
                <div style="font-size: 10px; color: var(--text-muted);">Locations: ${breed.locations.join(', ')}</div>
            </div>
            <div class="drawer-item-actions">
                <button class="card-btn btn-cart" style="padding: 6px 12px; font-size: 11px; width: 100%; margin-bottom: 4px;" onclick="addToCart('${breed.name}')">
                    <i class="fa-solid fa-cart-plus"></i> Add Cart
                </button>
                <button class="remove-item-btn" onclick="toggleSavePuppy('${breed.name}')" style="font-size: 11px;">
                    <i class="fa-solid fa-heart-crack"></i> Unsave
                </button>
            </div>
        `;
        list.appendChild(card);
    });
}

// Modal Form Controls
function openReserveModal(breedName, priceText) {
    if (!currentUser) {
        alert("Please login or create an account to reserve a puppy.");
        openAuthModal();
        return;
    }
    document.getElementById('reserveBreedName').innerText = breedName;
    document.getElementById('reserveBreedPrices').innerText = `Price range: ${priceText}`;
    document.getElementById('reserveBreedId').value = breedName;
    
    document.getElementById('reserveModal').classList.add('active');
}

function closeReserveModal() {
    document.getElementById('reserveModal').classList.remove('active');
    document.getElementById('reserveForm').reset();
}

function openConfirmModal(id, title, message) {
    document.getElementById('confirmId').innerText = id;
    document.getElementById('confirmTitle').innerText = title;
    document.getElementById('confirmMessage').innerText = message;
    
    document.getElementById('confirmModal').classList.add('active');
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
}

// Admin Panel Fetch & Render
async function openAdminPanel() {
    try {
        let response = await fetch('/api/admin/dashboard');
        let data;
        if (!response.ok) {
            // Netlify fallback
            const netlifyReservations = JSON.parse(localStorage.getItem('netlify_reservations') || '[]');
            const netlifyOrders = JSON.parse(localStorage.getItem('netlify_orders') || '[]');
            data = { reservations: netlifyReservations, orders: netlifyOrders };
        } else {
            data = await response.json();
        }
        
        renderAdminDashboard(data);
        document.getElementById('adminModal').classList.add('active');
    } catch (error) {
        console.error('Error fetching admin data:', error);
        alert('Could not access admin logs.');
    }
}

function closeAdminPanel() {
    document.getElementById('adminModal').classList.remove('active');
}

function renderAdminDashboard(data) {
    const resBody = document.getElementById('adminReservationsBody');
    const orderBody = document.getElementById('adminOrdersBody');
    
    resBody.innerHTML = '';
    orderBody.innerHTML = '';
    
    const reservations = data.reservations || [];
    const orders = data.orders || [];
    
    if (reservations.length === 0) {
        resBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">No reservations submitted yet.</td></tr>`;
    } else {
        // Sort descending by date/id
        reservations.reverse().forEach(res => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${res.bookingId}</strong></td>
                <td>${res.date}</td>
                <td><span class="hub-badge" style="background-color:var(--primary-light); color:var(--primary);">${res.breed}</span></td>
                <td>${res.name}</td>
                <td><a href="tel:${res.contactNo}" style="color:var(--primary); font-weight:700;"><i class="fa-solid fa-phone"></i> ${res.contactNo}</a></td>
                <td>${res.location}</td>
            `;
            resBody.appendChild(tr);
        });
    }
    
    if (orders.length === 0) {
        orderBody.innerHTML = `<tr><td colspan="7" style="text-align: center;">No COD orders submitted yet.</td></tr>`;
    } else {
        orders.reverse().forEach(ord => {
            const tr = document.createElement('tr');
            
            // Format cart items summary
            const itemsStr = ord.items.map(it => `${it.name} (x${it.qty})`).join(', ');
            
            tr.innerHTML = `
                <td><strong>${ord.orderId}</strong></td>
                <td>${ord.date}</td>
                <td style="max-width:240px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${itemsStr}">
                    ${itemsStr}
                </td>
                <td>${ord.name}</td>
                <td><a href="tel:${ord.contactNo}" style="color:var(--primary); font-weight:700;"><i class="fa-solid fa-phone"></i> ${ord.contactNo}</a></td>
                <td>${ord.location}</td>
                <td><strong>₹${ord.totalPriceInr.toLocaleString()} / $${ord.totalPriceUsd.toLocaleString()}</strong></td>
            `;
            orderBody.appendChild(tr);
        });
    }
}

// Initializing Event Listeners
function initializeEventListeners() {
    // Drawer buttons triggers
    document.getElementById('openCartBtn').addEventListener('click', () => {
        document.getElementById('cartDrawer').classList.add('active');
        document.getElementById('cartOverlay').classList.add('active');
    });
    
    document.getElementById('closeCartBtn').addEventListener('click', () => {
        document.getElementById('cartDrawer').classList.remove('active');
        document.getElementById('cartOverlay').classList.remove('active');
    });
    
    document.getElementById('cartOverlay').addEventListener('click', () => {
        document.getElementById('cartDrawer').classList.remove('remove');
        document.getElementById('cartDrawer').classList.remove('active');
        document.getElementById('cartOverlay').classList.remove('active');
    });

    document.getElementById('openSavedBtn').addEventListener('click', () => {
        document.getElementById('savedDrawer').classList.add('active');
        document.getElementById('savedOverlay').classList.add('active');
    });
    
    document.getElementById('closeSavedBtn').addEventListener('click', () => {
        document.getElementById('savedDrawer').classList.remove('active');
        document.getElementById('savedOverlay').classList.remove('active');
    });
    
    document.getElementById('savedOverlay').addEventListener('click', () => {
        document.getElementById('savedDrawer').classList.remove('active');
        document.getElementById('savedOverlay').classList.remove('active');
    });

    // Close Modals
    document.getElementById('closeReserveBtn').addEventListener('click', closeReserveModal);
    document.getElementById('closeConfirmBtn').addEventListener('click', closeConfirmBtnAction);
    document.getElementById('closeAdminBtn').addEventListener('click', closeAdminPanel);
    
    // Auth Modal event listeners
    document.getElementById('openAuthBtn').addEventListener('click', openAuthModal);
    document.getElementById('closeAuthBtn').addEventListener('click', closeAuthModal);
    
    document.getElementById('tabBtnLogin').addEventListener('click', () => switchAuthTab('login'));
    document.getElementById('tabBtnRegister').addEventListener('click', () => switchAuthTab('register'));
    
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    document.getElementById('adminDashboardLinkBtn').addEventListener('click', () => {
        closeAuthModal();
        openAdminPanel();
    });

    function closeConfirmBtnAction() {
        closeConfirmModal();
    }

    // Reservation Submit Form Action
    document.getElementById('reserveForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const breed = document.getElementById('reserveBreedId').value;
        const name = document.getElementById('customerName').value;
        const contactNo = document.getElementById('customerPhone').value;
        const location = document.getElementById('customerLocation').value;
        
        // Populate hidden fields for Netlify Forms
        const emailField = document.getElementById('reserveCustomerEmailHidden');
        if (emailField) emailField.value = currentUser ? currentUser.username : '';
        const subjectField = document.getElementById('reserveFormSubject');
        if (subjectField) subjectField.value = `Puppy Reservation Request for ${breed} - CB_Dogs_Hub`;
        
        try {
            let response = await fetch('/api/reserve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, contactNo, location, breed })
            });
            
            let data;
            if (!response.ok) {
                // Netlify fallback
                const bookingId = "RES" + Math.floor(100000 + Math.random() * 900000);
                const newRes = {
                    bookingId,
                    name,
                    contactNo,
                    location,
                    breed,
                    date: new Date().toISOString().replace('T', ' ').substring(0, 19)
                };
                const netlifyReservations = JSON.parse(localStorage.getItem('netlify_reservations') || '[]');
                netlifyReservations.push(newRes);
                localStorage.setItem('netlify_reservations', JSON.stringify(netlifyReservations));
                
                // Submit to Netlify forms in background
                const formObj = document.getElementById('reserveForm');
                const formData = new FormData(formObj);
                try {
                    await fetch('/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams(formData).toString()
                    });
                    console.log("Netlify reservation form submitted successfully");
                } catch (netlifyErr) {
                    console.error("Netlify form submit failed:", netlifyErr);
                }
                
                data = { success: true, bookingId };
            } else {
                data = await response.json();
            }
            
            if (data.success) {
                closeReserveModal();
                openConfirmModal(
                    data.bookingId,
                    "Reservation Logged!",
                    `Your reservation request for a ${breed} puppy has been logged successfully.`
                );
            }
        } catch (error) {
            console.error('Error submitting reservation:', error);
            alert('Failed to submit reservation.');
        }
    });

    // Checkout Submit Form Action
    document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('cartCustomerName').value;
        const contactNo = document.getElementById('cartCustomerPhone').value;
        const location = document.getElementById('cartCustomerLocation').value;
        const address = document.getElementById('cartCustomerAddress').value;
        
        // Populate hidden fields for Netlify Forms
        const emailField = document.getElementById('cartCustomerEmailHidden');
        if (emailField) emailField.value = currentUser ? currentUser.username : '';
        const subjectField = document.getElementById('cartFormSubject');
        if (subjectField) subjectField.value = `New COD Booking Placement - CB_Dogs_Hub`;
        
        const itemsList = Object.values(shoppingCart).map(item => ({
            name: item.name,
            qty: item.qty,
            price_inr: item.price_inr,
            price_usd: item.price_usd
        }));
        
        const totalInr = Object.values(shoppingCart).reduce((a, b) => a + (b.price_inr * b.qty), 0);
        const totalUsd = Object.values(shoppingCart).reduce((a, b) => a + (b.price_usd * b.qty), 0);
        
        try {
            let response = await fetch('/api/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    contactNo,
                    location: `${location} (${address})`,
                    items: itemsList,
                    totalPriceInr: totalInr,
                    totalPriceUsd: totalUsd
                })
            });
            
            let data;
            if (!response.ok) {
                // Netlify fallback
                const orderId = "ORD" + Math.floor(100000 + Math.random() * 900000);
                const newOrder = {
                    orderId,
                    name,
                    contactNo,
                    location: `${location} (${address})`,
                    items: itemsList,
                    totalPriceInr: totalInr,
                    totalPriceUsd: totalUsd,
                    date: new Date().toISOString().replace('T', ' ').substring(0, 19)
                };
                const netlifyOrders = JSON.parse(localStorage.getItem('netlify_orders') || '[]');
                netlifyOrders.push(newOrder);
                localStorage.setItem('netlify_orders', JSON.stringify(netlifyOrders));
                
                // Populate hidden fields for Netlify Forms
                document.getElementById('cartOrderItemsHidden').value = JSON.stringify(itemsList);
                document.getElementById('cartTotalPriceHidden').value = `INR ${totalInr.toLocaleString()} / USD ${totalUsd.toLocaleString()}`;
                
                // Submit to Netlify forms in background
                const formObj = document.getElementById('checkoutForm');
                const formData = new FormData(formObj);
                try {
                    await fetch('/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams(formData).toString()
                    });
                    console.log("Netlify checkout order form submitted successfully");
                } catch (netlifyErr) {
                    console.error("Netlify form submit failed:", netlifyErr);
                }
                
                data = { success: true, orderId };
            } else {
                data = await response.json();
            }
            
            if (data.success) {
                // Clear cart
                shoppingCart = {};
                updateCartCount();
                renderCart();
                
                // Close cart drawer
                document.getElementById('cartDrawer').classList.remove('active');
                document.getElementById('cartOverlay').classList.remove('active');
                
                // Reset checkout form
                document.getElementById('checkoutForm').reset();
                
                openConfirmModal(
                    data.orderId,
                    "COD Booking Placed!",
                    "Your Cash on Delivery order has been registered! A representative will call you to confirm your address and schedule the delivery/pickup."
                );
            }
        } catch (error) {
            console.error('Error checking out:', error);
            alert('Failed to check out order.');
        }
    });

    // Search input handler (debounced or simple keyup)
    document.getElementById('breedSearchInput').addEventListener('input', (e) => {
        currentSearchQuery = e.target.value;
        renderBreeds();
    });

    // Location Filter Chips triggers
    const chips = document.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilterLocation = chip.dataset.location;
            renderBreeds();
        });
    });

    // Sort selection trigger
    document.getElementById('sortBySelect').addEventListener('change', (e) => {
        currentSortOption = e.target.value;
        renderBreeds();
    });

    // Admin Dashboard tabs switcher
    const tabBtns = document.querySelectorAll('.admin-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const targetTab = btn.dataset.tab;
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`tab-${targetTab}`).classList.add('active');
        });
    });

    // Add Breed Form Action
    const addBreedForm = document.getElementById('addBreedForm');
    if (addBreedForm) {
        addBreedForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('addBreedName').value.trim();
            const description = document.getElementById('addBreedDescription').value.trim();
            const colors_raw = document.getElementById('addBreedColors').value.trim();
            
            const locations = [];
            if (document.getElementById('addLocCb').checked) locations.push("Chikkaballapur");
            
            if (locations.length === 0) {
                alert("Please select at least one hub location.");
                return;
            }
            
            const price_inr_min = parseInt(document.getElementById('addPriceMin').value);
            const price_inr_max = parseInt(document.getElementById('addPriceMax').value);
            
            if (price_inr_min > price_inr_max) {
                alert("Minimum price cannot be greater than maximum price.");
                return;
            }
            
            const imagesStr = document.getElementById('addBreedImages').value.trim();
            const images = imagesStr.split(',').map(s => s.trim()).filter(s => s !== "");
            
            if (images.length === 0) {
                alert("Please specify at least one image filename.");
                return;
            }
            
            try {
                let response = await fetch('/api/admin/add-breed', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        description,
                        colors_raw,
                        locations: JSON.stringify(locations),
                        price_inr_min,
                        price_inr_max,
                        images: JSON.stringify(images)
                    })
                });
                
                let data;
                if (!response.ok) {
                    // Netlify fallback: save to localStorage
                    const newBreed = {
                        name,
                        description,
                        colors_raw,
                        locations,
                        price_inr_min,
                        price_inr_max,
                        price_usd_min: Math.round(price_inr_min / 83),
                        price_usd_max: Math.round(price_inr_max / 83),
                        images
                    };
                    const netlifyBreeds = JSON.parse(localStorage.getItem('netlify_breeds') || '[]');
                    netlifyBreeds.push(newBreed);
                    localStorage.setItem('netlify_breeds', JSON.stringify(netlifyBreeds));
                    data = { success: true };
                } else {
                    data = await response.json();
                }
                
                if (data.success) {
                    alert(`Successfully added breed "${name}"!`);
                    addBreedForm.reset();
                    closeAdminPanel();
                    fetchBreeds();
                }
            } catch (error) {
                console.error('Error adding breed:', error);
                alert('Failed to add breed.');
            }
        });
    }

    // Avatar file upload listener
    const avatarInput = document.getElementById('avatarUploadInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (file.size > 2 * 1024 * 1024) {
                alert("Please select an image smaller than 2MB.");
                return;
            }
            
            const reader = new FileReader();
            reader.onload = async () => {
                const base64Data = reader.result;
                try {
                    let response = await fetch('/api/user/update-avatar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: currentUser.username, avatar: base64Data })
                    });
                    
                    if (!response.ok) {
                        // Netlify fallback
                        const users = JSON.parse(localStorage.getItem('netlify_users') || '[]');
                        const u = users.find(x => x.email.toLowerCase() === currentUser.username.toLowerCase());
                        if (u) {
                            u.avatar = base64Data;
                            localStorage.setItem('netlify_users', JSON.stringify(users));
                        }
                    }
                    
                    currentUser.avatar = base64Data;
                    localStorage.setItem('current_user', JSON.stringify(currentUser));
                    
                    document.getElementById('profileAvatarImg').src = base64Data;
                    const removeBtn = document.getElementById('removeAvatarBtn');
                    if (removeBtn) removeBtn.style.display = 'flex';
                    
                    updateAuthUI();
                    alert("Profile photo updated successfully!");
                } catch (err) {
                    console.error("Error updating avatar:", err);
                    alert("Failed to update profile photo.");
                }
            };
            reader.readAsDataURL(file);
        });
    }
}

// Remove Profile Photo Action
async function removeProfilePhoto() {
    if (!currentUser) return;
    
    if (!confirm("Are you sure you want to remove your profile photo?")) return;
    
    try {
        let response = await fetch('/api/user/update-avatar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.username, avatar: "" })
        });
        
        if (!response.ok) {
            // Netlify fallback
            const users = JSON.parse(localStorage.getItem('netlify_users') || '[]');
            const u = users.find(x => x.email.toLowerCase() === currentUser.username.toLowerCase());
            if (u) {
                u.avatar = "";
                localStorage.setItem('netlify_users', JSON.stringify(users));
            }
        }
        
        currentUser.avatar = "";
        localStorage.setItem('current_user', JSON.stringify(currentUser));
        
        const avatarImg = document.getElementById('profileAvatarImg');
        if (avatarImg) {
            avatarImg.src = currentUser.role === 'admin'
                ? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f26a36"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>'
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.fullName)}&background=fdf0ed&color=f26a36&size=128&bold=true`;
        }
        
        const removeBtn = document.getElementById('removeAvatarBtn');
        if (removeBtn) removeBtn.style.display = 'none';
        
        updateAuthUI();
        alert("Profile photo removed successfully!");
    } catch (err) {
        console.error("Error removing avatar:", err);
        alert("Failed to remove profile photo.");
    }
}

// Edit Contact Number Action
async function editContactNumber() {
    if (!currentUser) return;
    
    const newPhone = prompt("Enter new 10-digit contact number:", currentUser.phone || "");
    if (newPhone === null) return; // user cancelled
    
    const phoneTrimmed = newPhone.trim();
    if (phoneTrimmed === "" || !/^\d{10}$/.test(phoneTrimmed)) {
        alert("Please enter a valid 10-digit contact number.");
        return;
    }
    
    try {
        let response = await fetch('/api/user/update-phone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.username, phone: phoneTrimmed })
        });
        
        if (!response.ok) {
            // Netlify fallback
            const users = JSON.parse(localStorage.getItem('netlify_users') || '[]');
            const u = users.find(x => x.email.toLowerCase() === currentUser.username.toLowerCase());
            if (u) {
                u.phone = phoneTrimmed;
                localStorage.setItem('netlify_users', JSON.stringify(users));
            }
        }
        
        currentUser.phone = phoneTrimmed;
        localStorage.setItem('current_user', JSON.stringify(currentUser));
        
        document.getElementById('profilePhone').innerText = phoneTrimmed;
        
        alert("Contact number updated successfully!");
    } catch (err) {
        console.error("Error updating phone:", err);
        alert("Failed to update contact number.");
    }
}

// Load User State
function loadCurrentUser() {
    const saved = localStorage.getItem('current_user');
    if (saved) {
        currentUser = JSON.parse(saved);
    } else {
        currentUser = null;
    }
    updateAuthUI();
}

// Update UI elements based on authentication state
function updateAuthUI() {
    const label = document.getElementById('authBtnLabel');
    const icon = document.getElementById('authIcon');
    
    let avatarImg = document.getElementById('authHeaderAvatar');
    if (!avatarImg) {
        avatarImg = document.createElement('img');
        avatarImg.id = 'authHeaderAvatar';
        avatarImg.style.width = '20px';
        avatarImg.style.height = '20px';
        avatarImg.style.borderRadius = '50%';
        avatarImg.style.objectFit = 'cover';
        avatarImg.style.marginRight = '6px';
        avatarImg.style.border = '1px solid var(--primary)';
        avatarImg.style.display = 'none';
        icon.parentNode.insertBefore(avatarImg, icon);
    }
    
    if (currentUser) {
        const firstName = currentUser.fullName.split(' ')[0];
        label.innerText = currentUser.role === 'admin' ? 'Admin' : `Hi, ${firstName}`;
        
        let avatarUrl = currentUser.avatar;
        if (!avatarUrl) {
            avatarUrl = currentUser.role === 'admin'
                ? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f26a36"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>'
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.fullName)}&background=fdf0ed&color=f26a36&size=128&bold=true`;
        }
            
        avatarImg.src = avatarUrl;
        avatarImg.style.display = 'inline-block';
        icon.style.display = 'none';
    } else {
        label.innerText = 'Login';
        avatarImg.style.display = 'none';
        icon.style.display = 'inline-block';
        icon.className = 'fa-solid fa-circle-user';
    }
    
    fillFormsWithUser();
}

// Pre-fill Forms with User Details
function fillFormsWithUser() {
    if (currentUser) {
        // Pre-fill reserve form
        const nameField = document.getElementById('customerName');
        const phoneField = document.getElementById('customerPhone');
        const locField = document.getElementById('customerLocation');
        if (nameField) nameField.value = currentUser.fullName || '';
        if (phoneField) phoneField.value = currentUser.phone || '';
        if (locField) locField.value = currentUser.location || '';

        // Pre-fill checkout form
        const cartNameField = document.getElementById('cartCustomerName');
        const cartPhoneField = document.getElementById('cartCustomerPhone');
        const cartLocField = document.getElementById('cartCustomerLocation');
        if (cartNameField) cartNameField.value = currentUser.fullName || '';
        if (cartPhoneField) cartPhoneField.value = currentUser.phone || '';
        if (cartLocField) cartLocField.value = currentUser.location || '';
    } else {
        // Clear fields (but do not crash if not on page)
        const reserveForm = document.getElementById('reserveForm');
        const checkoutForm = document.getElementById('checkoutForm');
        if (reserveForm) reserveForm.reset();
        if (checkoutForm) checkoutForm.reset();
    }
}

// Auth Modal Controls
function openAuthModal() {
    document.getElementById('authModal').classList.add('active');
    
    if (currentUser) {
        // Show Profile View
        document.getElementById('authTabs').style.display = 'none';
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('profileView').style.display = 'block';
        
        // Render Profile Data
        document.getElementById('profileName').innerText = currentUser.fullName;
        document.getElementById('profileRole').innerText = currentUser.role;
        document.getElementById('profileUsername').innerText = currentUser.username;
        document.getElementById('profilePhone').innerText = currentUser.phone || 'Not provided';
        document.getElementById('profileLoc').innerText = currentUser.location || 'Not provided';
        
        const avatarImg = document.getElementById('profileAvatarImg');
        const removeBtn = document.getElementById('removeAvatarBtn');
        if (avatarImg) {
            let avatarUrl = currentUser.avatar;
            if (avatarUrl) {
                avatarImg.src = avatarUrl;
                if (removeBtn) removeBtn.style.display = 'flex';
            } else {
                avatarImg.src = currentUser.role === 'admin'
                    ? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f26a36"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>'
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.fullName)}&background=fdf0ed&color=f26a36&size=128&bold=true`;
                if (removeBtn) removeBtn.style.display = 'none';
            }
        }
        
        // Show Admin button if admin
        const adminBtn = document.getElementById('adminDashboardLinkBtn');
        if (currentUser.role === 'admin') {
            adminBtn.style.display = 'block';
        } else {
            adminBtn.style.display = 'none';
        }
        
        loadUserHistory();
    } else {
        // Show Login View
        document.getElementById('authTabs').style.display = 'flex';
        document.getElementById('profileView').style.display = 'none';
        
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        if (loginForm) loginForm.reset();
        if (registerForm) registerForm.reset();
        
        switchAuthTab('login');
    }
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
}

// Switch between Login and Register Tabs
function switchAuthTab(tab) {
    const loginBtn = document.getElementById('tabBtnLogin');
    const regBtn = document.getElementById('tabBtnRegister');
    const loginForm = document.getElementById('loginForm');
    const regForm = document.getElementById('registerForm');
    
    if (tab === 'login') {
        loginBtn.classList.add('active');
        regBtn.classList.remove('active');
        loginForm.style.display = 'block';
        regForm.style.display = 'none';
        document.getElementById('authModalTitle').innerText = 'User Login';
    } else {
        loginBtn.classList.remove('active');
        regBtn.classList.add('active');
        loginForm.style.display = 'none';
        regForm.style.display = 'block';
        document.getElementById('authModalTitle').innerText = 'Create Account';
    }
}

// Handle Login Form Submission
async function handleLogin(e) {
    e.preventDefault();
    const userVal = document.getElementById('loginUsername').value.trim();
    const passVal = document.getElementById('loginPassword').value;
    
    try {
        let response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: userVal, password: passVal })
        });
        
        let data;
        if (!response.ok) {
            // Netlify fallback
            const netlifyUsers = JSON.parse(localStorage.getItem('netlify_users') || '[]');
            if (!netlifyUsers.some(u => u.email === 'admin')) {
                netlifyUsers.push({
                    fullName: "Site Administrator",
                    email: "admin",
                    phone: "9663872853",
                    location: "Chikkaballapur",
                    password: "admin123",
                    role: "admin"
                });
            }
            if (!netlifyUsers.some(u => u.email === 'user')) {
                netlifyUsers.push({
                    fullName: "Tejas H V",
                    email: "user",
                    phone: "9663872853",
                    location: "Chikkaballapur",
                    password: "user123",
                    role: "user"
                });
            }
            localStorage.setItem('netlify_users', JSON.stringify(netlifyUsers));
            
            const matchedUser = netlifyUsers.find(u => u.email.toLowerCase() === userVal.toLowerCase() && u.password === passVal);
            if (!matchedUser) {
                throw new Error('Invalid credentials');
            }
            data = { success: true, user: { username: matchedUser.email, fullName: matchedUser.fullName, phone: matchedUser.phone, location: matchedUser.location, role: matchedUser.role || 'user', avatar: matchedUser.avatar || "" } };
        } else {
            data = await response.json();
        }
        
        if (data.success && data.user) {
            currentUser = data.user;
            localStorage.setItem('current_user', JSON.stringify(currentUser));
            
            // Log login event
            const logEntry = {
                date: new Date().toLocaleDateString('en-CA'),
                type: 'Login',
                details: 'Logged into account successfully'
            };
            const logsRaw = localStorage.getItem(`session_logs_${currentUser.username}`);
            const logs = logsRaw ? JSON.parse(logsRaw) : [];
            logs.push(logEntry);
            localStorage.setItem(`session_logs_${currentUser.username}`, JSON.stringify(logs));
            
            updateAuthUI();
            closeAuthModal();
        }
    } catch (error) {
        console.error('Error logging in:', error);
        alert(error.message || 'Login failed. Please check your username and password.');
    }
}

// Handle Register Form Submission
async function handleRegister(e) {
    e.preventDefault();
    const fullName = document.getElementById('regFullName').value.trim();
    const username = document.getElementById('regUsername').value.trim().toLowerCase();
    const phone = document.getElementById('regPhone').value.trim();
    const location = document.getElementById('regLocation').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    if (password !== confirmPassword) {
        alert("Passwords do not match. Please re-enter your password.");
        return;
    }
    
    try {
        let response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, username, phone, location, password })
        });
        
        let data;
        if (!response.ok) {
            // Netlify fallback
            const netlifyUsers = JSON.parse(localStorage.getItem('netlify_users') || '[]');
            if (netlifyUsers.some(u => u.email.toLowerCase() === username.toLowerCase())) {
                throw new Error('Email address already registered');
            }
            const newUser = { fullName, email: username, phone, location, password, role: 'user', avatar: "" };
            netlifyUsers.push(newUser);
            localStorage.setItem('netlify_users', JSON.stringify(netlifyUsers));
            data = { success: true, user: { username, fullName, phone, location, role: 'user', avatar: "" } };
        } else {
            data = await response.json();
        }
        
        if (data.success && data.user) {
            currentUser = data.user;
            localStorage.setItem('current_user', JSON.stringify(currentUser));
            
            // Log register event
            const logEntry = {
                date: new Date().toLocaleDateString('en-CA'),
                type: 'Register',
                details: 'Created account and logged in'
            };
            const logsRaw = localStorage.getItem(`session_logs_${currentUser.username}`);
            const logs = logsRaw ? JSON.parse(logsRaw) : [];
            logs.push(logEntry);
            localStorage.setItem(`session_logs_${currentUser.username}`, JSON.stringify(logs));
            
            updateAuthUI();
            closeAuthModal();
            alert("Account registered and logged in successfully!");
        }
    } catch (error) {
        console.error('Error registering:', error);
        alert(error.message || 'Registration failed.');
    }
}

// Handle Logout
function handleLogout() {
    if (currentUser) {
        // Log logout event
        const logEntry = {
            date: new Date().toLocaleDateString('en-CA'),
            type: 'Logout',
            details: 'Logged out of account successfully'
        };
        const logsRaw = localStorage.getItem(`session_logs_${currentUser.username}`);
        const logs = logsRaw ? JSON.parse(logsRaw) : [];
        logs.push(logEntry);
        localStorage.setItem(`session_logs_${currentUser.username}`, JSON.stringify(logs));
    }
    
    currentUser = null;
    localStorage.removeItem('current_user');
    
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();
    
    updateAuthUI();
    closeAuthModal();
}

// Load and Render User History (Recent Reservations & Bookings)
async function loadUserHistory() {
    const sessionHistoryBody = document.getElementById('userSessionHistoryBody');
    const orderHistoryBody = document.getElementById('userOrderHistoryBody');
    
    sessionHistoryBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Loading logs...</td></tr>';
    orderHistoryBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Loading orders...</td></tr>';
    
    try {
        let response = await fetch('/api/admin/dashboard');
        let data;
        if (!response.ok) {
            // Netlify fallback
            const netlifyReservations = JSON.parse(localStorage.getItem('netlify_reservations') || '[]');
            const netlifyOrders = JSON.parse(localStorage.getItem('netlify_orders') || '[]');
            data = { reservations: netlifyReservations, orders: netlifyOrders };
        } else {
            data = await response.json();
        }
        
        const reservations = data.reservations || [];
        const orders = data.orders || [];
        
        // Filter by current user details (either username matching or phone number matching)
        const myRes = reservations.filter(r => 
            r.name.toLowerCase() === currentUser.fullName.toLowerCase() || 
            r.contactNo === currentUser.phone
        );
        const myOrders = orders.filter(o => 
            o.name.toLowerCase() === currentUser.fullName.toLowerCase() || 
            o.contactNo === currentUser.phone
        );
        
        sessionHistoryBody.innerHTML = '';
        orderHistoryBody.innerHTML = '';
        
        // 1. Populate Session History
        const sessionLogsRaw = localStorage.getItem(`session_logs_${currentUser.username}`);
        const sessionLogs = sessionLogsRaw ? JSON.parse(sessionLogsRaw) : [];
        
        // Sort sessions chronologically descending
        sessionLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (sessionLogs.length === 0) {
            sessionHistoryBody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);font-size:11px;">No login/logout history found.</td></tr>';
        } else {
            sessionLogs.forEach(s => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${s.date}</td>
                    <td><span class="hub-badge" style="background-color: var(--primary-light); color: var(--primary); padding:2px 6px; font-size:10px;">${s.type}</span></td>
                    <td style="font-size: 11px;">${s.details}</td>
                `;
                sessionHistoryBody.appendChild(tr);
            });
        }
        
        // 2. Populate Order & Booking History
        const orderActivities = [];
        
        myRes.forEach(r => {
            orderActivities.push({
                date: r.date.split(' ')[0], // only show date
                type: 'Reserve',
                details: `Reserved a ${r.breed} puppy (${r.bookingId})`
            });
        });
        
        myOrders.forEach(o => {
            const itemsSummary = o.items.map(it => `${it.name} (x${it.qty})`).join(', ');
            orderActivities.push({
                date: o.date.split(' ')[0],
                type: 'COD Order',
                details: `Ordered: ${itemsSummary} (Total: ₹${o.totalPriceInr.toLocaleString()})`
            });
        });
        
        // Sort order activities chronologically descending
        orderActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (orderActivities.length === 0) {
            orderHistoryBody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);font-size:11px;">No bookings or order logs found.</td></tr>';
        } else {
            orderActivities.forEach(act => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${act.date}</td>
                    <td><span class="hub-badge" style="background-color: var(--primary-light); color: var(--primary); padding:2px 6px; font-size:10px;">${act.type}</span></td>
                    <td style="font-size: 11px;">${act.details}</td>
                `;
                orderHistoryBody.appendChild(tr);
            });
        }
    } catch (e) {
        console.error('Error loading history:', e);
        sessionHistoryBody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#e63946;font-size:11px;">Could not fetch session logs.</td></tr>';
        orderHistoryBody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#e63946;font-size:11px;">Could not fetch orders.</td></tr>';
    }
}

// Lightbox modal operations
function openLightbox(src) {
    const lightbox = document.getElementById('imageLightbox');
    const img = document.getElementById('lightboxImg');
    if (lightbox && img) {
        img.src = src;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden'; // lock scroll
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('imageLightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = ''; // unlock scroll
    }
}

// Export user credentials from localStorage as base64 string
function exportSyncCode() {
    const netlifyUsers = localStorage.getItem('netlify_users') || '[]';
    try {
        const base64 = btoa(unescape(encodeURIComponent(netlifyUsers)));
        prompt("Copy this account sync code and paste it on your other device:", base64);
    } catch (e) {
        console.error(e);
        alert("Failed to generate sync code.");
    }
}

// Import user credentials from base64 string to localStorage
function importSyncCode() {
    const code = prompt("Paste the account sync code from your other device:");
    if (!code) return;
    
    try {
        const decoded = decodeURIComponent(escape(atob(code.trim())));
        const parsed = JSON.parse(decoded);
        if (!Array.isArray(parsed)) {
            throw new Error("Invalid format");
        }
        
        const localUsers = JSON.parse(localStorage.getItem('netlify_users') || '[]');
        
        let mergedCount = 0;
        parsed.forEach(pu => {
            if (!localUsers.some(lu => lu.email.toLowerCase() === pu.email.toLowerCase())) {
                localUsers.push(pu);
                mergedCount++;
            }
        });
        
        localStorage.setItem('netlify_users', JSON.stringify(localUsers));
        alert(`Successfully imported ${mergedCount} new user profile(s)! You can now log in using those credentials.`);
    } catch (e) {
        console.error(e);
        alert("Invalid sync code. Please check and try again.");
    }
}
