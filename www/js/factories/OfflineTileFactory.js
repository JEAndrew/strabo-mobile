'use strict';

angular.module('app')
  .factory('OfflineTilesFactory', function($localForage) {

    var factory = {};

    // the internet map tile source
    var osmUrlPrefix = 'http://b.tile.openstreetmap.org/';

    // gets the number of tiles from offline storage
    factory.getOfflineTileCount = function(callback) {
      localforage.length(function(err, numberOfKeys) {
        callback(err || numberOfKeys);
      });
    }

    // wipes the offline database
    factory.clear = function(callback) {
      localforage.clear(function(err) {
        if (err) {
          callback(err);
        } else {
          callback();
        }
      });
    }

    // write to storage
    factory.write = function(tileId, blob, callback) {
      localforage.setItem(tileId, blob).then(function() {
        callback();
      });
    };

    // read from storage
    factory.read = function(tileId, callback) {
      localforage.getItem(tileId).then(function(blob) {
        callback(blob);
      });
    };

    // download from internet
    factory.downloadInternetMapTile = function(tileId, callback) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', osmUrlPrefix + tileId + ".png", true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = function(e) {
        if (this.status == 200) {
          // Note: .response instead of .responseText
          var blob = new Blob([this.response], {
            type: 'image/png'
          });
          callback(blob);
        }
      };
      xhr.send();
    };

    factory.downloadTileToStorage = function(tileId, callback) {
      var self = this;
      self.downloadInternetMapTile(tileId, function(blob) {
        self.write(tileId, blob, function() {});
      });
    }

    // return factory
    return factory;
  });