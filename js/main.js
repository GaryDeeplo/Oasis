/**
 * main.js - Vanilla JS replacement for the Webflow runtime
 * L'Oasis Familiale - https://oasis-familiale.com
 *
 * Handles:
 *  1. Scroll-triggered fade-in animations (IntersectionObserver)
 *  2. Mobile hamburger navigation toggle
 *  3. Tab system (.w-tabs)
 *  4. FAQ / Accordion (.faq-wrapper)
 *  5. Image fade-in on scroll
 *  6. Google Maps placeholder for .w-widget-map
 *  7. Smooth scroll for anchor links
 *  8. Contact form handling
 *
 * No dependencies - pure vanilla JS.
 */

document.addEventListener('DOMContentLoaded', function () {

  /* ==========================================================================
   * 1. SCROLL-TRIGGERED FADE-IN ANIMATIONS
   * Elements that have inline style opacity:0 and a translate3d(0, Npx, 0)
   * transform should animate into view when scrolled into the viewport.
   * ========================================================================== */

  (function initScrollAnimations() {
    // Collect every element that Webflow marked with data-w-id AND has opacity:0
    // inline.  These are the "appear on scroll" elements.
    var candidates = document.querySelectorAll('[data-w-id]');
    var animatable = [];

    candidates.forEach(function (el) {
      // Only pick elements whose *inline* style starts them as invisible.
      // We check the raw style attribute rather than getComputedStyle to
      // target only elements explicitly hidden by Webflow interactions.
      var inlineStyle = el.getAttribute('style') || '';
      if (inlineStyle.indexOf('opacity') !== -1 &&
          el.style.opacity === '0') {
        animatable.push(el);
        // Pre-set the CSS transition so the reveal is smooth
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        el.style.willChange = 'opacity, transform';
      }
    });

    // Also capture elements without data-w-id but with explicit opacity:0
    // inline and a translate3d transform (some Webflow builds omit data-w-id
    // on certain list items).
    document.querySelectorAll('[style*="opacity"]').forEach(function (el) {
      if (el.style.opacity === '0' && animatable.indexOf(el) === -1) {
        animatable.push(el);
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        el.style.willChange = 'opacity, transform';
      }
    });

    if (animatable.length === 0) return;

    // Use a stagger counter per batch so elements don't all pop in at once
    var staggerDelay = 80; // ms between each element in the same batch
    var batchMap = new Map(); // track stagger index per observation batch

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        var el = entry.target;

        // Calculate a small stagger delay based on position in the batch
        var batchKey = Math.round(entry.time / 100); // group entries in ~100ms window
        if (!batchMap.has(batchKey)) batchMap.set(batchKey, 0);
        var index = batchMap.get(batchKey);
        batchMap.set(batchKey, index + 1);

        var delay = index * staggerDelay;

        setTimeout(function () {
          el.style.opacity = '1';
          el.style.transform = 'translate3d(0, 0, 0) scale3d(1, 1, 1)';
        }, delay);

        observer.unobserve(el);
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    animatable.forEach(function (el) {
      observer.observe(el);
    });
  })();


  /* ==========================================================================
   * 2. MOBILE HAMBURGER NAVIGATION
   * .w-nav-button / .menu-button toggles the .w-nav-menu / .nav-menu.
   * Webflow uses the data-nav-menu-open attribute and .w--open class.
   * ========================================================================== */

  (function initMobileNav() {
    var navButtons = document.querySelectorAll('.w-nav-button');

    navButtons.forEach(function (btn) {
      var nav = btn.closest('.w-nav');
      if (!nav) return;
      var menu = nav.querySelector('.w-nav-menu');
      if (!menu) return;

      // Track open state
      var isOpen = false;

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        isOpen = !isOpen;

        if (isOpen) {
          btn.classList.add('w--open');
          menu.setAttribute('data-nav-menu-open', '');
          btn.setAttribute('aria-expanded', 'true');
          // Prevent body scroll when menu is open
          document.body.style.overflow = 'hidden';
        } else {
          btn.classList.remove('w--open');
          menu.removeAttribute('data-nav-menu-open');
          btn.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        }
      });

      // Close menu when a link inside it is clicked
      menu.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          if (isOpen) {
            isOpen = false;
            btn.classList.remove('w--open');
            menu.removeAttribute('data-nav-menu-open');
            btn.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
          }
        });
      });

      // Close menu if clicked outside
      document.addEventListener('click', function (e) {
        if (isOpen && !nav.contains(e.target)) {
          isOpen = false;
          btn.classList.remove('w--open');
          menu.removeAttribute('data-nav-menu-open');
          btn.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        }
      });
    });
  })();


  /* ==========================================================================
   * 3. TAB SYSTEM
   * .w-tabs > .w-tab-menu > .w-tab-link[data-w-tab]
   * .w-tabs > .w-tab-content > .w-tab-pane[data-w-tab]
   * Active link gets .w--current, active pane gets .w--tab-active.
   * ========================================================================== */

  (function initTabs() {
    var tabSystems = document.querySelectorAll('.w-tabs');

    tabSystems.forEach(function (tabsContainer) {
      var links = tabsContainer.querySelectorAll('.w-tab-link');
      var panes = tabsContainer.querySelectorAll('.w-tab-pane');

      // Ensure the default tab is shown on load
      var currentTab = tabsContainer.getAttribute('data-current');
      if (currentTab) {
        activateTab(currentTab);
      }

      links.forEach(function (link) {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          var tabName = link.getAttribute('data-w-tab');
          activateTab(tabName);
        });
      });

      function activateTab(tabName) {
        // Deactivate all
        links.forEach(function (l) {
          l.classList.remove('w--current');
        });
        panes.forEach(function (p) {
          p.classList.remove('w--tab-active');
        });

        // Activate matched tab
        links.forEach(function (l) {
          if (l.getAttribute('data-w-tab') === tabName) {
            l.classList.add('w--current');
          }
        });
        panes.forEach(function (p) {
          if (p.getAttribute('data-w-tab') === tabName) {
            p.classList.add('w--tab-active');
          }
        });
      }
    });
  })();


  /* ==========================================================================
   * 4. FAQ / ACCORDION
   * .faq-wrapper contains a .faq-trigger (clickable header) and one or more
   * .faq-content siblings. The content starts with height:0px and
   * transform:translate3d(0, -16px, 0). On toggle:
   *   - height goes from 0 to scrollHeight (auto)
   *   - transform goes to translate3d(0, 0, 0)
   *   - the .faq-icon chevron rotates 180deg
   * ========================================================================== */

  (function initAccordions() {
    var triggers = document.querySelectorAll('.faq-trigger');

    triggers.forEach(function (trigger) {
      var wrapper = trigger.closest('.faq-wrapper');
      if (!wrapper) return;

      // Find all .faq-content elements that are siblings to this trigger
      var contents = wrapper.querySelectorAll('.faq-content');
      var icon = trigger.querySelector('.faq-icon');

      // Ensure content elements have transitions
      contents.forEach(function (content) {
        content.style.transition = 'height 0.35s ease, transform 0.35s ease, opacity 0.35s ease';
        content.style.overflow = 'hidden';
      });

      // Icon transition
      if (icon) {
        icon.style.transition = 'transform 0.35s ease';
      }

      var isOpen = false;

      trigger.addEventListener('click', function () {
        isOpen = !isOpen;

        if (isOpen) {
          // Open: animate height from 0 to scrollHeight, fix transform
          contents.forEach(function (content) {
            // First set to auto to measure, then animate
            content.style.height = content.scrollHeight + 'px';
            content.style.transform = 'translate3d(0, 0, 0)';
            content.style.opacity = '1';
          });

          if (icon) {
            icon.style.transform = 'rotate(180deg)';
          }

          // After transition, set height to auto so content can resize
          contents.forEach(function (content) {
            var onEnd = function () {
              if (isOpen) {
                content.style.height = 'auto';
              }
              content.removeEventListener('transitionend', onEnd);
            };
            content.addEventListener('transitionend', onEnd);
          });
        } else {
          // Close: animate height back to 0
          contents.forEach(function (content) {
            // Set explicit height first so transition can happen
            content.style.height = content.scrollHeight + 'px';
            // Force reflow
            content.offsetHeight; // eslint-disable-line no-unused-expressions
            content.style.height = '0px';
            content.style.transform = 'translate3d(0, -16px, 0)';
          });

          if (icon) {
            icon.style.transform = 'rotate(0deg)';
          }
        }

        trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      // Accessibility: make trigger keyboard-accessible
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('tabindex', '0');
      trigger.setAttribute('aria-expanded', 'false');

      trigger.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          trigger.click();
        }
      });
    });
  })();


  /* ==========================================================================
   * 5. IMAGE FADE-IN
   * Images with inline opacity:0 and data-w-id fade in on scroll.
   * This is already handled by the general scroll animation in section 1,
   * which targets all elements with [data-w-id] and opacity:0.
   * This section adds a specific handler for <img> elements that might
   * not have data-w-id but still have opacity:0 inline.
   * ========================================================================== */

  (function initImageFadeIn() {
    var images = document.querySelectorAll('img[style*="opacity"]');
    var fadeImages = [];

    images.forEach(function (img) {
      if (img.style.opacity === '0') {
        fadeImages.push(img);
        img.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
      }
    });

    if (fadeImages.length === 0) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        var img = entry.target;
        img.style.opacity = '1';
        // Also clear any transform that might be hiding it
        if (img.style.transform &&
            img.style.transform.indexOf('translate3d') !== -1) {
          img.style.transform = 'translate3d(0, 0, 0) scale3d(1, 1, 1)';
        }
        observer.unobserve(img);
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -30px 0px'
    });

    fadeImages.forEach(function (img) {
      observer.observe(img);
    });
  })();


  /* ==========================================================================
   * 6. GOOGLE MAPS PLACEHOLDER
   * Elements with .w-widget-map have data-widget-latlng and aria-label.
   * Without the Webflow Maps API key we embed a free OpenStreetMap iframe
   * or show a clickable fallback linking to Google Maps.
   * ========================================================================== */

  (function initMaps() {
    var maps = document.querySelectorAll('.w-widget-map');

    maps.forEach(function (mapEl) {
      var latlng = mapEl.getAttribute('data-widget-latlng');
      var label = mapEl.getAttribute('aria-label') || mapEl.getAttribute('title') || '';
      var zoom = mapEl.getAttribute('data-widget-zoom') || '14';

      if (!latlng) return;

      var parts = latlng.split(',');
      var lat = parts[0].trim();
      var lng = parts[1].trim();

      // Ensure the container has some dimensions
      if (!mapEl.style.minHeight) {
        mapEl.style.minHeight = '300px';
      }
      mapEl.style.position = 'relative';
      mapEl.style.width = '100%';

      // Create an OpenStreetMap embed iframe (free, no API key required)
      var bbox = calculateBbox(parseFloat(lat), parseFloat(lng), parseInt(zoom, 10));
      var iframe = document.createElement('iframe');
      iframe.setAttribute('width', '100%');
      iframe.setAttribute('height', '100%');
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('scrolling', 'no');
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('title', label || 'Map');
      iframe.style.position = 'absolute';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      iframe.src = 'https://www.openstreetmap.org/export/embed.html?bbox=' +
        bbox + '&layer=mapnik&marker=' + lat + ',' + lng;

      // Fallback link in case iframe fails
      var fallbackLink = document.createElement('a');
      fallbackLink.href = 'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent(lat + ',' + lng);
      fallbackLink.target = '_blank';
      fallbackLink.rel = 'noopener noreferrer';
      fallbackLink.textContent = 'Voir sur Google Maps' + (label ? ' - ' + label : '');
      fallbackLink.style.cssText =
        'display:block;text-align:center;padding:8px;font-size:14px;' +
        'color:#0066cc;text-decoration:underline;position:relative;z-index:1;';

      mapEl.innerHTML = '';
      mapEl.appendChild(iframe);
      mapEl.appendChild(fallbackLink);
    });

    /**
     * Calculate a bounding box for the OpenStreetMap embed based on lat/lng
     * and an approximate zoom level.
     */
    function calculateBbox(lat, lng, zoom) {
      // Rough degrees per zoom level (at equator, halves per zoom level)
      var degreesPerZoom = 360 / Math.pow(2, zoom);
      var latDelta = degreesPerZoom / 2;
      var lngDelta = degreesPerZoom;

      var south = lat - latDelta;
      var north = lat + latDelta;
      var west = lng - lngDelta;
      var east = lng + lngDelta;

      return west.toFixed(6) + ',' + south.toFixed(6) + ',' +
             east.toFixed(6) + ',' + north.toFixed(6);
    }
  })();


  /* ==========================================================================
   * 7. SMOOTH SCROLL FOR ANCHOR LINKS
   * Links with href starting with # should smooth-scroll to the target.
   * ========================================================================== */

  (function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      var href = link.getAttribute('href');
      // Skip empty hashes and plain "#"
      if (!href || href === '#') return;

      link.addEventListener('click', function (e) {
        var targetId = href.substring(1);
        var target = document.getElementById(targetId);

        if (target) {
          e.preventDefault();

          // Account for fixed navbar height
          var navbar = document.querySelector('.w-nav, .navbar');
          var navHeight = navbar ? navbar.offsetHeight : 0;

          var targetPosition = target.getBoundingClientRect().top +
                               window.pageYOffset - navHeight - 16;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });

          // Update URL hash without jumping
          if (history.pushState) {
            history.pushState(null, null, href);
          }
        }
      });
    });
  })();


  /* ==========================================================================
   * 8. FORM HANDLING
   * The contact form (#wf-form-Formulaire-de-contact) should show a success
   * message on submit. Since we don't have a Webflow backend, we provide
   * a mailto fallback and show the built-in success/error messages.
   * ========================================================================== */

  (function initForms() {
    var forms = document.querySelectorAll('.w-form form');

    forms.forEach(function (form) {
      var formWrapper = form.closest('.w-form');
      var successMsg = formWrapper ? formWrapper.querySelector('.w-form-done') : null;
      var errorMsg = formWrapper ? formWrapper.querySelector('.w-form-fail') : null;

      form.addEventListener('submit', function (e) {
        e.preventDefault();

        // Gather form data
        var formData = new FormData(form);
        var data = {};
        formData.forEach(function (value, key) {
          data[key] = value;
        });

        // Attempt to submit via fetch to a backend endpoint
        // If no backend is configured, fall back to mailto
        var actionUrl = form.getAttribute('action');

        if (actionUrl && actionUrl !== '' && actionUrl !== '#') {
          // Try sending to the configured endpoint
          fetch(actionUrl, {
            method: form.method || 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(data)
          })
          .then(function (response) {
            if (response.ok) {
              showSuccess();
            } else {
              showError();
            }
          })
          .catch(function () {
            // Network error - fall back to mailto
            openMailto(data);
            showSuccess();
          });
        } else {
          // No action URL - use mailto fallback
          openMailto(data);
          showSuccess();
        }

        function showSuccess() {
          form.style.display = 'none';
          if (successMsg) {
            successMsg.style.display = 'block';
          }
        }

        function showError() {
          if (errorMsg) {
            errorMsg.style.display = 'block';
          }
        }

        function openMailto(formFields) {
          // Route to the correct email based on selected service
          var emailMap = {
            'Planning Familial': 'planningoasisfamiliale@gmail.com',
            'Accueil des enfants': 'oasis.nancyjacques@gmail.com',
            '9 mois & après': '9moisetapres@gmail.com',
            'Autre': 'b.springuel@oasis-familiale.com'
          };
          var service = formFields['SERVICE'] || '';
          var to = emailMap[service] || 'planningoasisfamiliale@gmail.com';
          var subject = encodeURIComponent(
            'Contact via le site - ' + (service || 'Formulaire de contact')
          );
          var bodyParts = [];
          for (var key in formFields) {
            if (formFields.hasOwnProperty(key)) {
              bodyParts.push(key + ': ' + formFields[key]);
            }
          }
          var body = encodeURIComponent(bodyParts.join('\n'));
          window.location.href = 'mailto:' + to + '?subject=' + subject + '&body=' + body;
        }
      });
    });
  })();


  /* ==========================================================================
   * 8. BLOG SECTION VISIBILITY
   * Hide .section-blog if it contains no articles (no .w-dyn-items children)
   * ========================================================================== */

  (function initBlogSectionVisibility() {
    var sections = document.querySelectorAll('.section-blog');
    sections.forEach(function (section) {
      var articles = section.querySelectorAll('.w-dyn-items .w-dyn-item');
      if (articles.length === 0) {
        section.style.display = 'none';
      }
    });
  })();

});
