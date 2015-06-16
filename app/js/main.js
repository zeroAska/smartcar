/**
 * @file main.js
 * @author Yichen Zhao
 * @license Proprietary
 */
"use strict";

angular.module('SmartBattery', ['ngResource', 'chart.js', 'ngAnimate']);

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
    $scope.map_markers = [];
    $scope.map_marker_dict = {};
    $scope.gmap_markers = [];
    $scope.gmap_marker_dict = {};
    $scope.gmap = null;
    $scope.active_marker = null;
    $scope.ready = false;

    function handle_vehicle_update(data) {
        $log.log(data);
        $q(function(resolve) {
            if (data.type != 'vehicle_status') {
                throw new Error('Invalid data type received');
            }

            var dataset = data.vehicles;
            _.forEach(dataset, function(veh) {
                var new_set = {
                    vehicle_id: parseInt(veh.vehicle_id),
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
                    $scope.map_marker_dict[veh.vehicle_id] = new_set;
                    $scope.map_markers.push(new_set);
                    new_set.show = false;
                    new_set.options = {};

                    var marker = new MarkerWithLabel({
                        position: new google.maps.LatLng(new_set.latitude, new_set.longitude),
                        map: $scope.gmap,
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
        var options = {center: dummy_vehc, zoom: 2 }; // 15 };
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
                // $scope.vehicle_info_window.open($scope.gmap_marker_dict[active_marker.vehicle_id]);
                $scope.vehicle_info_window.open($scope.gmap, $scope.gmap_marker_dict[active_marker.vehicle_id]);
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
.directive('sbfScriptLoader', function($log) {
    // For global callback functions
    var directive_counter = 0;
    /**
     * on-loaded: command to run when loading completes
     * loaded: sets to true when loaded
     * src: url to load the script
     * callback: substring in src to substitute for the name of a global
     *  callback function
     * load: set to true will trigger loading
     * load-on-ready: if attribute is present, automatically triggers loading
     *  on document ready
     * error: set to true when loading fails
     * onerror: executes when loading fails
     *
     * Note: this is a one-shot loader.  If loading fails, will not retry.
     */
    return {
        restrict: 'AE',
        replace: true,
        scope: {
            'onloaded': '&onLoaded',
            'loaded': '=?',
            'src': '@',
            'callback': '@',
            'load': '=?',
            'error': '=?',
            'onerror': '&onError'
        },
        link: function($scope, $element, $attr) {
            var instance_number = directive_counter;
            directive_counter ++;
            if (($attr.load == null) && ($attr.loadOnReady == null)) {
                throw new Error("You must specify either load or load-on-ready");
            }
            if ($attr.useScriptTag != null && $attr.callback == null) {
                throw new Error('It is unsafe to use script tag loading without a callback, will not be able to determine when loading is complete. Refusing to continue');
            }
            var element = angular.element(document.createComment(
                ' sbf-script-loader: ' + $scope.src + ' '
            ));
            $element.replaceWith(element);

            $scope.loaded = false;
            $scope.error = false;

            function load_script() {
                // Disable function to prevent reloading (accidental or otherwise)
                load_script = null;

                var url = $scope.src;

                function on_loaded() {
                    $scope.$apply(function() {
                        $scope.loaded = true;
                        $scope.onloaded();
                    });
                }

                if ($scope.callback) {
                    var callback_name = '_sbfScriptLoader_callback_' + instance_number.toString();
                    window[callback_name] = function() {
                        on_loaded();
                        delete window[callback_name];
                    }

                    url = url.replace($scope.callback, callback_name);
                }


                if ($attr.useScriptTag == null) {
                    $log.log('loading ' + String(url) + ' with jQuery');
                    jQuery.ajax({
                        dataType: 'script',
                        cache: true,
                        url: url
                    }).done(function() {
                        on_loaded();
                    }).fail(function() {
                        $scope.$apply(function() {
                            $scope.error = true;
                            $scope.onerror();
                        });
                    });
                } else {
                    $log.log('loading ' + String(url) + ' with <script>');
                    var scriptTag = angular.element('<script>');
                    scriptTag.attr('src', url);
                    scriptTag.attr('type', 'text/javascript');
                    element.replaceWith(scriptTag);
                }
            }

            var unwatch_load = $scope.$watch('load', function(load) {
                if (load) {
                    unwatch_load();
                    load_script();
                }
            });

            if ($attr.loadOnReady != null) {
                // Setting the variable so that if necessary, the external
                // controller can still detect the load event (via $watch)
                $scope.load = true;
            }
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
