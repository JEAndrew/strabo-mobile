angular.module('app', [
  'ionic',
  'ngCordova'
])

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
  });

  // localforage is the global for offline map tiles
  localforage.config({
    driver: localforage.WEBSQL,
    name: 'offlineMapTiles'
  });

  // global LF for map names
  mapNamesDb = localforage.createInstance({
      driver: localforage.WEBSQL,
      name: 'MapNames'
  });

  // global LF for spot data
  spotsDb = localforage.createInstance({
      driver: localforage.WEBSQL,
      name: 'Spots'
  });

  // global LF for configuration data
  configDb = localforage.createInstance({
    driver: localforage.WEBSQL,
    name: 'Config'
  });
})

.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider

    .state('app', {
      url: "/app",
      abstract: true,
      templateUrl: "templates/menu.html"
    })

    .state('app.map', {
      cache: false,
      url: "/map",
      views: {
        'menuContent': {
          templateUrl: "templates/map.html",
          controller: 'MapCtrl'
        }
      }
    })

    .state('app.offlinemap', {
      cache: false,
      url: "/offlinemap",
      views: {
        'menuContent': {
          templateUrl: "templates/offlinemap.html",
          controller: "OfflineMapCtrl"
        }
      }
    })

    .state('app.search', {
      url: "/search",
      views: {
        'menuContent': {
          templateUrl: "templates/search.html"
        }
      }
    })

    .state('app.sync', {
      cache: false,
      url: "/sync",
      views: {
        'menuContent': {
          templateUrl: "templates/sync.html",
          controller: "SyncCtrl"
        }
      }
    })

    .state('app.spots', {
      cache: false,
      url: "/spots",
      views: {
        'menuContent': {
          templateUrl: "templates/spots.html",
          controller: 'SpotsCtrl'
        }
      }
    })

    .state('app.commonfields', {
      url: "/spots/commonfields",
      views: {
        'menuContent': {
          templateUrl: "templates/spot.html",
          controller: 'SpotCtrl'
        }
      }
    })

    .state('app.newspot', {
      url: "/spots/newspot",
      views: {
        'menuContent': {
          templateUrl: "templates/spot.html",
          controller: 'SpotCtrl'
        }
      }
    })

    .state('app.spot', {
      url: "/spots/:spotId",
      views: {
        'menuContent': {
          templateUrl: "templates/spot.html",
          controller: 'SpotCtrl'
        }
      }
    })

    .state('app.archiveTiles', {
      url: "/map/archiveTiles",
      views: {
        'menuContent': {
          templateUrl: "templates/archiveTiles.html",
          controller: 'ArchiveTilesCtrl'
        }
      }
    })

    .state('app.debug', {
      url: "/debug",
      views: {
        'menuContent': {
          templateUrl: "templates/debug.html",
          controller: 'DebugCtrl'
        }
      }
    })

    .state('app.about', {
      url: "/about",
      views: {
        'menuContent': {
          templateUrl: "templates/about.html"
        }
      }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/map');
});
