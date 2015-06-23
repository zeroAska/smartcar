angular.module('iaUtils')
.directive('iauColoredProgress', function() {
    var progress_classes = ['progress-bar-danger', 'progress-bar-warning', 'progress-bar-success'];
    return {
        template: "<div ng-class=\"{'progress-bar': true, 'progress-bar-success': value >= progress_breaks[1], 'progress-bar-warning': value >= progress_breaks[0] && value < progress_breaks[1], 'progress-bar-danger': value < progress_breaks[0]}\" ng-style=\"{width: !vertical ? value * 100 + '%' : null, height: vertical ? value * 100 + '%' : null}\"></div>",
        restrict: 'AE',
        replace: true,
        scope: {
            value: '=ratio',
            progress_breaks: '=?progressbreaks',
        },
        link: function($scope, $element, $attr) {
            if (!$attr.progressbreaks) {
                $scope.progress_breaks = [0.2, 0.8];
            }
            $scope.vertical = ($attr.vertical != null);
            // Note: it is totally unnecessary to create a complex link function
            // just for the sake of propagating class/etc attributes on the
            // original element. These values are automatically propagated
            // to the replaced top level tag by Angular automatically. See the
            // angular ui bootstrap tab directive for example.
            //
            // This seems to be slightly more efficient than manual parsing in
            // terms of $watch performance.  Performance may be further boosted
            // by dynamically regenerating the template to suit vertical and
            // non-vertical needs, using $compile, but that's much more complex
            // due to the need to manually propagate $attr etc.
        }
    };
});
