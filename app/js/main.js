/**
 * @file main.js
 * @author Yichen Zhao
 * @license Proprietary
 */
"use strict";

angular.module('SmartBattery', ['ngResource', 'uiGmapgoogle-maps', 'chart.js']);

angular.module('SmartBattery')
.config(function(uiGmapGoogleMapApiProvider) {
    uiGmapGoogleMapApiProvider.configure({
        key: 'AIzaSyDDg2yYaNEzeENjcFqGziKG0CP9p147jpk',
        v: '3.17',
        libraries: 'weather,geometry,visualization'
    });
})
.constant('VehicleMapsController$Options', {
    vehicle_status_url: 'vehicle_status.json',
    vehicle_status_interval: 1000.0
})
.controller('VehicleMapsController', function($scope, $interval, $http, VehicleMapsController$Options) {
    var dummy_vehc = {latitude: 31.0232217, longitude: 121.4079586 };
    $scope.map_options = {center: dummy_vehc, zoom: 13 };
    $scope.map_markers = [];
    $scope.map_marker_dict = {};

    $interval(function() {
        $http.get(VehicleMapsController$Options.vehicle_status_url)
        .then(function(resp) {
            if (resp.data.type != 'vehicle_status') {
                throw new Error('Invalid data type received');
            }

            var dataset = resp.data.vehicles;
            _.forEach(dataset, function(veh) {
                var new_set = {
                    vehicle_id: parseInt(veh.vehicle_id),
                    longitude: veh.longitude + Math.random() * 0.001,
                    latitude: veh.latitude + Math.random() * 0.001,
                    title: 'Vehicle ' + String(veh.vehicle_id),
                    data: veh
                };
                new_set.data.state_of_charge += Math.random() * 0.1;
                if (!$scope.map_marker_dict[veh.vehicle_id]) {
                    $scope.map_marker_dict[veh.vehicle_id] = new_set;
                    $scope.map_markers.push(new_set);
                    new_set.track = function() {
                        $scope.map_options.center = new_set;
                    }
                } else {
                    _.extend($scope.map_marker_dict[veh.vehicle_id], new_set);
                }
            });
        })
        .catch(function(e) {
            console.error('Status Update Failure: ' + String(e));
        });
    }, VehicleMapsController$Options.vehicle_status_interval);
});
