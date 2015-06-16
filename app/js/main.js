/**
 * @file main.js
 * @author Yichen Zhao
 * @license Proprietary
 */
"use strict";

angular.module('SmartBattery', ['ngResource', 'chart.js', 'ngAnimate', 'iaUtils']);

angular.module('SmartBattery')
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
    },
    gmaps_load_timeout: 10000
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
.controller('VehicleMapsController', function($q, $log, $scope, $interval, $timeout, $http, $compile, VehicleMapsController$Options, VMC$Tools) {
    var dummy_vehc = {latitude: 31.0268809, longitude: 121.4367119 };
    $scope.map_options = {center: dummy_vehc, zoom: 2 }; // 15 };
    $scope.map_marker_dict = {};
    $scope.gmap = null;
    $scope.active_marker = null;
    $scope.ready = false;


    function MapMarker($scope, data, map) {
        var self = this;
        this.data = data;
        this.marker = new MarkerWithLabel({
            position: new google.maps.LatLng(data.latitude, data.longitude),
            map: map,
            icon: VehicleMapsController$Options.default_icon,
            labelAnchor: new google.maps.Point(20, 40)
        });
        this.scope = $scope.$new();
        this.scope.vec = data;
        this.scope.progress_breaks = VehicleMapsController$Options.progress_breaks;
        this._element = VMC$Tools.compile_and_link('#marker-label', this.scope);
        this.marker.set('labelContent', this._element[0]);
        this.slider = new VMC$Tools.MarkSlider(this.marker);
        this.scope.$watchGroup(['vec.latitude', 'vec.longitude'], function(coords) {
            // marker.setPosition(new google.maps.LatLng(coords[0], coords[1]));
            self.slider.moveTo(new google.maps.LatLng(coords[0], coords[1]), 1000);
        });

        this.listeners = [];
        this.destructors = [];
    }

    MapMarker.prototype.click = function(callback) {
        var listn = google.maps.event.addListener(this.marker, 'click', callback);
        this.listeners.push(listn);
        return listn;
    }

    MapMarker.prototype.close = function() {
        _.forEach(this.listeners, function(listener) {
            google.maps.event.removeListener(listener);
        });
        _.forEach(this.destructors, function(destr) {
            destr();
        })
        this.slider.cancel();
        this.marker.setMap(null);
        this._element.remove();
        this.scope.$destroy();
    }

    MapMarker.prototype.register_destructor = function(destr) {
        this.destructors.push(destr);
    }

    function handle_vehicle_update(data) {
        $log.log(data);
        $q(function(resolve) {
            if (data.type != 'vehicle_status') {
                throw new Error('Invalid data type received');
            }


            var old_keys = _.object(_.keys($scope.map_marker_dict));
            var dataset = data.vehicles;
            _.forEach(dataset, function(veh) {
                delete old_keys[veh.vehicle_id];
                var new_set = {
                    vehicle_id: veh.vehicle_id,
                    longitude: veh.longitude,
                    latitude: veh.latitude,
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
                if (!$scope.map_marker_dict[veh.vehicle_id]) {
                    var map_marker = new MapMarker($scope, new_set, $scope.gmap);
                    $scope.map_marker_dict[veh.vehicle_id] = map_marker;
                    new_set.show = false;
                    new_set.options = {};

                    map_marker.click(function() {
                        $scope.$apply(function() {
                            if ($scope.active_marker === new_set) {
                                $scope.active_marker = null;
                            } else {
                                $scope.active_marker = new_set;
                            }
                        });
                    });
                    map_marker.register_destructor(
                        $scope.$watch('active_marker', function(amarker) {
                            if (amarker === new_set) {
                                map_marker.marker.setIcon(VehicleMapsController$Options.active_icon);
                            } else {
                                map_marker.marker.setIcon(VehicleMapsController$Options.default_icon);
                            }
                        })
                    );
                } else {
                    _.extend($scope.map_marker_dict[veh.vehicle_id].data, new_set);
                }
            });
            _.keys(old_keys).forEach(function(vehicle_id) {
                if ($scope.map_marker_dict[vehicle_id]) {
                    var marker = $scope.map_marker_dict[vehicle_id];
                    delete $scope.map_marker_dict[vehicle_id];
                    if (marker.data === $scope.active_marker) {
                        $scope.active_marker = null;
                    }
                    marker.close();
                }
            });
            resolve();
        })
        .catch(function(e) {
            $log.error('Status Update Failure: ' + String(e));
        });
    };


    function begin_update_vehicle_status() {
        $log.log('starting update');
        $scope.socket = io.connect(location.protocol + '//' + location.host + '/test');
        $scope.socket.on('vehicle_update', handle_vehicle_update);
    }

    function load_maps() {
        var dummy_vehc = {lat: 31.0268809, lng: 121.4367119 };
        var options = {center: dummy_vehc, zoom: 8 }; // 15 };
        $scope.gmap = new google.maps.Map($('#map-canvas .google-map-container')[0], options);
    }

    function start_maps() {
        begin_update_vehicle_status();
        $scope.ready = true;
        $log.log($scope.gmap);

        $scope.vehicle_info_window = new google.maps.InfoWindow();
        var te = VMC$Tools.compile_and_link('#vehicle-info-window', $scope);
        $log.log(te);
        $scope.vehicle_info_window.setContent(te[0]);

        $scope.$watch('active_marker', function(active_marker) {
            if (active_marker) {
                $scope.vehicle_info_window.open($scope.gmap, $scope.map_marker_dict[active_marker.vehicle_id].marker);
            } else {
                $scope.vehicle_info_window.close();
            }
        });

        google.maps.event.addListener($scope.vehicle_info_window, 'closeclick', function() {
            $scope.$apply(function() {
                $scope.active_marker = null;
            });
        });
    }

    $scope.maps_loaded = function() {
        $timeout.cancel(gmaps_load_timeout);
        load_maps();
        start_maps();
    }

    $scope.gmaps_load_failed = false;
    var gmaps_load_timeout = $timeout(function() {
        $scope.gmaps_load_failed = true;
    }, VehicleMapsController$Options.gmaps_load_timeout);
})
.directive('sbfColoredProgress', function() {
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
.filter('latlngcoords', function() {
    return function(input) {
        return Math.floor(input) + '\u00b0 ' + Math.floor((input % 1) * 60) + "' " +
            ((((input % 1) * 60) % 1) * 60).toFixed(2) + "''";
    };
})
;
