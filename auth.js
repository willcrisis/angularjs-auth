'use strict';
(function () {
  angular.module('willcrisis.angular-auth', ['ngRoute', 'ui.router', 'angular-storage'])
    .provider('authConf', [function () {
      var options = {
        loginState: 'login',
        functionIfDenied: function (stateService, toState) {
          stateService.go(options.loginState);
        },
        functionIfAuthenticated: function (data) {

        },
        functionIfLoggedOff: function () {

        },
        rolesSupport: false,
        setLoginState: function (state) {
          options.loginState = state;
        },
        setFunctionIfDenied: function (functionIfDenied) {
          options.functionIfDenied = functionIfDenied;
        },
        setFunctionIfAuthenticated: function (functionIfAuthenticated) {
          options.functionIfAuthenticated = functionIfAuthenticated;
        },
        setFunctionIfLoggedOff: function (functionIfLoggedOff) {
          options.functionIfLoggedOff = functionIfLoggedOff;
        },
        setRolesSupport: function(rolesSupport) {
          options.rolesSupport = rolesSupport;
        },
        setAuthenticateAfterRegister: function(authenticateAfterRegister) {
          options.authenticateAfterRegister = authenticateAfterRegister;
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
      if (!firebase) {
        throw new Error('Firebase is not defined! Please follow these instructions for configuring it in your project: https://firebase.google.com/docs/web/setup')
      }
      this.firebaseAuth = firebase.auth();

      this.uid = null;
      this.email = null;
      this.displayName = null;
      this.photoURL = null;
      this.token = null;
      this.refreshToken = null;
      this.loggedIn = false;
      this.roles = null;

      var service = this;

      this.broadcast = function () {
        $rootScope.$broadcast('userChange');
      };

      this.registerUser = function (email, password) {
        return Promise.race([
          service.firebaseAuth.createUserWithEmailAndPassword(email, password).then(function(result) {
            if (authConf.authenticateAfterRegister) {
              result.user = result;
              service.authenticate(result);
            }
            return result;
          }).catch(function (error) {
            handleError(error)
          })
        ]);
      };

      this.loginWithEmailPassword = function (email, password) {
        return Promise.race([
          service.firebaseAuth.signInWithEmailAndPassword(email, password).then(function(result) {
            result.user = result;
            service.authenticate(result);
            return service;
          }).catch(function (error) {
            handleError(error);
          })
        ]);
      };

      this.loginWithGoogle = function () {
        return loginWithProvider(getProviderForProviderId('google.com'));
      };

      this.loginWithFacebook = function () {
        return loginWithProvider(getProviderForProviderId('facebook.com'));
      };

      this.loginWithTwitter = function () {
        return loginWithProvider(getProviderForProviderId('twitter.com'));
      };

      this.authenticate = function (data) {
        setData(data);
        authConf.functionIfAuthenticated(data);
        store.set('auth', {
          user: {
            uid: data.user.uid,
            email: data.user.email,
            displayName: data.user.displayName,
            photoURL: data.user.photoURL,
            refreshToken: data.user.refreshToken
          }, credential: {
            idToken: data.credential.idToken
          }
        });
      };

      this.logout = function () {
        return Promise.race([
          service.firebaseAuth.signOut().then(function () {
            setData({});
            authConf.functionIfLoggedOff();
            store.remove('auth');
          })
        ]);
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
        if (!state || state.auth === undefined) {
          return true;
        } else if (state.auth.constructor == Array) {
          if (authConf.rolesSupport) {
            if (state.requireAll) {
              return this.hasAllRoles(state.auth);
            } else {
              return this.hasAnyRole(state.auth);
            }
          } else {
            return true;
          }
        } else {
          return state.auth === this.loggedIn
        }
      };

      function loginWithProvider(provider) {
        return Promise.race([
          service.firebaseAuth.signInWithPopup(provider).then(function (result) {
            service.authenticate(result);
            return service;
          }).catch(function (error) {
            handleError(error);
          })
        ]);
      }

      function setData(response) {
        response.user = response.user || {};
        response.credential = response.credential || {};

        service.uid = response.user.uid;
        service.email = response.user.email;
        service.displayName = response.user.displayName;
        service.photoURL = response.user.photoURL;
        service.token = response.credential.idToken;
        service.refreshToken = response.user.refreshToken;
        service.loggedIn = !!response.user.uid;
      }

      function handleError(error) {
        if (error.code === 'auth/account-exists-with-different-credential') {
          var pendingCred = error.credential;
          var email = error.email;

          service.firebaseAuth.fetchProvidersForEmail(email).then(function (providers) {
            var provider = getProviderForProviderId(providers[0]);
            service.firebaseAuth.signInWithPopup(provider).then(function (result) {
              result.user.link(pendingCred).then(function () {
                service.authenticate(result);
                return new Promise(function (resolve, reject) {
                  resolve();
                });
              });
            });
          });
        } else {
          throw error;
        }
      }

      function getProviderForProviderId(providerId) {
        switch (providerId) {
          case 'google.com':
            return new firebase.auth.GoogleAuthProvider();
          case 'facebook.com':
            return new firebase.auth.FacebookAuthProvider();
          case 'twitter.com':
            return new firebase.auth.TwitterAuthProvider();
          default:
            return null;
        }
      }
    }])
    .directive('authEmail', ['auth', function (auth) {
      return {
        restrict: 'E',
        template: '{{email}}',
        controller: ['$scope', function ($scope) {
          $scope.email = auth.email;
        }]
      }
    }])
    .directive('authDisplayName', ['auth', function (auth) {
      return {
        restrict: 'E',
        template: '{{displayName}}',
        controller: ['$scope', function ($scope) {
          $scope.displayName = auth.displayName;
        }]
      }
    }])
    .directive('authUserPhoto', ['auth', function (auth) {
      return {
        restrict: 'E',
        template: '<img ng-src="{{photoURL}}" />',
        controller: ['$scope', function ($scope) {
          $scope.photoURL = auth.photoURL;
        }]
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
    .config(['$stateProvider', function($stateProvider) {
      $stateProvider.decorator('parent', function (internalStateObj, parentFn) {
        internalStateObj.self.$$state = function() { return internalStateObj; };
        return parentFn(internalStateObj);
      });
    }])
    .run(['$rootScope', '$state', 'auth', 'authConf', 'store', '$location', function ($rootScope, $state, auth, authConf, store, $location) {
      $rootScope.$on('$stateChangeStart', function (event, toState) {
        if (!auth.canAccess(toState)) {
          event.preventDefault();
          authConf.functionIfDenied($state, toState);
        }
      });
      $rootScope.$on('$locationChangeStart', function (event) {
        var found;
        angular.forEach($state.get(), function(state) {
          var privatePortion = state.$$state();
          var match = privatePortion.url.exec($location.path(), $location.search());
          if (match) {
            found = state;
          }
        });
        if (!found || !auth.canAccess(found)) {
          event.preventDefault();
          authConf.functionIfDenied($state, found);
        }
      });

      var response = store.get('auth') || {};
      if (response) {
        auth.authenticate(response);
      }
    }]);
})();
