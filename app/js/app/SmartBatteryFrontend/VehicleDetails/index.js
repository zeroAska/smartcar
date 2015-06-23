/**
 * @file index.js
 * @author Yichen Zhao
 * @license Proprietary
 */
angular.module('sbfModuleVehicleDetails', ['ngResource', 'chart.js', 'ngAnimate', 'iaUtils', 'ui.bootstrap', 'ui.router'])
.config(function($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/wrong_url');
    $stateProvider
        .state('wrong_url', {
            url: '/wrong_url',
            templateUrl: 'pages/wrong_url.html',
        })
        .state('vehicle_details', {
            url: '/vehicle_details/{vehicle_id}',
            templateUrl: 'pages/vehicle_details.html',
            controller: 'sbfVehicleDetailsController'
        })
    ;
})
;
