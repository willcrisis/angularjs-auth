'use strict';
(function () {
  angular.module('willcrisis.angularjs-auth', ['ngRoute', 'ui.router', 'angular-storage'])
    .provider('authConf', [function () {
      var service = this;

      var defaultEndpoint = {
        loginState: 'login',
        endpointUrl: '',
        logoutEndpointUrl: null,
        usernameFormProperty: 'username',
        passwordFormProperty: 'password',
        usernameProperty: 'username',
        tokenProperty: 'access_token',
        rolesProperty: 'roles',
        refreshTokenProperty: 'refresh_token',
        tokenTypeProperty: 'token_type',
        adminRole: 'ROLE_ADMIN',
        functionIfDenied: function (stateService, toState, authConf, authService) {
          stateService.go(authConf[authService.endpoint].loginState);
        },
        functionIfAuthenticated: function (service, data) {

        },
        functionIfLoggedOff: function () {

        }
      };

      service.default = angular.copy(defaultEndpoint);

      service.$get = [function () {
        return service;
      }];

      this.addEndpoint = function(endpointName, props) {
        service[endpointName] = angular.copy(defaultEndpoint);
        if (props) {
          angular.extend(service[endpointName], props);
        }
      }
    }])
    .service('auth', ['$rootScope', 'store', '$http', 'authConf', function ($rootScope, store, $http, authConf) {
      var service = this;

      service.username = null;
      service.roles = null;
      service.token = null;
      service.refreshToken = null;
      service.tokenType = null;
      service.customProperties = {};
      service.loggedIn = false;
      service.endpoint = 'default';

      service.broadcast = function () {
        $rootScope.$broadcast('userChange');
      };

      service.setEndpoint = function (endpoint) {
        service.endpoint = endpoint;
      };

      service.login = function (username, password, endpoint) {
        if (!endpoint) {
          endpoint = 'default';
        }
        service.endpoint = endpoint;
        var data = {};
        data[authConf[service.endpoint].usernameFormProperty] = username;
        data[authConf[service.endpoint].passwordFormProperty] = password;
        return Promise.race([
          $http.post(authConf[service.endpoint].endpointUrl, data)
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

      service.authenticate = function (data) {
        setData(data);
        data.endpoint = service.endpoint;
        $http.defaults.headers.common.Authorization = ((this.tokenType || '') + " " + this.token).trim();
        authConf[service.endpoint].functionIfAuthenticated(service, data);
        store.set('auth', data);
      };

      service.logout = function () {
        setData({});
        service.customProperties = {};
        $http.defaults.headers.common.Authorization = null;
        store.remove('auth');
        authConf[service.endpoint].functionIfLoggedOff();
        if (authConf[service.endpoint].logoutEndpointUrl) {
          return $http.get(authConf.logoutEndpointUrl);
        }
      };

      service.hasRole = function (role) {
        if (!service.roles) {
          return false;
        }
        return service.roles.indexOf(role) > -1;
      };

      service.hasAllRoles = function (roles) {
        if (!service.roles) {
          return false;
        }
        for (var i = 0; i < roles.length; i++) {
          if (!service.hasRole(roles[i])) {
            return false;
          }
        }
        return true;
      };

      service.hasAnyRole = function (roles) {
        if (!service.roles) {
          return false;
        }
        for (var i = 0; i < roles.length; i++) {
          if (service.hasRole(roles[i])) {
            return true;
          }
        }
        return false;
      };

      service.canAccess = function (state) {
        if (!state) {
          return true;
        }
        if (state.auth === undefined) {
          return true;
        } else if (state.auth.constructor == Array) {
          if (state.requireAll) {
            return service.hasAdminRole() || service.hasAllRoles(state.auth);
          } else {
            return service.hasAdminRole() || service.hasAnyRole(state.auth);
          }
        } else {
          return state.auth === this.loggedIn
        }
      };

      service.hasAdminRole = function() {
        if (!service.roles) {
          return false;
        }
        return service.hasRole(authConf[service.endpoint].adminRole);
      };

      service.addCustomProperty = function (name, value) {
        service.customProperties[name] = value;
      };

      function setData(response) {
        if (response.endpoint) {
          service.endpoint = response.endpoint;
        }

        service.username = getPropertyValue(authConf[service.endpoint].usernameProperty, response);
        service.token = getPropertyValue(authConf[service.endpoint].tokenProperty, response);
        service.roles = getPropertyValue(authConf[service.endpoint].rolesProperty, response);
        service.refreshToken = getPropertyValue(authConf[service.endpoint].refreshTokenProperty, response);
        service.tokenType = getPropertyValue(authConf[service.endpoint].tokenTypeProperty, response);
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

      return service;
    }])
    .directive('authUsername', ['auth', function (auth) {
      return {
        restrict: 'AE',
        template: '{{username}}',
        link: function(scope) {
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
        link: function(scope, element, attr) {
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
            return auth.hasAdminRole() || auth.hasRole(value);
          };
          ngIf.link.apply(ngIf, arguments);
        }
      }
    }])
    .directive('authHasAdminRole', ['auth', 'ngIfDirective', function (auth, ngIfDirective) {
      var ngIf = ngIfDirective[0];
      return {
        restrict: 'AE',
        transclude: ngIf.transclude,
        priority: ngIf.priority - 1,
        terminal: ngIf.terminal,
        scope: {},
        link: function (scope, element, attrs) {
          attrs.ngIf = function () {
            return auth.hasAdminRole();
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
            return auth.hasAdminRole() || auth.hasAnyRole(value);
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
            return auth.hasAdminRole() || auth.hasAllRoles(value);
          };
          ngIf.link.apply(ngIf, arguments);
        }
      }
    }])
    .run(['$rootScope', '$state', 'auth', 'authConf', 'store', function ($rootScope, $state, auth, authConf, store) {
      $rootScope.$on('$stateChangeStart', function (event, toState) {
        if (!auth.canAccess(toState)) {
          event.preventDefault();
          authConf[auth.endpoint].functionIfDenied($state, toState, authConf, auth);
        }
      });

      var response = store.get('auth');
      if (response) {
        auth.authenticate(response);
      }
    }]);
})();
