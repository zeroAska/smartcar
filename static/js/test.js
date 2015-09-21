my_app = angular.module("test",['ngRoute']);

my_app.controller('http_test',['$scope','$http',function($scope,$http){
    this_scope = $scope;
    
    $scope.get_your_name = function () {
        console.log(this_scope.your_name);
        return this_scope.your_name;
   };
    
    $scope.get_car_num = function() {
        $http.get('/car_num')
        .then(function(result){
            console.log(result);
            this_scope.http_result = result;
        }, function(result) {
            console.log(result);
            this_scope.http_result = result;
        });
        return this_scope.http_result;
    }
   
    $scope.get_car_basic_info = function () {
        $http.get('/get_car_basic_info',{
            params: { "id": "1" }
        })
        .then(function(result){
            console.log(result);
            this_scope.car_result = result;
        }, function(result) {
            console.log(result);
            this_scope.car_result = result;
        });
        return this_scope.car_result;
    };

}]);