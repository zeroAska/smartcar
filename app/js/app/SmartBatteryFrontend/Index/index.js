angular.module('sbfModuleTemplates', []);
angular.module('sbfModuleIndex', ['sbfModuleVehiclesMap', 'sbfModuleVehicleDetails', 'sbfModuleTemplates'])
.config(function($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/vehicles_map');
    $stateProvider
        .state('vehicle_details', {
            url: '/vehicle_details/{vehicle_id}',
            templateUrl: 'pages/vehicle_details.html',
            controller: 'sbfVehicleDetailsController',
            data: {
                title: "Vehicle Details"
            }
        })
        .state('vehicles_map', {
            url: '/vehicles_map',
            templateUrl: 'pages/vehicles_map.html',
            controller: 'sbfVehicleMapsController',
            data: {
                title: 'Vehicles Map',
                full_page: true
            }
        })
    ;
})
.run(function($rootScope) {
    $rootScope.full_page = true;
    $rootScope.$on('$stateChangeSuccess', function(event, toState) {
        var title, full_page;
        if (toState.data) {
            title = toState.data.title;
            full_page = toState.data.full_page;
        }
        $rootScope.page_title = title;
        $rootScope.full_page = full_page;
    });
})
;
