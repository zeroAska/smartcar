angular.module('sbfModuleCommon')
.directive('sbfGoogleMaps', function($log) {
    return {
        restrict: 'AE',
        scope: {
            gmaps: '='
        },
        link: function($scope, $element, $attrs) {
            var container = angular.element('<div>');
            container.addClass('google-map-container');
            $element.empty();
            $element.append(container);

            $scope.gmaps = new google.maps.Map(container[0], $scope.$eval($attrs.options));
        }
    };
});
