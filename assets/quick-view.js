	document.addEventListener("DOMContentLoaded", function () {
	const quickViewButtons = document.querySelectorAll(".quick-view-btn");

	// Refresh cart count and mini cart silently
	async function refreshCartUI() {
		try {
		const cartRes = await fetch("/cart.js");
		if (!cartRes.ok) throw new Error("Cart fetch failed");
		const cartData = await cartRes.json();
		const itemCount = cartData.item_count || 0;
		
		// --- Update cart bubble (for Horizon)
		const cartIcon = document.querySelector("cart-icon");
		if (cartIcon) {
			let bubble = cartIcon.querySelector(".cart-bubble");
			bubble.classList.remove('visually-hidden');
			let bubbleCount = cartIcon.querySelector("[ref='cartBubbleCount'], .cart-bubble__text-count");
			let bubbleText = cartIcon.querySelector("[ref='cartBubbleText'], #cart-bubble-text");

			// If bubble does not exist (first item added), create it
			if (bubble) {
			const bubbleCountEl = bubble.querySelector(".cart-bubble__text-count");

				if (bubbleCountEl) {
					const count = parseInt(bubbleCountEl.textContent.trim(), 10);

					if (count === 0) {
						bubble = document.createElement("div");
							bubble.className = "cart-bubble";
							bubble.innerHTML = `
							<span class="cart-bubble__background"></span>
							<span ref="cartBubbleText" id="cart-bubble-text" class="cart-bubble__text" role="status">
							<span class="visually-hidden">Total items in cart: ${itemCount}</span>
							<span class="cart-bubble__text-count" ref="cartBubbleCount" aria-hidden="true">${itemCount}</span>
							</span>
						`;
						const countEl = bubble.querySelector(".cart-bubble__text-count");
						if (countEl) countEl.classList.remove("hidden");
						cartIcon.appendChild(bubble);
					} else {
						// Update count if bubble already exists
						bubbleCount = bubble.querySelector("[ref='cartBubbleCount'], .cart-bubble__text-count");
						bubbleText = bubble.querySelector("[ref='cartBubbleText'], #cart-bubble-text");

						if (bubbleCount) bubbleCount.textContent = itemCount;
						if (bubbleText) {
							const hidden = bubbleText.querySelector(".visually-hidden");
							if (hidden) hidden.textContent = `Total items in cart: ${itemCount}`;
						}

						bubble.style.display = itemCount > 0 ? "flex" : "none";
					}
				}
			}

			// Subtle pulse animation feedback
			if (bubbleCount) {
			bubbleCount.classList.add("cart-bubble-updated");
			setTimeout(() => bubbleCount.classList.remove("cart-bubble-updated"), 400);
			}
		}

		// --- Refresh mini cart silently (without opening)
		const miniCartContainer =
			document.querySelector("cart-drawer") ||
			document.querySelector(".mini-cart") ||
			document.querySelector("[data-mini-cart]");

		if (miniCartContainer) {
			const res = await fetch("/?sections=mini-cart,cart-drawer");
			if (res.ok) {
			const html = await res.text();
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, "text/html");
			const newMiniCart =
				doc.querySelector(".mini-cart") ||
				doc.querySelector("[data-mini-cart]") ||
				doc.querySelector("cart-drawer");
			if (newMiniCart) {
				miniCartContainer.innerHTML = newMiniCart.innerHTML;
			}
			}
		}
		} catch (err) {
		console.error("Cart refresh failed:", err);
		}
	}

	// Open Quick View popup
	quickViewButtons.forEach((button) => {
		button.addEventListener("click", async function (e) {
		e.preventDefault();

		const handle = this.dataset.handle;
		const popup = document.getElementById("quick-view-popup");
		const popupBody = document.getElementById("quick-view-body");
		if (!popup || !popupBody) return;

		popup.classList.add("active");
		document.body.classList.add("no-scroll");
		popupBody.innerHTML = "<p>Loading...</p>";

		try {
			const response = await fetch(`/products/${handle}.js`);
			const product = await response.json();

			const order = window.quickViewBlocks || [
			"image",
			"title",
			"price",
			"description",
			"add_to_cart",
			];

			const htmlParts = {
			image: `<div class="qv-image"><img src="${product.images[0]}" alt="${product.title}" /></div>`,
			title: `<h2 class="qv-title">${product.title}</h2>`,
			price: `<div ref="priceContainer"><span class="price">$${(product.price / 100).toFixed(2)}</span></div>`,
			description: `<div class="qv-description">${product.description}</div>`,
			add_to_cart: `<button class="qv-atc-btn button add-to-cart-button button" data-variant="${product.variants[0].id}"><span class="add-to-cart-text"><span class="svg-wrapper add-to-cart-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="var(--icon-stroke-width)" d="M16.608 9.421V6.906H3.392v8.016c0 .567.224 1.112.624 1.513.4.402.941.627 1.506.627H8.63M8.818 3h2.333c.618 0 1.212.247 1.649.686a2.35 2.35 0 0 1 .683 1.658v1.562H6.486V5.344c0-.622.246-1.218.683-1.658A2.33 2.33 0 0 1 8.82 3"></path><path stroke="currentColor" stroke-linecap="round" stroke-width="var(--icon-stroke-width)" d="M14.608 12.563v5m2.5-2.5h-5"></path></svg>
</span><span class="add-to-cart-text__content">Add to cart</span><div></div></span></button>`,
			};

			let finalHTML = "";
			order.forEach((blockType) => {
			if (htmlParts[blockType]) finalHTML += htmlParts[blockType];
			});

			popupBody.innerHTML = finalHTML;

			// Apply font styles
			const fontSizeDesktop = window.quickViewFontSizes?.desktop || 16;
			const fontSizeMobile = window.quickViewFontSizes?.mobile || 14;
			const lineHeightDesktop = window.quickViewFontSizes?.lhd || 1.5;
			const lineHeightMobile = window.quickViewFontSizes?.lhm || 1.3;

			const style = document.createElement("style");
			style.innerHTML = `
			#quick-view-popup { font-size: ${fontSizeDesktop}px; line-height: ${lineHeightDesktop}px; }
			@media (max-width: 767px) {
				#quick-view-popup { font-size: ${fontSizeMobile}px; line-height: ${lineHeightMobile}px; }
			}
			`;
			document.head.appendChild(style);

			// Add to Cart handler
			const atcBtn = popupBody.querySelector(".qv-atc-btn");
			if (atcBtn) {
			atcBtn.addEventListener("click", async () => {
				const variantId = atcBtn.dataset.variant;
				atcBtn.disabled = true;
				atcBtn.textContent = "Adding...";

				try {
				const res = await fetch("/cart/add.js", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ id: variantId, quantity: 1 }),
				});

				if (!res.ok) throw new Error("Add to cart failed");
				await res.json();

				await refreshCartUI();

				atcBtn.textContent = "Added!";
				setTimeout(() => {
					atcBtn.textContent = "Add to Cart";
					atcBtn.disabled = false;
				}, 1000);
				} catch (err) {
				console.error("Add to cart error:", err);
				atcBtn.textContent = "Add to Cart";
				atcBtn.disabled = false;
				}
			});
			}
		} catch (err) {
			console.error("Quick View error:", err);
			popupBody.innerHTML = "<p>Error loading product details.</p>";
		}
		});
	});

	// Close popup
	document.addEventListener("click", (e) => {
		if (
		e.target.classList.contains("quick-view-close") ||
		e.target.classList.contains("quick-view-overlay")
		) {
		const popup = document.getElementById("quick-view-popup");
		if (popup) popup.classList.remove("active");
		document.body.classList.remove("no-scroll");
		}
	});
	});
