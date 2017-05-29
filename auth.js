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
      this.username = null;
      this.roles = null;
      this.token = null;
      this.refreshToken = null;
      this.tokenType = null;
      this.customProperties = {};
      this.loggedIn = false;
      this.endpoint = 'default';

      var service = this;

      this.broadcast = function () {
        $rootScope.$broadcast('userChange');
      };

      this.setEndpoint = function (endpoint) {
        service.endpoint = endpoint;
      };

      this.login = function (username, password, endpoint) {
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

      this.authenticate = function (data) {
        setData(data);
        $http.defaults.headers.common.Authorization = ((this.tokenType || '') + " " + this.token).trim();
        authConf[service.endpoint].functionIfAuthenticated(service, data);
        store.set('auth', data);
      };

      this.logout = function () {
        setData({});
        service.customProperties = {};
        $http.defaults.headers.common.Authorization = null;
        store.remove('auth');
        authConf[service.endpoint].functionIfLoggedOff();
        if (authConf[service.endpoint].logoutEndpointUrl) {
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
          authConf[auth.endpoint].functionIfDenied($state, toState, authConf, auth);
        }
      });

      var response = store.get('auth');
      if (response) {
        auth.authenticate(response);
      }
    }]);
})();
