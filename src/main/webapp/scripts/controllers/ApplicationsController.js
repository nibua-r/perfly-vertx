'use strict';

angular.module('samanthaApp')
    .controller('ApplicationsCtrl', ['$scope', 'vertxEventBusService', '$routeParams', '$location', '$timeout', '$http',
        function ($scope, vertxEventBusService, $routeParams, $location, $timeout, $http) {

            var PLAY_ICON = "av:play-arrow";
            var STOP_ICON = "av:stop";
 
            $scope.ctrl = {
                tabSelected: 0,
                monitoredApplication: undefined,
                monitoring: false,
                selectedApplication: undefined,
                fabIcon: PLAY_ICON
            };
            $scope.progressDialogOpened = false;
            $scope.applications = [];
            $scope.search = '';
            $scope.openSearch = false;

            var deviceId = $routeParams['deviceId'];

            $scope.updateCurrentApplication = function (application) {
                if (application.packageName == $scope.ctrl.selectedApplication) {

                } else {
                    $scope.ctrl.selectedApplication = application;
                }
            }

            $scope.fabAction = function () {
                if ($scope.ctrl.fabIcon == STOP_ICON) {
                    $scope.stopApplication();
                } else {
                    $scope.startApplication($scope.ctrl.selectedApplication);
                }
            }

            $scope.stopApplication = function () {
                vertxEventBusService.publish("vertx.monitoring.stop", {deviceId: deviceId});
                $scope.ctrl.monitoring = false;
            }

            $scope.startApplication = function (application) {
                $scope.ctrl.monitoredApplication = application;
                $scope.ctrl.tabSelected = 1;
                $scope.ctrl.monitoring = true;
                vertxEventBusService.publish("vertx.monitoring.start", {
                    deviceId: deviceId,
                    packageName: application.packageName
                });
            }

            $scope.retrieveApplications = function (forceRefresh) {
                forceRefresh = forceRefresh ? forceRefresh : false;
                vertxEventBusService.publish("vertx.apps.get", {
                    deviceId: deviceId,
                    forceRefresh: forceRefresh
                });
            }


            $scope.searchComparator = function (app) {
                if (!app) {
                    return false;
                }
                if (!$scope.search || $scope.search.length <= 2) {
                    return true;
                }

                return (app.label.toLowerCase().indexOf($scope.search.toLowerCase()) > -1)
                || (app.packageName.toLowerCase().indexOf($scope.search.toLowerCase()) > -1);
            }


            $scope.$watch("ctrl", function (ctrl) {

                var icon = PLAY_ICON;
                if (ctrl.monitoring && (ctrl.tabSelected == 1 || ctrl.tabSelected == 0 && ctrl.selectedApplication.packageName == ctrl.monitoredApplication.packageName)) {
                    icon = STOP_ICON;
                }

                $scope.ctrl.fabIcon = icon;

            }, true);

            $http.get("/device/" + deviceId).success(function (response) {
                console.log(response);
            });

            vertxEventBusService.on(deviceId + '/android.apps.start', function (response) {
                console.log("start receiving apps -> " + response.data.total);
                $scope.applications.length = 0;
                $scope.progressDialogOpened = true;
                //$("#applicationLoadingProgressBar").get(0).max = response.data.total;
            });


            vertxEventBusService.on(deviceId + '/android.apps.progress', function (response) {
                $scope.applications.push(response.data.application);
                console.log("receiving app -> " + response.data.progress);
                //$("#applicationLoadingProgressBar").get(0).value = response.data.progress;
            });

            

            vertxEventBusService.on(deviceId + '/android.apps.finish', function () {
                console.log("finish receiving apps");
                $scope.progressDialogOpened = false;
            });

            $scope.$on('vertx-eventbus.system.connected', function () {
                $scope.retrieveApplications();
            });


            if (vertxEventBusService.readyState() === 1) {
                $scope.retrieveApplications();
            }
            
        }]);
