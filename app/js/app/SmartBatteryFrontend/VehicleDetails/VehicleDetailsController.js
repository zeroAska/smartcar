angular.module('sbfModuleVehicleDetails')
.controller('sbfVehicleDetailsController', function($scope, $log, $stateParams, $interval, $timeout) {
    $scope.vehicle_id = $stateParams.vehicle_id;
    $scope.set_to_today = function() {
        var current_time = new Date();
        $scope.display_date = new Date(
            current_time.getFullYear(),
            current_time.getMonth(),
            current_time.getDate());
    };
    $scope.set_to_today();

    $scope.battery_ratio = 0.0;
    $interval(function() {
        $scope.battery_ratio += 0.1;
        if ($scope.battery_ratio > 1.0) {
            $scope.battery_ratio = 0;
        }
    }, 1000);

    $scope.components = [
        { name: 'Engine', success: true},
        { name: 'Steering', success: true},
        { name: 'Braking', warning: true },
        { name: 'Lighting', error: true },
    ];

    $scope.vehicle = {performance_chart: {}};
    $scope.vehicle.performance_chart.labels = ["January", "February", "March", "April", "May", "June", "July"];
    $scope.vehicle.performance_chart.series = ['SOC', 'Health'];
    $scope.vehicle.performance_chart.data = [
        [65, 59, 80, 81, 56, 55, 40],
        [28, 48 * Math.random(), 40, 19, 86, 27, 90]
    ];

    $scope._v = {performance_chart_active: false};
    $scope.$watch('_v.performance_chart_active', function(active, old_active) {
        if (active !== old_active) {
            window.requestAnimationFrame(function() {
                $scope.$apply(
                    function() {
                        $log.log(active);
                        $scope._v.performance_chart_active_delayed = active;
                    }, 100);
            });
        }
    });
})
;
