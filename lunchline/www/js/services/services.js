angular.module('lunchline.services', [])
.factory('Auth', function($http, $state, $window, $firebaseAuth) {
  var ref = new Firebase('https://instalunchline.firebaseio.com');
  var auth = $firebaseAuth(ref);
  var authRef = new Firebase("https://instalunchline.firebaseio.com/.info/authenticated");

  var authStatus = false;

  var checkAuth = function(){
    authRef.on("value", function(snap) {
      if (snap.val() === true) {
        authStatus = true;
      } else {
        authStatus = false;
      }
    });
  }

  var getAuth = function() {
    return authStatus;
  }

  var logout = function(){
    ref.unauth();
    sessionStorage.removeItem('locationStorage');
  }

  var fbLogin = function(){
    ref.authWithOAuthPopup("facebook", function(error, authData) {
      if (error) {
        console.log("Login Failed!", error);
      } else {
        $state.go('menu.list')
      }
    });
  }

  return {
    auth: auth,
    checkAuth: checkAuth,
    fbLogin: fbLogin,
    logout: logout,
    getAuth: getAuth
  };
})
.factory('Data', function($http) {

  var collection = [];
  var searchCalled = false;

  var getData = function(userLoc, callback) {
    $http({
      method: 'POST',
      url: '/api/rest/search',
      data: userLoc
    }).then(function success(data) {
        collection = data.data.map(function(restaurant) {
          return {
            restaurant: restaurant
          };
        });
        callback(collection);
      },
      function error(response) {
        console.error("ERROR: ", response);
      });
  };

  var getFavorites = function(user, callback) {
    user.location = JSON.parse(sessionStorage['locationStorage']);
    return $http({
      method: 'POST',
      url: '/api/user/getFave',
      data: user
    }).then(function success(data) {
      collection = data.data.map(function(restaurant) {
        return {
          restaurant: restaurant
        };
      });
      callback(collection);
    },
    function errer(response) {
      console.error("ERROR: ", response);
    });
  };
  // Storage of clicked item on listView so that restView can pull up data
  var clickedItem = {};

  // Get recent update
  var getRecentUpdate = function(callback) {
    console.log('Get recent update is called here is the collection', collection);
    $http({
      method: 'POST',
      url: '/api/rest/recent',
      data: collection
    }).then(function success(data) {
        collection = data.data.map(function(restaurant) {
          return {
            restaurant: restaurant
          };
        });
        searchCalled = true;
        callback(collection);
      },
      function error(response) {
        console.error("ERROR: ", response);
      });
  };

  var getCollection = function(callback) {
    callback(collection);
  }

  var getSearchCalled = function() {
    return searchCalled;
  }

  return {
    getData: getData,
    clickedItem: clickedItem,
    getRecentUpdate: getRecentUpdate,
    getCollection: getCollection,
    getSearchCalled: getSearchCalled,
    getFavorites: getFavorites
  };
// Distance factory: calculates the distance of a lat/long from the user's lat/long
})
.factory('distance', function() {
  var calc = function(userLoc, destinLoc) {
    //Expects objects with properties 'lat & long'
    var lat1 = userLoc.lat,
      long1 = userLoc.long,
      lat2 = destinLoc.lat,
      long2 = destinLoc.long;
    var deg2rad = function(deg) {
      return deg * (Math.PI / 180)
    }
    var R = 6371; // Radius of Earth in meters
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(long2 - long1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = (R * c) * 0.621371;
    return Math.round(d * 10) / 10;
  }

  return {
    calc: calc
  };
// Update factory : updates the database on a reported restaurant wait time with put request
})
.factory('Update', function($http) {
  function updateWait(objToSend) {
    $http({
      method: 'PUT',
      url: '/api/rest/update',
      data: objToSend
    }).then(function successCallback(response) {
      console.log('SUCCESS on PUT request UPDATE');
    }, function errorCallback(response) {
      console.error('ERROR on Put Request!');
    });
  }

  return {
    updateWait: updateWait
  };
})
.factory('Geolocation', function() {

  // get userLocation for restaurantView address
  var userLocation = {};

  var locationInfo = function(callback) {
    var geocoder;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(successFunction, errorFunction);
    }
    //Get the latitude and the longitude;
    function successFunction(position) {
      var lat = position.coords.latitude;
      var lng = position.coords.longitude;
      codeLatLng(lat, lng)
    }

    function errorFunction(){
      alert('Geocoder failed');
    }

    function initialize() {
      geocoder = new google.maps.Geocoder();
    }

    function codeLatLng(lat, lng) {
      userLocation.lat = lat;
      userLocation.long = lng;

      var latlng = new google.maps.LatLng(lat, lng);
      geocoder.geocode({'latLng': latlng}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          if (results[1]) {
           //formatted address
           /*alert(results[0].formatted_address)*/
          //find country name
          for (var i = 0; i < results[0].address_components.length; i++) {
           for (var b = 0; b < results[0].address_components[i].types.length; b++) {
            //there are different types that might hold a city admin_area_lvl_1 usually does in come cases looking for sublocality type will be more appropriate
              if (results[0].address_components[i].types[b] == 'locality') {
                //this is the object you are looking for
                city = results[0].address_components[i];
                break;
              }
              if (results[0].address_components[i].types[b] == 'administrative_area_level_1') {
                state = results[0].address_components[i];
                break;
              }
            }
          }
          userLocation.city = city;
          userLocation.state = state;

          sessionStorage['locationStorage'] = JSON.stringify(userLocation);

          } else {
            alert('No results found');
          }
        } else {
          alert('Geocoder failed due to: ' + status);
        }
      });
     }
     initialize();
   };

   return {
     locationInfo: locationInfo,
     userLocation: userLocation
   };
})
.factory('User', function($http) {

  var currentUser;

  var getUser = function(user) {
    return $http({
      method: 'POST',
      url: '/api/user/profile',
      data: user
    }).then(function(res) {
      return res.data;
    });
  };

  var sendUser = function(user) {
    return $http({
      method: 'POST',
      url: '/api/user/user',
      data: user
    }).then(function(res) {
      return res.data;
    });
  };

  return {
    getUser: getUser,
    sendUser: sendUser
  };
})
.factory('Favorites', function($http) {
  var addFavorites = function(user, rest) {
    var data = {
      uid: user,
      favorite: rest
    };
    return $http({
      method: 'PUT',
      url: '/api/user/favorite',
      data: data
    })
    .then(function(res){
      return res;
    });
  };

  var removeFavorite = function(user, rest) {
    var data = {
      uid: user,
      favorite: rest
    };
    return $http({
      method: 'PUT',
      url: '/api/user/removeFave',
      data: data
    })
    .then(function(res){
      return res;
    });
  };

  var clickedItem;

  var getFavorites = function(user) {
    user.location = JSON.parse(sessionStorage['locationStorage']);
    return $http({
      method: 'POST',
      url: '/api/user/getFave',
      data: user
    }).then(function(res) {
      return res.data;
    });
  };

  return {
    addFavorites: addFavorites,
    getFavorites: getFavorites,
    removeFavorite: removeFavorite,
    clickedItem: clickedItem
  };
})
