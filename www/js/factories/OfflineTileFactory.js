'use strict';

angular.module('app')
  .factory('OfflineTilesFactory', function($q) {

    var factory = {};

    // map providers
    var mapProviders = [{
      id: "osm",
      name: "OSM Standard",
      url: [
        'http://a.tile.openstreetmap.org/',
        'http://b.tile.openstreetmap.org/',
        'http://c.tile.openstreetmap.org/'
      ],
      imageType: "png",
      mime: "image/png"
    }, {
      id: "mqSat",
      name: "MapQuest - Satellite",
      url: [
        'http://otile1-s.mqcdn.com/tiles/1.0.0/sat/',
        'http://otile2-s.mqcdn.com/tiles/1.0.0/sat/',
        'http://otile3-s.mqcdn.com/tiles/1.0.0/sat/',
        'http://otile4-s.mqcdn.com/tiles/1.0.0/sat/'
      ],
      imageType: "jpg",
      mime: "image/jpeg"
    }, {
      id: "mqOsm",
      name: "MapQuest - OSM",
      url: [
        'http://otile1-s.mqcdn.com/tiles/1.0.0/osm/',
        'http://otile2-s.mqcdn.com/tiles/1.0.0/osm/',
        'http://otile3-s.mqcdn.com/tiles/1.0.0/osm/',
        'http://otile4-s.mqcdn.com/tiles/1.0.0/osm/'
      ],
      imageType: "jpg",
      mime: "image/jpeg"
    }];

    // randomly selects an element from an array
    var getRandomElement = function(ary) {
      var num = _.random(0, ary.length - 1);
      return ary[num];
    }

    var getMapTileProvider = function(id) {
      var provider = _.find(mapProviders, function(provider) {
        return provider.id == id;
      });
      return provider;
    }


    // gets the number of tiles from offline storage
    factory.getOfflineTileCount = function(callback) {
      localforage.length(function(err, numberOfKeys) {
        callback(err || numberOfKeys);
      });
    }

    // wipes the offline database
    factory.clear = function(callback) {
      // deletes all offline tiles
      localforage.clear(function(err) {
        if (err) {
          callback(err);
        } else {
          // then delete all map names
          mapNamesDb.clear(function(err) {
            if (err) {
              callback(err);
            } else {
              callback();
            }
          });
        }
      });
    }

    // write to storage
    var write = function(mapProvider, tile, blob) {
      var deferred = $q.defer(); //init promise

      // note that tileId is prefixed with mapProvider, tile itself is not
      var tileId = mapProvider + "/" + tile;

      localforage.setItem(tileId, blob).then(function() {
        // console.log("wrote tileId ", tileId);
        deferred.resolve();
      });

      return deferred.promise;
    };

    // read from storage
    factory.read = function(mapProvider, tile, callback) {
      // note that tileId is prefixed with mapProvider, tile itself is not
      var tileId = mapProvider + "/" + tile;

      localforage.getItem(tileId).then(function(blob) {
        callback(blob);
      });
    };

    // download from internet
    var downloadInternetMapTile = function(mapProvider, tile) {
      var deferred = $q.defer(); //init promise

      var mapTileProvider = getMapTileProvider(mapProvider);
      var url = getRandomElement(mapTileProvider.url);
      var mime = mapTileProvider.mime;

      var imageUrl = url + tile + "." + mapTileProvider.imageType;

      var xhr = new XMLHttpRequest();
      xhr.open('GET', imageUrl, true);
      xhr.responseType = 'arraybuffer';

      // test that the network is accessible
      xhr.onload = function(e) {

        // console.log("status is", this.status);

        if (this.status == 200) {
          // Note: .response instead of .responseText
          var blob = new Blob([this.response], {
            type: mime
          });
          // console.log("downloaded tile ", tile);
          deferred.resolve(blob);
        } else {
          // uh oh, we shouldn't even be here -- this should be captured by the onerror handler
          console.log("xhr network was ok but status was not 200 - critical error");
          deferred.reject("xhr network was ok but status was not 200 - critical error");
        }

      };

      // 404 errors and other network errors
      xhr.onerror = function(e) {
        console.log("on error triggered");
        deferred.reject("could not download due to 404 or other network error");
      };

      xhr.onprogress = function(e) {
        // notify that we are downloading the tile
        deferred.notify(tile);
      };

      xhr.send();

      return deferred.promise;
    };

    var downloadAndSave = function(mapProvider, tile) {
      var deferred = $q.defer(); //init promise

      // first we download
      var download = downloadInternetMapTile(mapProvider, tile);
      download.then(function(blob) {

        // the download was successful, so we should save next
        var save = write(mapProvider, tile, blob);
        save.then(function() {

          deferred.resolve();
        });

      }, function(error) {
        // the download failed (network error), but we still want to resolve
        console.log(error);
        deferred.resolve();
      }, function(tileId) {
        // passing the notification up the promise chain
        deferred.notify(tileId);
      });

      return deferred.promise;
    }

    factory.downloadTileToStorage = function(options, callback) {
      var deferred = $q.defer(); //init promise

      var mapName = options.mapName;
      var mapProvider = options.mapProvider;
      var tiles = options.tiles;

      // clone the tiles array, we use this to determine what tiles are left to download
      // so we can notify back to the deferral
      var tilesRemainingToBeDownload = tiles.slice();

      // array of promises
      var promises = [];

      // save the map name first
      promises.push(mapNameWrite(mapName, mapProvider, tiles));

      // now save all the tiles -- loop through the tiles array
      tiles.forEach(function(tile, index, ary) {

        // stash each tile download as a promise
        var promise = downloadAndSave(mapProvider, tile);
        promise.then(function() {
          // nothing to do here because all this is deferred in our promises array
        }, function(err) {
          console.log("error: downloadTileToStorage-tiles", err);
        }, function(tileId) {
          // notify

          // update the tilesRemainingToBeDownload based on what has just been downloaded
          tilesRemainingToBeDownload = _.filter(tilesRemainingToBeDownload, function(elem) {
            return elem != tileId;
          });

          // we notify what tile number has been completed, as well as the total num of tiles
          deferred.notify([
            tiles.length - tilesRemainingToBeDownload.length,
            tiles.length
          ]);
        });

        // our promise is now built -- push this promise onto the promises array
        promises.push(promise);
      });

      // check that all promises have been fulfilled
      $q.all(promises)
        .then(function() {

          // console.log("downloadTileToStorage-then: fully downloaded and saved");

          // everything is fully downloaded
          deferred.resolve();
        }, function(err) {
          console.log("error: downloadTileToStorage-all", err);
        });

      return deferred.promise;
    }

    // input an array of tileIds, get back an array of the blob size for those tileIds
    var getTileIdsSizeDetail = function(tileIds) {
      var deferred = $q.defer();

      var promises = [];

      tileIds.forEach(function(tileId) {
        var promise = localforage.getItem(tileId)
          .then(function(blob) {
            return blob.size
          });
        promises.push(promise);
      });

      $q.all(promises).then(function(sizes) {
        // console.log("getTileIdsSizeDetail: ", sizes);
        deferred.resolve(sizes);
      });
      return deferred.promise;
    }

    factory.getMaps = function() {
      var deferred = $q.defer();

      var maps = [];

      mapNamesDb.iterate(function(value, key) {
        maps.push({
          name: key,
          tileIds: value
        });
      }, function() {
        // now go through all the maps and assign their tile sizes

        var promises = [];

        maps.forEach(function(map) {
          var promise = getTileIdsSizeDetail(map.tileIds);
          promises.push(promise);
        });

        $q.all(promises).then(function(mapSizes) {
          // mapSizes is an array
          // each element in this array is an array of sizes in the same order as
          // the maps array

          // console.log("maps:", maps);
          // console.log("getMaps: ", mapSizes);

          // an array of map sizes, e.g. [123234, 345678]
          // the array indexes should correspond to the maps array index
          var mapSizesReduced = _.map(mapSizes, function(mapSize) {
            return _.reduce(mapSize, function(memo, num) {
              return memo + num;
            }, 0);
          })

          // console.log(mapSizesReduced);

          // loop through each map and assign the size property
          _.each(maps, function(value, key, list) {
            value.size = bytesToSize(mapSizesReduced[key]);
            return value;
          });

          deferred.resolve(maps);
        });
      });
      return deferred.promise;
    }

    factory.deleteMap = function(map) {
      var deferred = $q.defer();

      // console.log("map: ", map);

      // first get all the tileIds associated with this map name
      var tileIds = map.tileIds;

      // an array of promises
      var promises = [];

      // loop through the tiles and build an delete promise for each tile
      tileIds.forEach(function(tileId) {
        // console.log("removing... ", tileId);
        var promise = localforage.removeItem(tileId);
        promises.push(promise);
      });

      $q.all(promises).then(function() {
        // all the tile associated with this map name has been deleted

        // now delete the actual map name
        mapNamesDb.removeItem(map.name)
          .then(function() {
            // map is deleted, and this is now fully resolved
            deferred.resolve();
          });
      });

      return deferred.promise;
    };

    factory.renameMap = function(mapName, newMapName) {
      var deferred = $q.defer();

      // the new map tileIds that we will copy into from the current map
      var newMapTileIds;

      // get the existing mapname
      mapNamesDb.getItem(mapName).then(function(tileIds) {
        // create a new map name, with the existing mapname contents
        mapNamesDb.setItem(newMapName, tileIds).then(function() {
          // now delete the actual map name
          mapNamesDb.removeItem(mapName).then(function() {
            // map is deleted, and this is now fully resolved
            deferred.resolve();
          });
        });
      });

      return deferred.promise;
    };

    var mapNameWrite = function(mapName, mapProvider, data) {
      var deferred = $q.defer(); //init promise

      // data is an array of tileIds with the mapProvider prefix so we need to add the mapProvider name to each tile
      var tileIdArray = data.map(function(tile) {
        return mapProvider + "/" + tile;
      });

      mapNamesDb.setItem(mapName, tileIdArray).then(function() {
        // console.log("saved map name ", mapName);
        deferred.resolve();
      });

      return deferred.promise;
    }

    // return factory
    return factory;
  });