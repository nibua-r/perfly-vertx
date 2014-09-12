'use strict';

angular.module('samanthaApp')
    .controller('ApplicationsCtrl', ['$scope', 'vertxEventBusService', '$routeParams', '$location', '$timeout', '$http', 'ChartService', '$materialDialog',
        function ($scope, vertxEventBusService, $routeParams, $location, $timeout, $http, ChartService, $materialDialog) {

            var PLAY_ICON = "av:play-arrow";
            var STOP_ICON = "av:stop";

            $scope.ctrl = {
                tabSelected: 0,
                monitoredApplication: undefined,
                monitoring: false,
                selectedApplication: undefined,
                fabIcon: PLAY_ICON
            };

            $scope.progressDialog = {
                loading: false,
                title: "Waiting for Device...",
                total: 0,
                progress: 0,
                appName: '',
                opened: false
            };



            $scope.applications = [];
            $scope.search = '';
            $scope.openSearch = false;

            var deviceId = $routeParams['deviceId'];

            var COUNTDOWN = 5 * 60;
            $scope.timer = {countdown: COUNTDOWN};


            $scope.openConnectionDialog = function () {
                $materialDialog({
                    clickOutsideToClose: false,
                    escapeToClose: false,
                    locals: {
                        deviceId: deviceId,
                    },
                    templateUrl: '../../partials/template/connectionDialog.html',
                    controller: ['$scope', '$hideDialog', 'vertxEventBusService', 'deviceId',
                        function ($scope, $hideDialog, vertxEventBusService, deviceId) {

                            $scope.$broadcast('timer-start');

                            $scope.close = function () {
                                $hideDialog();
                            };

                            $scope.onTimerFinished = function () {
                                $hideDialog();
                                $location.path('/');
                            }

                            vertxEventBusService.on('device.connect', function (device) {
                                if (deviceId == device.id) {
                                    $hideDialog();
                                    $scope.$broadcast('timer-stop');
                                    $scope.$broadcast('timer-set-countdown', COUNTDOWN);
                                }
                            });


                        }]
                });
            };

            vertxEventBusService.on('device.disconnect', function (device) {
                if (deviceId == device.id) {
                    $scope.openConnectionDialog();
                }
            });


            $scope.updateCurrentApplication = function (application) {
                if (application.packageName != $scope.ctrl.selectedApplication) {
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
                $location.search("monitoring", application.packageName);
                vertxEventBusService.publish("vertx.monitoring.start", {
                    deviceId: deviceId,
                    packageName: application.packageName
                });
            }

            $scope.refreshApplications = function (forceRefresh) {
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

            vertxEventBusService.on(deviceId + '/android.apps.start', function (response) {
                $scope.applications.length = 0;
                $scope.progressDialog.total = response.data.total;
                $scope.progressDialog.title = "Getting List of Installed Apps...";
                $scope.progressDialog.loading = true;
            });


            vertxEventBusService.on(deviceId + '/android.apps.progress', function (response) {
                $scope.applications.push(response.data.application);
                if ($scope.progressDialog.opened === false) {
                    $scope.progressDialog.total = response.data.total;
                    $scope.progressDialog.title = "Getting List of Installed Apps...";
                    $scope.progressDialog.loading = true;
                    $scope.progressDialog.opened = true
                }
                $scope.progressDialog.progress = response.data.progress;
                $scope.progressDialog.appName = response.data.application.label
            });

            vertxEventBusService.on(deviceId + '/android.apps.finish', function () {
                $scope.progressDialog.opened = false;
            });

            vertxEventBusService.on('device.disconnect', function (device) {
                if (deviceId == device.id) {
                    $scope.progressDialog.opened = false;
                }
            });

            var packageName = $routeParams["monitoring"];
            if (!angular.isUndefined(packageName) && packageName != null) {

                $http.get("/devices/" + deviceId + "/apps/" + packageName)
                    .success(function (response) {
                        var application = response.application;
                        if (application != null) {
                            $scope.ctrl.selectedApplication = application;
                            $scope.stopApplication();
                            $scope.startApplication(application);
                            ChartService.zoomAllChartsOut();
                        } else {
                            $location.search("monitoring", null);
                        }
                    })
            }

            $http.get("/devices/" + deviceId + "/apps")
                .success(function (response) {
                    $scope.applications = response;
                })
                .error(function () {
                    $scope.progressDialog.opened = true;
                });

            $http.get("/devices/" + deviceId).success(function (response) {
                if (angular.isUndefined(response.device) || response.device == null) {
                    $location.path('/');
                }
            });

        }]);
