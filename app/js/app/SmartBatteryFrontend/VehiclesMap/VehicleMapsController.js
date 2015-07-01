angular.module('sbfModuleVehiclesMap')
.constant('sbfVMC$Options', {
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
.factory('sbfVMC$Tools', function($log, $compile, $templateCache, $http) {
    return {
        MarkSlider: function(marker, step_time) {
            var timer = null;
            var source_coord = null;
            var dest_coord = null;
            var animation_counter = 0;
            var final_counter = -1;
            var setTimeout = window.setTimeout;
            var clearTimeout = window.clearTimeout;
            if (!step_time) {
                if (window.requestAnimationFrame && window.cancelAnimationFrame) {
                    setTimeout = window.requestAnimationFrame;
                    clearTimeout = window.cancelAnimationFrame;
                    step_time = 1000 / 60;
                } else {
                    step_time = 10;
                }
            }

            function cancel() {
                if (timer) {
                    clearTimeout(timer);
                }
                timer = null;
                source_coord = null;
                dest_coord = null;
                animation_counter = 0;
                final_counter = -1;
            }

            function start() {
                timer = setTimeout(animation_step, step_time);
            }
            function animation_step() {
                timer = null;
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
                } else {
                    start();
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
            };
        }
    };
})
.controller('sbfVehicleMapsController', function($q, $log, $scope, $interval, $timeout, $http, $compile, sbfVMC$Options, sbfVMC$Tools) {
    var dummy_vehc = {latitude: 31.0268809, longitude: 121.4367119 };
    $scope.map_options = {center: dummy_vehc, zoom: 2 }; // 15 };
    $scope.map_marker_dict = {};
    $scope.vehicles = {};
    $scope.marker_data = {};
    $scope.ready = false;

    function handle_vehicle_update(data) {
        $log.log(data);
        $q(function(resolve) {
            if (data.type != 'vehicle_status') {
                throw new Error('Invalid data type received');
            }


            var dataset = data.vehicles;
            var datadict = {};
            dataset = _.forEach(dataset, function(veh) {
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
                datadict[veh.vehicle_id] = new_set;
            });
            $scope.vehicles = datadict;
            resolve();
        })
        .catch(function(e) {
            $log.error('Status Update Failure: ' + String(e));
        });
    }


    function begin_update_vehicle_status() {
        $log.log('starting update');
        $scope.socket = io.connect(window.location.protocol + '//' + window.location.host + '/test');
        $scope.socket.on('vehicle_update', handle_vehicle_update);

        $scope.$on('$destroy', function() {
            $scope.socket.disconnect();
            $scope.socket.removeListener('vehicle_update', handle_vehicle_update);
        });
    }

    $scope.gmaps_load_failed = false;
    var gmaps_load_timeout = $timeout(function() {
        $scope.gmaps_load_failed = true;
    }, sbfVMC$Options.gmaps_load_timeout);

    begin_update_vehicle_status();
})
.directive('sbfVmcVehicleInfoWindow', function($log) {
    return {
        require: '^sbfGoogleMaps',
        restrict: 'E',
        transclude: true,
        scope: {
            activeVehicleId: '=',
            getVehicleMarker: '&',
        },
        link: function($scope, $element, $attrs, $controller, $transclude) {
            $transclude($scope.$parent, function(clone) {
                var vehicle_info_window = new google.maps.InfoWindow();
                var window_content = angular.element('<div>').append(clone);
                vehicle_info_window.setContent(window_content[0]);

                $scope.$watch('activeVehicleId', function(active_vehicle) {
                    if (active_vehicle != null) {
                        var marker = $scope.getVehicleMarker({ vehicle_id: active_vehicle });
                        vehicle_info_window.open($controller.getMap(), marker);
                    } else {
                        vehicle_info_window.close();
                    }
                });


                var closelistener = google.maps.event.addListener(vehicle_info_window, 'closeclick', function () {
                    $scope.$apply(function() {
                        $scope.activeVehicleId = null;
                    });
                });

                $scope.$on('$destroy', function() {
                    google.maps.event.removeListener(closelistener);
                    vehicle_info_window.close();
                    vehicle_info_window.setContent(null);
                    window_content.remove();
                });
            });
        }
    };
})
.directive('sbfVmcVehicleMarker', function($log, sbfVMC$Options, sbfVMC$Tools) {
    /**
     * @remarks Private use directive, assumes existing scope variables,
     * has implicit dependencies on global state, etc etc...
     *
     * Use ng-repeat to simplify management and boost compile performance
     * with transclude
     */
    function MapMarker($scope, data, map, element) {
        var self = this;
        this.data = data;
        this.marker = new MarkerWithLabel({
            position: new google.maps.LatLng(data.latitude, data.longitude),
            map: map,
            icon: sbfVMC$Options.default_icon,
            labelAnchor: new google.maps.Point(20, 40)
        });
        $scope.progress_breaks = sbfVMC$Options.progress_breaks;
        this._element = element;
        this.marker.set('labelContent', this._element[0]);
        this.slider = new sbfVMC$Tools.MarkSlider(this.marker);
        $scope.$watchGroup(['vec.latitude', 'vec.longitude'], function(coords) {
            // marker.setPosition(new google.maps.LatLng(coords[0], coords[1]));
            self.slider.moveTo(new google.maps.LatLng(coords[0], coords[1]), 1000);
        });

        this.listeners = [];
    }

    MapMarker.prototype.click = function(callback) {
        var listn = google.maps.event.addListener(this.marker, 'click', callback);
        this.listeners.push(listn);
        return listn;
    };

    MapMarker.prototype.close = function() {
        _.forEach(this.listeners, function(listener) {
            google.maps.event.removeListener(listener);
        });
        this.slider.cancel();
        this.marker.setMap(null);
        this.marker.set('labelContent', null);
        this._element.remove();
    };

    return {
        require: '^sbfGoogleMaps',
        restrict: 'E',
        transclude: true,
        link: function($scope, $element, $attrs, $controller, $transclude) {
            $transclude($scope, function(cloned, scope) {
                var container = angular.element('<div>');
                container.append(cloned);
                var marker = new MapMarker(scope, scope.vec, $controller.getMap(), container);
                var vehicle_id = scope.vec.vehicle_id;
                marker.click(function() {
                    scope.$apply(function() {
                        if (scope.marker_data.active_vehicle === scope.vec.vehicle_id) {
                            scope.marker_data.active_vehicle = null;
                        } else {
                            scope.marker_data.active_vehicle = scope.vec.vehicle_id;
                        }
                    });
                });

                scope.$watch('marker_data.active_vehicle', function(vehicle_id) {
                    if (vehicle_id === scope.vec.vehicle_id) {
                        marker.marker.setIcon(sbfVMC$Options.active_icon);
                    } else {
                        marker.marker.setIcon(sbfVMC$Options.default_icon);
                    }
                });

                scope.map_marker_dict[vehicle_id] = marker;

                scope.$on('$destroy', function() {
                    scope.marker_data.active_vehicle = null;
                    marker.close();
                    delete scope.map_marker_dict[vehicle_id];
                });
            });
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
