'use strict';
(function () {
    angular.module('willcrisis.angular-auth', ['ngRoute', 'ui.router', 'angular-storage'])
        .provider('authConf', [function () {
            var options = {
                loginState: 'login',
                endpointUrl: '',
                logoutEndpointUrl: null,
                usernameFormProperty: 'username',
                passwordFormProperty: 'password',
                customFormProperty: [],
                usernameProperty: 'username',
                tokenProperty: 'access_token',
                rolesProperty: 'roles',
                refreshTokenProperty: 'refresh_token',
                tokenTypeProperty: 'token_type',
                functionIfDenied: function (stateService, toState) {
                    stateService.go(options.loginState);
                },
                functionIfAuthenticated: function (service, data) {

                },
                functionIfLoggedOff: function () {

                },
                setLoginState: function (state) {
                    options.loginState = state;
                },
                setEndpointUrl: function (url) {
                    options.endpointUrl = url;
                },
                setFunctionIfDenied: function (functionIfDenied) {
                    options.functionIfDenied = functionIfDenied;
                },
                setLogoutEndpointUrl: function (logoutEndpointUrl) {
                    options.logoutEndpointUrl = logoutEndpointUrl;
                },
                setUsernameFormProperty: function (property) {
                    options.usernameFormProperty = property;
                },
                setPasswordFormProperty: function (property) {
                    options.passwordFormProperty = property;
                },
                setUsernameProperty: function (property) {
                    options.usernameProperty = property;
                },
                setTokenProperty: function (property) {
                    options.tokenProperty = property;
                },
                setRolesProperty: function (property) {
                    options.rolesProperty = property;
                },
                setRefreshTokenProperty: function (property) {
                    options.refreshTokenProperty = property;
                },
                setTokenTypeProperty: function (property) {
                    options.tokenTypeProperty = property;
                },
                setFunctionIfAuthenticated: function (functionIfAuthenticated) {
                    options.functionIfAuthenticated = functionIfAuthenticated;
                },
                setFunctionIfLoggedOff: function (functionIfLoggedOff) {
                    options.functionIfLoggedOff = functionIfLoggedOff;
                },
                addCustomProperty: function (property) {
                    options.customFormProperty.push(property);
                }
            };

            angular.extend(this, options);

            this.$get = [function () {
                if (!options) {
                    throw new Error('Could not load configs.');
                }
                return options;
            }];
        }])
        .service('auth', ['$rootScope', 'store', '$http', 'authConf', function ($rootScope, store, $http, authConf) {
            this.username = null;
            this.roles = null;
            this.token = null;
            this.refreshToken = null;
            this.tokenType = null;
            this.customProperties = {};
            this.loggedIn = false;

            var service = this;

            this.broadcast = function () {
                $rootScope.$broadcast('userChange');
            };

            this.login = function (username, password, custom) {
                var data = {};
                data[authConf.usernameFormProperty] = username;
                data[authConf.passwordFormProperty] = password;

                if (authConf.customFormProperty.length > 0) {

                    for (var i in authConf.customFormProperty) {

                        data[authConf.customFormProperty[i]] = custom[authConf.customFormProperty[i]];

                    }

                }

                return Promise.race([
                    $http.post(authConf.endpointUrl, data)
                        .then(
                            function (result) {
                                service.authenticate(result.data);
                                service.broadcast();
                                return service;
                            },
                            function (error) {
                                throw error;
                            }
                        )
                ]);
            };

            this.authenticate = function (data) {
                setData(data);
                $http.defaults.headers.common.Authorization = ((this.tokenType || '') + " " + this.token).trim();
                authConf.functionIfAuthenticated(service, data);
                store.set('auth', data);
            };

            this.logout = function () {
                setData({});
                service.customProperties = {};
                $http.defaults.headers.common.Authorization = null;
                store.remove('auth');
                authConf.functionIfLoggedOff();
                if (authConf.logoutEndpointUrl) {
                    return $http.get(authConf.logoutEndpointUrl);
                }
            };

            this.hasRole = function (role) {
                if (!this.roles) {
                    return false;
                }
                return this.roles.indexOf(role) > -1;
            };

            this.hasAllRoles = function (roles) {
                if (!this.roles) {
                    return false;
                }
                for (var i = 0; i < roles.length; i++) {
                    if (!this.hasRole(roles[i])) {
                        return false;
                    }
                }
                return true;
            };

            this.hasAnyRole = function (roles) {
                if (!this.roles) {
                    return false;
                }
                for (var i = 0; i < roles.length; i++) {
                    if (this.hasRole(roles[i])) {
                        return true;
                    }
                }
                return false;
            };

            this.canAccess = function (state) {
                if (!state) {
                    return true;
                }
                if (state.auth === undefined) {
                    return true;
                } else if (state.auth.constructor == Array) {
                    if (state.requireAll) {
                        return this.hasAllRoles(state.auth);
                    } else {
                        return this.hasAnyRole(state.auth);
                    }
                } else {
                    return state.auth === this.loggedIn
                }
            };

            this.addCustomProperty = function (name, value) {
                service.customProperties[name] = value;
            };

            function setData(response) {
                service.username = getPropertyValue(authConf.usernameProperty, response);
                service.token = getPropertyValue(authConf.tokenProperty, response);
                service.roles = getPropertyValue(authConf.rolesProperty, response);
                service.refreshToken = getPropertyValue(authConf.refreshTokenProperty, response);
                service.tokenType = getPropertyValue(authConf.tokenTypeProperty, response);
                service.loggedIn = !!service.token;
            }

            function getPropertyValue(property, response) {
                var propertyValue = response;
                var propertyParts = property.split('.');
                propertyParts.forEach(function (propertyPart) {
                    propertyValue = propertyValue ? propertyValue[propertyPart] : null;
                });
                return propertyValue;
            }
        }])
        .directive('authUsername', ['auth', function (auth) {
            return {
                restrict: 'AE',
                template: '{{username}}',
                link: function (scope) {
                    scope.username = auth.username;
                }
            }
        }])
        .directive('authCustomProperty', ['auth', function (auth) {
            return {
                restrict: 'AE',
                template: '{{value}}',
                scope: {
                    property: '@'
                },
                link: function (scope, element, attr) {
                    var value = scope.property || attr.authCustomProperty;
                    if (!value) {
                        throw new Error('Property is required!');
                    }
                    scope.value = auth.customProperties[value];
                }
            }
        }])
        .directive('authLoggedIn', ['auth', 'ngIfDirective', function (auth, ngIfDirective) {
            var ngIf = ngIfDirective[0];
            return {
                restrict: 'AE',
                transclude: ngIf.transclude,
                priority: ngIf.priority - 1,
                terminal: ngIf.terminal,
                link: function (scope, element, attrs) {
                    attrs.ngIf = function () {
                        return auth.loggedIn;
                    };
                    ngIf.link.apply(ngIf, arguments);
                }
            }
        }])
        .directive('authNotLoggedIn', ['auth', 'ngIfDirective', function (auth, ngIfDirective) {
            var ngIf = ngIfDirective[0];
            return {
                restrict: 'AE',
                transclude: ngIf.transclude,
                priority: ngIf.priority - 1,
                terminal: ngIf.terminal,
                link: function (scope, element, attrs) {
                    attrs.ngIf = function () {
                        return !auth.loggedIn;
                    };
                    ngIf.link.apply(ngIf, arguments);
                }
            }
        }])
        .directive('authHasRole', ['auth', 'ngIfDirective', function (auth, ngIfDirective) {
            var ngIf = ngIfDirective[0];
            return {
                restrict: 'AE',
                transclude: ngIf.transclude,
                priority: ngIf.priority - 1,
                terminal: ngIf.terminal,
                scope: {
                    role: '@'
                },
                link: function (scope, element, attrs) {
                    var value = scope.role || attrs.authHasRole;
                    if (!value) {
                        throw new Error('auth-has-role: A Role is required');
                    }
                    attrs.ngIf = function () {
                        return auth.hasRole(value);
                    };
                    ngIf.link.apply(ngIf, arguments);
                }
            }
        }])
        .directive('authHasAnyRole', ['auth', 'ngIfDirective', function (auth, ngIfDirective) {
            var ngIf = ngIfDirective[0];
            return {
                restrict: 'AE',
                transclude: ngIf.transclude,
                priority: ngIf.priority - 1,
                terminal: ngIf.terminal,
                scope: {
                    roles: '@'
                },
                link: function (scope, element, attrs) {
                    var value = scope.roles ? scope.roles.split(',') : attrs.authHasAnyRole ? attrs.authHasAnyRole.split(',') : null;
                    if (!value) {
                        throw new Error('auth-has-any-role: At least one Role is required');
                    }
                    attrs.ngIf = function () {
                        return auth.hasAnyRole(value);
                    };
                    ngIf.link.apply(ngIf, arguments);
                }
            }
        }])
        .directive('authHasAllRoles', ['auth', 'ngIfDirective', function (auth, ngIfDirective) {
            var ngIf = ngIfDirective[0];
            return {
                restrict: 'AE',
                transclude: ngIf.transclude,
                priority: ngIf.priority - 1,
                terminal: ngIf.terminal,
                scope: {
                    roles: '@'
                },
                link: function (scope, element, attrs) {
                    var value = scope.roles ? scope.roles.split(',') : attrs.authHasAllRoles ? attrs.authHasAllRoles.split(',') : null;
                    if (!value) {
                        throw new Error('auth-has-all-roles: At least one Role is required');
                    }
                    attrs.ngIf = function () {
                        return auth.hasAllRoles(value);
                    };
                    ngIf.link.apply(ngIf, arguments);
                }
            }
        }])
        .run(['$rootScope', '$state', 'auth', 'authConf', 'store', function ($rootScope, $state, auth, authConf, store) {
            $rootScope.$on('$stateChangeStart', function (event, toState) {
                if (!auth.canAccess(toState)) {
                    event.preventDefault();
                    authConf.functionIfDenied($state, toState);
                }
            });

            var response = store.get('auth');
            if (response) {
                auth.authenticate(response);
            }
        }]);
})();
