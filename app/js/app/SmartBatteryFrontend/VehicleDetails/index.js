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
            template: angular.element('#wrong-url-template').html(),
        })
        .state('vehicle_details', {
            url: '/vehicle_details/{vehicle_id}',
            template: angular.element('#vehicle-details-template').html(),
            controller: 'sbfVehicleDetailsController'
        })
    ;
})
;
