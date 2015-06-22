angular.module('sbfModuleVehicleDetails')
.controller('sbfVehicleDetailsController', function($scope, $log) {
    $scope.set_to_today = function() {
        var current_time = new Date();
        $scope.display_date = new Date(
            current_time.getFullYear(),
            current_time.getMonth(),
            current_time.getDate());
    };
    $scope.set_to_today();
})
;
