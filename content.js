(function () {
  var MAP_ID = 'tableonline-map';

  var log = console.log.bind(console, '[TableOnline Maps]');

  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: chrome.runtime.getURL('images/marker-icon-2x.png'),
    iconUrl: chrome.runtime.getURL('images/marker-icon.png'),
    shadowUrl: chrome.runtime.getURL('images/marker-shadow.png')
  });

  var cachedRestaurants = null;
  var lastFetchParams = null;

  async function fetchRestaurants() {
    try {
      var params = window.location.search;
      if (params === lastFetchParams && cachedRestaurants) {
        return cachedRestaurants;
      }
      lastFetchParams = params;
      var url = 'https://service.tableonline.fi/search' + params;
      log('Fetching', url);
      var resp = await fetch(url);
      if (!resp.ok) {
        throw new Error('API returned ' + resp.status);
      }
      var data = await resp.json();
      var results = data
        .filter(function (entry) {
          var loc = entry.item && entry.item.location;
          return loc && loc.lat != null && loc.lng != null;
        })
        .map(function (entry) {
          var item = entry.item;
          return {
            name: item.name,
            lat: item.location.lat,
            lng: item.location.lng,
            address: item.address,
            city: item.city,
            restaurantId: item.restaurantId,
            slug: item.slug
          };
        });
      cachedRestaurants = results;
      log('Got', results.length, 'restaurants');
      return results;
    } catch (err) {
      log('Fetch failed', err);
      return cachedRestaurants || [];
    }
  }

  function injectMapContainer() {
    var existing = document.getElementById(MAP_ID);
    if (existing) {
      return existing;
    }
    var target = document.querySelector('div[class*="searchOptions_"]');
    if (!target) {
      return null;
    }
    var container = document.createElement('div');
    container.id = MAP_ID;
    container.style.cssText =
      'display:block;width:100%;height:400px;margin-bottom:16px;border-radius:8px;overflow:hidden;z-index:1;';
    target.insertAdjacentElement('afterend', container);
    return container;
  }

  var map = null;
  var markersLayer = null;

  function initMap(container) {
    if (map) {
      map.remove();
      map = null;
      markersLayer = null;
    }
    map = L.map(container, { zoomControl: true }).setView([60.1699, 24.9384], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18
    }).addTo(map);
    markersLayer = L.layerGroup().addTo(map);
    log('Map initialized on #' + container.id);
    setTimeout(function () {
      if (map) {
        map.invalidateSize();
      }
    }, 300);
  }

  function buildPopup(r) {
    var url =
      'https://www.tableonline.fi/en/' +
      (r.city || '').toLowerCase() +
      '/' + r.slug +
      '/' + r.restaurantId;
    return (
      '<b>' + r.name + '</b><br>' +
      (r.address || '') +
      '<br><a href="' + url + '" target="_blank">View on TableOnline</a>'
    );
  }

  async function renderMarkers() {
    if (!map || !markersLayer) {
      log('renderMarkers: map or layer missing');
      return;
    }
    markersLayer.clearLayers();
    var restaurants = await fetchRestaurants();
    var markers = [];
    restaurants.forEach(function (r) {
      var marker = L.marker([r.lat, r.lng]);
      marker.bindPopup(buildPopup(r));
      markers.push(marker);
    });
    L.layerGroup(markers).addTo(markersLayer);
    if (markers.length > 0) {
      var group = L.featureGroup(markers);
      map.fitBounds(group.getBounds(), { padding: [30, 30], maxZoom: 15 });
      log('Showing', markers.length, 'markers');
    } else {
      log('No markers to show');
    }
  }

  var renderDebounce = null;
  var isBooted = false;

  function urlHasChanged() {
    return window.location.search !== lastFetchParams;
  }

  function scheduleRender() {
    if (renderDebounce) {
      clearTimeout(renderDebounce);
    }
    renderDebounce = setTimeout(function () {
      if (!isBooted) {
        return;
      }
      if (urlHasChanged()) {
        log('URL changed, re-rendering');
        cachedRestaurants = null;
        renderMarkers();
      }
    }, 1500);
  }

  function bootstrap() {
    var container = injectMapContainer();
    if (!container) {
      return;
    }
    if (!isBooted) {
      initMap(container);
      renderMarkers();
      isBooted = true;
      log('Bootstrapped');
    }
  }

  function onListMutation() {
    if (!document.getElementById(MAP_ID) && document.querySelector('div[class*="searchOptions_"]')) {
      log('Map removed by page, re-injecting');
      isBooted = false;
      bootstrap();
      return;
    }
    scheduleRender();
  }

  function findListAncestor() {
    var list = document.querySelector('div[class*="searchOptions_"]');
    if (!list) {
      return null;
    }
    var el = list.parentNode;
    while (el && el !== document.body) {
      if (el.children.length <= 10) {
        el = el.parentNode;
      } else {
        return el;
      }
    }
    return list.parentNode;
  }

  function startObserving() {
    var root = findListAncestor() || document.body;
    var observer = new MutationObserver(onListMutation);
    observer.observe(root, { childList: true, subtree: true });
    log('Observing mutations on', root.tagName, root.id || root.className);
  }

  function waitForTarget(callback, maxAttempts, interval) {
    var attempts = 0;
    maxAttempts = maxAttempts || 20;
    interval = interval || 500;
    function check() {
      attempts++;
      var target = document.querySelector('div[class*="searchOptions_"]');
      if (target) {
        log('Found searchOptions div after ' + attempts + ' attempt(s)');
        callback(target);
        return;
      }
      if (attempts >= maxAttempts) {
        log('Gave up waiting for searchOptions div');
        return;
      }
      setTimeout(check, interval);
    }
    check();
  }

  log('Content script loaded, waiting for searchOptions div');
  waitForTarget(function () {
    bootstrap();
    startObserving();
  });
})();
