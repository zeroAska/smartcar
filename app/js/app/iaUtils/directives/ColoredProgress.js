angular.module('iaUtils')
.directive('iauColoredProgress', function() {
    var progress_classes = ['progress-bar-danger', 'progress-bar-warning', 'progress-bar-success'];
    return {
        restrict: 'A',
        scope: {
            value: '=ratio',
            progress_breaks: '=?progressbreaks',
        },
        link: function($scope, $element, $attr) {
            var vertical;
            vertical = false;
            if (!$attr.progressbreaks) {
                $scope.progress_breaks = [0.2, 0.8];
            }

            if ($attr.vertical != null) {
                vertical = true;
            }

            $element.addClass('progress-bar');

            $scope.$watch('value', function(value) {
                var active_index = 0;
                var i, l;
                for (i=0, l=$scope.progress_breaks.length; i < l; i++) {
                    if (value >= $scope.progress_breaks[i]) {
                        active_index = i + 1;
                    } else {
                        break;
                    }
                }
                for (i=0, l=progress_classes.length; i < l; i++) {
                    $element.toggleClass(progress_classes[i], i == active_index);
                }

                $element.css(vertical ? 'height' : 'width', value * 100 + '%');
            });
        },
    };
});
