angular.module('sbfModuleCommon')
.directive('sbfGoogleMapsPolyline', function($log) {
    return {
        require: '?^sbfGoogleMaps',
        restrict: 'AE',
        scope: {
            gmap: '=?',
            options: '=?',
            path: '=',
            polyline: '=?',
        },
        link: function($scope, $element, $attrs, controller) {
            var polyline = new google.maps.Polyline($scope.options || {});

            if (controller) {
                polyline.setMap(controller.getMap());
            } else {
                $scope.$watch('gmap', function(gmap) {
                    polyline.setMap(gmap);
                });
            }

            $scope.$watch('path', function(path) {
                if (path) {
                    polyline.setPath(path);
                }
            }, true);
            $scope.polyline = polyline;

            $scope.$on('$destroy', function() {
                polyline.setMap(null);
                $scope.polyline = null;
            });
        }
    };
});
