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
.directive('sbfGoogleMaps', function($log, sbfGoogleMapsInstanceCache) {
    return {
        restrict: 'AE',
        scope: {
            gmaps: '='
        },
        link: function($scope, $element, $attrs) {
            var cached_map;
            if ($attrs.noCaching == null) {
                cached_map = sbfGoogleMapsInstanceCache.get();
            }
            if (cached_map) {
                $log.log('using cached map', cached_map);
                cached_map.instance.setOptions($scope.$eval($attrs.options));
                $element.empty();
                $element.append(cached_map.container);
            } else {
                $log.log('creating new map');
                cached_map = {};
                cached_map.container = angular.element('<div>');
                cached_map.container.addClass('google-map-container');
                $element.empty();
                $element.append(cached_map.container);
                cached_map.instance = new google.maps.Map(cached_map.container[0], $scope.$eval($attrs.options));
            }


            $scope.gmaps = cached_map.instance;

            $scope.$on('$destroy', function() {
                cached_map.container.detach();
                cached_map.container.remove();
                $scope.gmaps = undefined;
                if ($attrs.noCaching == null) {
                    sbfGoogleMapsInstanceCache.put(cached_map);
                }
            });
        }
    };
});
