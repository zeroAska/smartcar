/**
 * @file main.js
 * @author Yichen Zhao
 * @license Proprietary
 */
"use strict";

angular.module('SmartBattery', ['ngResource', 'uiGmapgoogle-maps', 'chart.js', 'ngAnimate']);

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
    default_icon: {
        url: 'imgs/car-icon.svg',
        size: {width: 36, height: 36},
        origin: {x: 0, y: 0},
        anchor: {x: 36/2, y: 36/2}
    },
    active_icon: {
        url: 'imgs/car-icon-active.svg',
        size: {width: 48, height: 48},
        origin: {x: 0, y: 0},
        anchor: {x: 48/2, y: 48/2}
    }
})
.factory('VMC$Tools', function($log, $compile) {
    return {
        compile_and_link: function(template, scope) {
            var template_element;
            if (typeof template == 'string') {
                if (template[0] === '#') {
                    template_element = angular.element(template).children().clone();
                } else {
                    template_element = angular.element(template);
                }
            } else {
                template_element = template.clone();
            }

            var link_func = $compile(template_element);
            link_func(scope);
            return template_element;
        },
        MarkSlider: function(marker, step_time) {
            var timer = null;
            var source_coord = null;
            var dest_coord = null;
            var animation_counter = 0;
            var final_counter = -1;
            if (!step_time) {
                step_time = 10;  // 24fps
            }

            function cancel() {
                if (timer) {
                    clearInterval(timer);
                }
                timer = null;
                source_coord = null;
                dest_coord = null;
                animation_counter = 0;
                final_counter = -1;
            }

            function start() {
                timer = setInterval(animation_step, step_time);
            }
            function animation_step() {
                if (animation_counter < final_counter) {
                    var interp_coord = {
                        lat: source_coord.lat + (dest_coord.lat - source_coord.lat) * (animation_counter + 1) / final_counter,
                        lng: source_coord.lng + (dest_coord.lng - source_coord.lng) * (animation_counter + 1) / final_counter
                    };
                    marker.setPosition((interp_coord));
                }
                animation_counter ++;
                if (animation_counter >= final_counter) {
                    marker.setPosition(dest_coord);
                    cancel();
                }
            }
            this.cancel = cancel;
            this.moveTo = function(coords, animation_time) {
                cancel();
                source_coord = marker.getPosition();
                source_coord = { lat: source_coord.lat(), lng: source_coord.lng() };
                dest_coord = {lat: coords.lat(), lng: coords.lng()};
                final_counter = Math.ceil(animation_time / step_time);
                start();
            }
        }
    };
})
.controller('VehicleMapsController', function($log, $scope, $interval, $http, $compile, VehicleMapsController$Options, uiGmapIsReady, VMC$Tools) {
    var dummy_vehc = {latitude: 31.0268809, longitude: 121.4367119 };
    $scope.map_options = {center: dummy_vehc, zoom: 15 };
    $scope.map_markers = [];
    $scope.map_marker_dict = {};
    $scope.gmap_markers = [];
    $scope.gmap_marker_dict = {};
    $scope.gmap = null;
    $scope.active_marker = null;
    $scope.ready = false;

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
                };
                new_set.data.title = new_set.title;
                new_set.charts.labels = ["January", "February", "March", "April", "May", "June", "July"];
                new_set.charts.series = ['SOC', 'Health'];
                new_set.charts.data = [
                    [65, 59, 80, 81, 56, 55, 40],
                    [28, 48 * Math.random(), 40, 19, 86, 27, 90]
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
                        icon: VehicleMapsController$Options.default_icon,
                        title: 'test',
                        labelAnchor: new google.maps.Point(20, 40)
                    });
                    $scope.gmap_markers.push(marker);
                    $scope.gmap_marker_dict[new_set.vehicle_id] = marker;
                    // XXX Register and wait for scope $destroy when marker
                    // goes out of range
                    var new_scope = $scope.$new();
                    new_scope.vec = new_set;
                    new_scope.progress_breaks = VehicleMapsController$Options.progress_breaks;
                    var elem = VMC$Tools.compile_and_link('#marker-label', new_scope);
                    // XXX keep in mind that MarkerWithLabel with labelContent
                    // being a DOM element does not work by default. A patch
                    // is needed
                    marker.set('labelContent', elem[0]);
                    google.maps.event.addListener(marker, 'click', function() {
                        $scope.$apply(function() {
                            if ($scope.active_marker === new_set) {
                                $scope.active_marker = null;
                            } else {
                                $scope.active_marker = new_set;
                            }
                        });
                    });
                    var slider = new VMC$Tools.MarkSlider(marker);
                    new_scope.$watchGroup(['vec.latitude', 'vec.longitude'], function(coords) {
                        // marker.setPosition(new google.maps.LatLng(coords[0], coords[1]));
                        slider.moveTo(new google.maps.LatLng(coords[0], coords[1]), 1000);
                    });
                    $scope.$watch('active_marker', function(amarker) {
                        if (amarker === new_set) {
                            marker.setIcon(VehicleMapsController$Options.active_icon);
                        } else {
                            marker.setIcon(VehicleMapsController$Options.default_icon);
                        }
                    });
                } else {
                    _.extend($scope.map_marker_dict[veh.vehicle_id], new_set);
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
        update_vehicle_status();
        $scope.ready = true;
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
