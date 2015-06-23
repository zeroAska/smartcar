angular.module('sbfModuleVehicleDetails')
.controller('sbfVehicleDetailsController', function($scope, $log, $stateParams, $interval) {
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
})
;
