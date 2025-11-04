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
				if (!bubble) {
					bubble = document.createElement("div");
					bubble.className = "cart-bubble";
					bubble.innerHTML = `
						<span class="cart-bubble__background"></span>
						<span ref="cartBubbleText" id="cart-bubble-text" class="cart-bubble__text" role="status">
							<span class="visually-hidden">Total items in cart: ${itemCount}</span>
							<span class="cart-bubble__text-count" ref="cartBubbleCount" aria-hidden="true">${itemCount}</span>
						</span>`;
					cartIcon.appendChild(bubble);
				} else {
					const bubbleCount = bubble.querySelector(".cart-bubble__text-count");
					const hidden = bubble.querySelector(".visually-hidden");
					if (bubbleCount) bubbleCount.textContent = itemCount;
					if (hidden) hidden.textContent = `Total items in cart: ${itemCount}`;
					bubble.style.display = itemCount > 0 ? "flex" : "none";
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
          "variants",
          "description",
          "add_to_cart",
        ];

        // --- Build HTML sections
        const htmlParts = {
          image: `<div class="qv-image"><img id="qv-main-image" src="${product.images[0] || ''}" alt="${product.title}" /></div>`,
          title: `<h2 class="qv-title">${product.title}</h2>`,
          price: `<div id="qv-price" class="qv-price">$${(product.price / 100).toFixed(2)}</div>`,
          variants: product.variants.length > 1
            ? `<div class="qv-variants">
                <label for="qv-variant-select">Select Variant</label>
                <select id="qv-variant-select">
                  ${product.variants
                    .map(
                      (v) =>
                        `<option value="${v.id}" data-image="${
                          v.featured_image ? v.featured_image.src : product.images[0]
                        }" data-price="${(v.price / 100).toFixed(2)}">
                          ${v.title}
                        </option>`
                    )
                    .join("")}
                </select>
              </div>`
            : "",
          description: `<div class="qv-description">${product.description}</div>`,
          add_to_cart: `<button class="qv-atc-btn button add-to-cart-button" data-variant="${product.variants[0].id}">
            <span class="add-to-cart-text__content">Add to Cart</span>
          </button>`,
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

        // --- Variant switching
        const variantSelect = popupBody.querySelector("#qv-variant-select");
        const imageEl = popupBody.querySelector("#qv-main-image");
        const priceEl = popupBody.querySelector("#qv-price");
        const atcBtn = popupBody.querySelector(".qv-atc-btn");

        if (variantSelect) {
          variantSelect.addEventListener("change", (e) => {
            const selected = variantSelect.options[variantSelect.selectedIndex];
            const newImage = selected.dataset.image;
            const newPrice = selected.dataset.price;
            const newVariant = selected.value;

            if (imageEl && newImage) imageEl.src = newImage;
            if (priceEl && newPrice) priceEl.textContent = `$${newPrice}`;
            if (atcBtn) atcBtn.dataset.variant = newVariant;
          });
        }

        // --- Add to Cart button
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
