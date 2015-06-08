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
    vehicle_status_interval: 1000.0,
    progress_breaks: [0.2, 0.8],
})
.controller('VehicleMapsController', function($log, $scope, $interval, $http, $compile, VehicleMapsController$Options, uiGmapIsReady) {
    var dummy_vehc = {latitude: 31.0232217, longitude: 121.4079586 };
    $scope.map_options = {center: dummy_vehc, zoom: 13 };
    $scope.map_markers = [];
    $scope.map_marker_dict = {};
    $scope.gmap_markers = [];
    $scope.gmap_marker_dict = {};
    $scope.gmap = null;

    function update_vehicle_status() {
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
                    data: veh,
                    charts: {},
                    icon: 'imgs/car-icon.svg',
                };
                new_set.data.title = new_set.title;
                new_set.charts.labels = ["January", "February", "March", "April", "May", "June", "July"];
                new_set.charts.series = ['SOC', 'Health'];
                new_set.charts.data = [
                    [65, 59, 80, 81, 56, 55, 40],
                    [28, 48, 40, 19, 86, 27, 90]
                ];
                new_set.data.state_of_charge = Math.random();
                if (!$scope.map_marker_dict[veh.vehicle_id]) {
                    $scope.map_marker_dict[veh.vehicle_id] = new_set;
                    $scope.map_markers.push(new_set);
                    new_set.show = false;
                    new_set.options = {};

                    var marker = new MarkerWithLabel({
                        position: new google.maps.LatLng(new_set.latitude, new_set.longitude),
                        map: $scope.gmap.map,
                        icon: {
                            url: 'imgs/car-icon.svg',
                            size: new google.maps.Size(35, 35),
                            origin: new google.maps.Point(0, 0),
                            anchor: new google.maps.Point(35/2, 35/2)
                        },
                        title: 'test',
                        labelAnchor: new google.maps.Point(20, 40)
                    });
                    $scope.gmap_markers.push(marker);
                    $scope.gmap_marker_dict[new_set.vehicle_id] = marker;
                    var elem = angular.element('#marker-label').children().clone();
                    var new_scope = $scope.$new();
                    new_scope.vec = new_set;
                    new_scope.progress_breaks = VehicleMapsController$Options.progress_breaks;
                    $compile(elem)(new_scope);
                    marker.set('labelContent', elem[0]);
                } else {
                    _.extend($scope.map_marker_dict[veh.vehicle_id], new_set);
                    $scope.gmap_marker_dict[veh.vehicle_id].setPosition(new google.maps.LatLng(new_set.latitude, new_set.longitude));
                }
            });
        })
        .catch(function(e) {
            $log.error('Status Update Failure: ' + String(e));
        });
    }

    uiGmapIsReady.promise(1).then(function(maps) {
        $scope.gmap = maps[0];
        $interval(update_vehicle_status, VehicleMapsController$Options.vehicle_status_interval);
        $log.log($scope.gmap);
    });
})
.directive('coloredProgress', function() {
    return {
        template: "<div ng-class=\"{'progress-bar': true, 'progress-bar-success': value >= progress_breaks[1], 'progress-bar-warning': value >= progress_breaks[0] && value < progress_breaks[1], 'progress-bar-danger': value < progress_breaks[0]}\" ng-style=\"{width: value * 100 + '%'}\"></div>",
        restrict: 'AE',
        replace: true,
        scope: {
            value: '=value',
            progress_breaks: '=progressbreaks',
        }
    };
})
;
