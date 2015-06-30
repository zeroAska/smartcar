/**
 * @file index.js
 * @author Yichen Zhao
 * @license Proprietary
 */
angular.module('sbfModuleTemplates', []);
angular.module('sbfModuleVehicleDetails', ['ngResource', 'chart.js', 'ngAnimate', 'iaUtils', 'ui.bootstrap', 'ui.router', 'sbfModuleCommon', 'sbfModuleVehiclesMap', 'sbfModuleTemplates'])
.config(function($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/wrong_url');
    $stateProvider
        .state('wrong_url', {
            url: '/wrong_url',
            templateUrl: 'pages/wrong_url.html',
            data: {
                title: 'Wrong URL'
            }
        })
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
                title: 'Vehicles Map'
            }
        })
    ;
})
.run(function($rootScope) {
    $rootScope.$on('$stateChangeSuccess', function(event, toState) {
        var title;
        if (toState.data) {
            title = toState.data.title;
        }
        $rootScope.page_title = title;
    });
})
;
