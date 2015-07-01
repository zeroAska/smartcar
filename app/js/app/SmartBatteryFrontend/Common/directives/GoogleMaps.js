angular.module('sbfModuleCommon')
.service('sbfGoogleMapsInstanceCache', function() {
    /**
     * Why is this needed? Because you cannot properly destroy Google Maps
     * instances.  Prevents memory leaks on SPAs.
     */
    var inactive_maps_instances = [];
    this.get = function() {
        if (inactive_maps_instances.length > 0) {
            return inactive_maps_instances.pop();
        }
        return null;
    };

    this.put = function(instance) {
        inactive_maps_instances.push(instance);
    };
})
.directive('sbfGoogleMaps', function($log, sbfGoogleMapsInstanceCache, $parse) {
    return {
        restrict: 'AE',
        transclude: true,
        controller: function($scope) {
            this.gmap = null;
            this.getMap = function() {
                return this.gmap;
            };
        },
        link: function($scope, $element, $attrs, controller, $transclude) {
            var cached_map;
            var gmap_assigner = $parse($attrs.gmap);
            if ($attrs.noCaching == null) {
                cached_map = sbfGoogleMapsInstanceCache.get();
            }
            if (cached_map) {
                $log.log('using cached map', cached_map);
                $element.empty();
                $element.append(cached_map.container);
                google.maps.event.trigger(cached_map.instance, 'resize');
                cached_map.instance.setOptions($scope.$eval($attrs.options));
            } else {
                $log.log('creating new map');
                cached_map = {};
                cached_map.container = angular.element('<div>');
                cached_map.container.addClass('google-map-container');
                $element.empty();
                $element.append(cached_map.container);
                cached_map.instance = new google.maps.Map(cached_map.container[0], $scope.$eval($attrs.options));
            }


            if (gmap_assigner.assign) {
                gmap_assigner.assign($scope, cached_map.instance);
            }
            controller.gmap = cached_map.instance;

            var childrenContainer = $('<div>').hide().appendTo($element);
            $transclude($scope, function(cloned) {
                // This is mandatory to get parent controller reference working
                childrenContainer.append(cloned);
            });

            $scope.$on('$destroy', function() {
                cached_map.container.detach();
                if (gmap_assigner.assign) {
                    gmap_assigner.assign($scope, undefined);
                }
                if ($attrs.noCaching == null) {
                    sbfGoogleMapsInstanceCache.put(cached_map);
                }
                childrenContainer.remove();
            });
        }
    };
});
