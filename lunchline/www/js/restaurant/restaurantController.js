angular.module('lunchline.restaurant', [])

.controller('restaurantController', function($scope, Data, User, Favorites, Update, Geolocation, $ionicHistory, Favorites, $window) {

  // get recent updates when you hit back
  $scope.$root.GoBack = function() {
    if($ionicHistory.backTitle() === "Favorites List"){
      $ionicHistory.goBack();
    } else {
      Data.getRecentUpdate(function(data) {
        $ionicHistory.goBack();
      });
    }
  };

  $scope.checkHist = function(){
    if($ionicHistory.backTitle() === "Favorites List"){
      return false
    } else {
      return true
    }
  }

  $scope.restaurant = {
    id: '',
    name: '',
    category: '',
    lat: '',
    lng: '',
    rating: 0,
    price: 0,
    address: '',
    hours: '',
    waitTime: ''
  };

  $scope.userLocation = {};

  // grab the userlocation from storage
  $scope.grabUserLocation = function() {
    if( sessionStorage['locationStorage'] === undefined ) {
      $scope.userLocation = {};
    }
    else {
      $scope.userLocation = JSON.parse(sessionStorage['locationStorage']);
      $scope.short_name = $scope.userLocation.city.short_name + ', ' + $scope.userLocation.state.short_name;
    }
  };

  $scope.grabUserLocation();

  // Check if object doesn't exist, use session storage.
  // This way, on refresh or back, it won't have all undefined values
  if (!Data.clickedItem.id) {
    Data.clickedItem = JSON.parse(sessionStorage.tempStorage);
  }

  if (Data.clickedItem.id) {
    console.log(Data.clickedItem.id)
    // Get data from clicked item
    var item = Data.clickedItem;

    $scope.restaurant.place_id = item.place_id;
    $scope.restaurant.id = item.id;
    $scope.restaurant.name = item.name;

    var type = item.types;
    var capitalizedType = type.charAt(0).toUpperCase() + type.substring(1);

    $scope.restaurant.category = capitalizedType;
    $scope.restaurant.address = item.vicinity;
    $scope.restaurant.waitTime = item.wait;
    $scope.restaurant.lat = item.geometry.location.lat;
    $scope.restaurant.lng = item.geometry.location.lng;

    // Get restaurant rating and build string for star display
    $scope.restaurant.rating = item.rating;
    var whiteStar = String.fromCharCode(9734);
    var blackStar = String.fromCharCode(9733);
    var starArray = [];

    for (var i = 0; i < 5; i++) {
      starArray.push(whiteStar);
    }

    for (var i = 0; i < Math.round($scope.restaurant.rating); i++) {
      starArray.splice(i, 1, blackStar);
    }

    $scope.starString = starArray.join('');

    // Calculate Price And Convert to Dollar Signs
    var price = item.price_level;
    var dollarSigns = '';

    for (var i = 0; i < price; i++) {
      dollarSigns += '$';
    }

    $scope.restaurant.price = dollarSigns;

    console.log($scope.restaurant);

    // Change color of main indicator div based on wait time from database
    switch ($scope.restaurant.waitTime) {
      case '2_red':
        angular.element(document.querySelector('#currWait')).addClass('red');
        $scope.waitString = '> 30 Mins';
        break;
      case '1_yellow':
        angular.element(document.querySelector('#currWait')).addClass('yellow');
        $scope.waitString = '~ 20 Mins';
        break;
      case '0_green':
        angular.element(document.querySelector('#currWait')).addClass('green');
        $scope.waitString = '< 10 Mins';
        break;
      case '3_grey':
        angular.element(document.querySelector('#currWait')).addClass('oliveGreen');
        $scope.waitString = 'not available';
        break;
    }
  } else { // No data loaded.  Load default values.
    angular.element(document.querySelector('#currWait')).addClass('oliveGreen');
    $scope.waitString = 'not available';
  }

  // When a Check in Button is clicked, update the wait time on page and DB
  $scope.updateWait = function(wait) {
    console.log('Update Wait called : ', wait);

    var sendObj = {
      place_id: $scope.restaurant.place_id,
      wait: wait
    };

    updateWaitColorDiv(wait);
    Update.updateWait(sendObj);
  };

  $scope.addFavorites = function() {
    $scope.user = JSON.parse($window.localStorage['firebase:session::instalunchline']).uid;
    Favorites.addFavorites($scope.user, $scope.restaurant);
  }

  $scope.removeFavorite = function() {
    $scope.user = JSON.parse($window.localStorage['firebase:session::instalunchline']).uid;
    Favorites.removeFavorite($scope.user, $scope.restaurant);
  }

  // Sweet Alert popup to thank users when they check in a wait time.
  function updateWaitColorDiv(wait) {
    swal({
      html: '<p id="sweetAlert">Thanks for checking in!</p>',
      type: 'success',
      timer: 1500,
      width: 600,
      showConfirmButton: false
    });

    // Change the wait color of the div by removing and adding classes
    switch (wait) {
      case '2_red':
        angular.element(document.querySelector('#currWait')).removeClass('yellow');
        angular.element(document.querySelector('#currWait')).removeClass('green');
        angular.element(document.querySelector('#currWait')).removeClass('oliveGreen');
        angular.element(document.querySelector('#currWait')).addClass('red');
        $scope.waitString = '> 30 Mins';
        break;
      case '1_yellow':
        angular.element(document.querySelector('#currWait')).removeClass('red');
        angular.element(document.querySelector('#currWait')).removeClass('green');
        angular.element(document.querySelector('#currWait')).removeClass('oliveGreen');
        angular.element(document.querySelector('#currWait')).addClass('yellow');
        $scope.waitString = '~ 20 Mins';
        break;
      case '0_green':
        angular.element(document.querySelector('#currWait')).removeClass('yellow');
        angular.element(document.querySelector('#currWait')).removeClass('red');
        angular.element(document.querySelector('#currWait')).removeClass('oliveGreen');
        angular.element(document.querySelector('#currWait')).addClass('green');
        $scope.waitString = '< 10 Mins';
        break;
    }
  }
});
