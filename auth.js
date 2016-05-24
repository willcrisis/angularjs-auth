'use strict';
(function () {
  angular.module('willcrisis.angular-auth' ['ngRoute', 'ui.router', 'angular-storage'])
  .provider('authConf', [function () {
    var options = {
      loginState: 'login',
      successState: 'dashboard',
      endpointUrl: '',
      logoutEndpointUrl: null,
      functionIfDenied: function(toState) {
        $state.go(options.loginState);
      },
      setLoginState: function (state) {
        options.loginState = state;
      },
      setSuccessState: function(state) {
        options.successState = state;
      },
      setEndpointUrl: function (url) {
        options.endpointUrl = url;
      },
      setFunctionIfDenied: function(functionIfDenied) {
        options.functionIfDenied = functionIfDenied;
      },
      setLogoutEndpointUrl: function(logoutEndpointUrl) {
        options.logoutEndpointUrl = logoutEndpointUrl;
      }
    };

    this.$get = [function () {
      if (!options) {
        throw new Error('Não foi possível carregar as configurações.');
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
    this.loggedIn = false;

    var service = this;

    this.broadcast = function () {
      $rootScope.$broadcast('userChange');
    };

    this.login = function (username, password) {
      var data = {username: username, password: password};
      return Promise.race([
        $http.post(authConf.endpointUrl, data)
          .then(
            function (result) {
              service.authenticate(result.data);
              return service;
            },
            function (error) {
              throw error;
            }
          )
      ]);
    };

    this.authenticate = function (data) {
      setData(service, data);
      $http.defaults.headers.common.Authorization = (this.tokenType + " " + this.token).trim();
      store.set('auth', data);
    };

    this.logout = function () {
      setData(service, {});
      $http.defaults.headers.common.Authorization = null;
      store.remove('auth');
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

    function setData(service, response) {
      service.username = response.username;
      service.token = response['access_token'];
      service.roles = response.roles;
      service.refreshToken = response['refresh_token'];
      service.tokenType = response['token_type'];
      service.loggedIn = !!response['access_token'];
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
          throw new Error('auth-has-role: É necessário informar uma Role');
        }
        attrs.ngIf = function() {
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
          throw new Error('auth-has-any-role: É necessário informar pelo menos uma Role');
        }
        attrs.ngIf = function() {
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
          throw new Error('auth-has-all-roles: É necessário informar pelo menos uma Role');
        }
        attrs.ngIf = function() {
          return auth.hasAllRoles(value);
        };
        ngIf.link.apply(ngIf, arguments);
      }
    }
  }])
  .run(['$rootScope', '$state', 'auth', 'authConf', function($rootScope, $state, auth, authConf) {
    $rootScope.$on('$stateChangeStart', function (event, toState) {
      if (!auth.canAccess(toState)) {
        event.preventDefault();
        authConf.functionIfDenied(toState);
      }
    });
  }]);
})();