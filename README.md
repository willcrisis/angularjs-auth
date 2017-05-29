# AngularJS Authentication

Secure your app with this module. It works great with Grails server-side apps using Spring Security Core and Spring Security Rest plugins.

## Dependencies
It depends on [ui-router](https://angular-ui.github.io/ui-router/) and [angular-storage](https://github.com/auth0/angular-storage).
Make sure you're using these dependencies on your app. 

## Installing

To install this module, run the following:

Npm:
```
npm install angularjs-auth --save
```

Bower:
```
bower install willcrisis-angularjs-auth --save
```

After installing, add a reference to this module to your app.js:

```
angular.module('myModule', ['willcrisis.angularjs-auth']);
```

## Configuring

This plugin has some configuration that you can customize using `authConf` provider:

```
angular.module('myModule').config(function(authConfProvider) {
  authConfProvider.default.endpointUrl = 'http://myServer/myLoginEndpoint';
  authConfProvider.default.logoutEndpointUrl = 'http://myServer/myLogoutEndpoint';
  authConfProvider.default.loginState = 'myLoginState';
  authConfProvider.default.usernameFormProperty = 'username';
  authConfProvider.default.passwordFormProperty = 'password';
  authConfProvider.default.usernameProperty = 'username';
  authConfProvider.default.tokenProperty = 'token';
  authConfProvider.default.rolesProperty = 'roles';
  authConfProvider.default.refreshTokenProperty = 'refresh_token';
  authConfProvider.default.tokenTypeProperty = 'token_type';
  authConfProvider.default.functionIfDenied = function(stateService, toState) {
    //what to do if user can't access this state
  };
  authConfProvider.default.functionIfAuthenticated = function(authService, responseData) {
    //what to do if user is successfully authenticated
  };
  authConfProvider.default.setFunctionIfLoggedOff = function() {
    //what to do if user is successfully logged off
  };
});

//if you need to use some services that can't be accessed in .config() phase, you can use .run():
angular.module('myModule').run(function(myService, authConf) {
  authConf.default.functionIfLoggedOff = function() {
    myService.doSomething();
  };
}
```

### endpointUrl (required) 
Sets the server login URL. Ex.: `'http://localhost:8080/login'`   

### logoutEndpointUrl(optional, default: null)
If you need logout the user on server side, set the logout endpoint here. If you're not using server-side logout, just ignore this option.
   
### loginState (optional, default: 'login') 
After creating the login state using angular-ui-router, set the state name here.   

### usernameFormProperty (optional, default: 'username') 
Property name that will be sent in HTTP request containing username value.

### passwordFormProperty (optional, default: 'password') 
Property name that will be sent in HTTP request containing password value.

### usernameProperty (optional, default: 'username') 
Property name that contains username on login HTTP response.

### tokenProperty (optional, default: 'access_token')
Property name that contains access token on login HTTP response.

### rolesProperty (optional, default: 'roles')
Property name that contains user roles on login HTTP response.   

### refreshTokenProperty (optional, default: 'refresh_token')
Property name that contains the refresh token on login HTTP response.   

### tokenTypeProperty (optional, default: 'token_type')
Property name that contains token type on login HTTP response. Ex. `'Bearer'`, etc.
   
### functionIfDenied(stateService, toState, authConf, authService) (optional, default: redirect to login page) 
Function to execute if user can't access the destination state. The $state service is passed as a param, so you can use it even on .config() block of your module.

### functionIfAuthenticated(authService, responseData) (optional, default: do nothing) 
Function to execute if user is successfully authenticated. The auth service and server response data are passed as parameters to the function. Use this if you want, for example, set custom HTTP headers further than user's token.

### functionIfLoggedOff() (optional, default: do nothing): 
Function to execute if user is successfully logged off. Use this if you want, for example, clear custom HTTP headers further than user's token.

## Securing your states

When defining your states using angular-ui-router, you can define some properties to make this module work just like this:

```
angular.module('myModule').config(function($stateProvider, authConf) {
  $stateProvider.state('stateName', {
    url: '/myState',
    templateUrl: 'myTemplateUrl',
    controller: 'MyController',
    auth: ['ROLE_USER', 'ROLE_CUSTOM'],
    requireAll: true
  });
}
```

### auth (optional)

If you don't want to secure the state, i.e., any user would be able to access it, you should not set `auth` property. If you want to secure the state, define `auth` property in it. The following values are valid:

#### auth: true

When using `auth: true`, angularjs-auth will only allow logged in users to access the state.

#### auth: false

When using `auth: false`, angularjs-auth will not allow logged in users to access the state.

#### auth: ['ROLE_ARRAY']

When using `auth: ['ROLE_ARRAY']`, angularjs-auth will only allow logged in users that has any of the roles defined in array. If you want to allow access only to users that have all the specified roles, you must set `requireAll` property to true.

## Logging in your users

To login your users, you can use `auth` service in your controller. It will fire a POST HTTP request to the login endpoint configured in `authConf`.

```
angular.module('myModule').controller('LoginController', function($scope, auth) {
    $scope.login = function() {
        auth.login($scope.username, $scope.password).then(function(loggedInUser) {
            //Do something
        }).catch(function(error) {
            console.error('Something went wrong.', error);
            //Do something
        });
    };
});
```

### auth 
Service contains following properties and functions:

#### auth.username (String)
Returns logged in user's username.   

#### auth.roles (Array)
Returns logged in user's roles.   

#### auth.token (String)
Returns logged in user's token.   

#### auth.refreshToken (String)
Returns logged in user's refresh token.   

#### auth.tokenType (String)
Returns logged in user's token type.   

#### auth.loggedIn (boolean)
Returns true if the user is logged in, otherwise returns false.   

#### auth.customProperties (object)
Allows defining custom data to this service. Use this to store user's name, for example.'

#### auth.broadcast()
Broadcasts the login change state. It will fire 'stateChange' event.

#### auth.login(username, password, endpointName(optional)) 
Fires a POST HTTP request to the `endpointUrl` URL. Callback contains the logged in user.   

#### auth.logout()
Logs out the current logged in user. If `logoutEndpointUrl` is defined, fires a GET HTTP request to the URL.   

#### auth.hasRole(roleName)
Returns true if logged in user has the desired role, otherwise returns false.   

#### auth.hasAllRoles(roleArray)
Returns true if the logged in user has all the desired roles, otherwise returns false.   

#### auth.hasAnyRole(roleArray)
Returns true if the logged in user has any of the desired roles, otherwise returns false.   

#### auth.canAccess(state)
Returns true if logged in user can access the desired state, otherwise returns false.   
#### auth.addCustomProperty(propertyName, propertyValue)
Adds a custom property to this service. Access this property using `auth.customProperties['propertyName']` service object or `<auth-custom-property property="propertyName">` directive.

This is an example of a valid default RESPONSE returned by a server-side Grails app after firing the login request to `endpointUrl` and is valid for this module:

```
{
  "username": "admin",
  "roles": [
    "ROLE_ADMIN",
    "ROLE_USER"
  ],
  "token_type": "Bearer",
  "access_token": "eyJhbGciOiJIUzI1NiJ9.eyJwcmluY2lwYWwiOiJINHNJQUFBQUFBQUFBSlZUUVU4VFFSUitXOXVna21BaDBjUURYc1FiMlNaNjdLbmdRa3FHUXJyMmdnbGt1anVzQTdNejY4d3N0QmZUa3h3NFFGUVNFXC84Q1wvMFF2XC9nQ2pCNitjdmZwbW9XdzFKc1E1YmQ3NzV2dSs5NzJkOHd1b0dRM1BFazI1TUg0bThvUkwzMlNheThTd0tOZmNEdjNjTUIweld5QldDMkFQSzNCNXZBcDRCQ284dGpCSDl1Z0JiUWdxazhaR2Y0OUZ0am5ROEZUcDVJcHhWOU9VSFNxOTcxOXpSMHF6UHdSS2F1KzBBbE5iTUV1alNPWFNkcFFNQmhuWExONkNlbGtqS3RwM3Bmc1JkcGkwbkFvekNaMWlrdllGaXdsTTA5eStVcWpLbWJGdzc5SnNicmxvaE13MkNkek9xREhvN3E5SlF1dXN1NzZ6S1hHQzFcL0FHcW9QTXc0UFpQWEZRM1wvSDR5MG9JbkpvcmFSWjZNbFV4MytWT0hQbEg4Kysrbm53YTlTb0FtTW5pelhmSytzTWxHSDNlXC92V29DTnFMTER5WXNGN0Ntb01NM2N5V3pDODBjOHJmUG02K1A3czRlbmtMbFIxaTVmXC8zc2RDNlNtNjRyTktNYW1yVnhJNlE5ckNLMzFVa1g3cVpmTHlGb1JcL3lOQk1NXC95aHBXWHd0VVJManVGV3R4RGh2QzNlN0d5VFlhVDFmYjNlTUs4NVlxQmVsYmhCdTdxeTBTYnRGXC90Rm9yM2FEdGRhNGNhZG85TUtnNnlock5FNjVST2N6UlhCdTR6NVJ1T1wvam42ZGZUaDVcL1J4ZHJVRHVnSW1lNHQzb0o2dVJwbittMzUyZnoweDkrSEJjcGpGXC9FYjZBQ1VmMVZBd0FBIiwic3ViIjoiYWRtaW4iLCJyb2xlcyI6WyJST0xFX0FETUlOIiwiUk9MRV9SRVNQX0ZJTElBTCIsIlJPTEVfUkVTUF9JR1JFSkEiLCJST0xFX1VTRVIiXSwiZXhwIjoxNDY0MTg0NDM3LCJpYXQiOjE0NjQxODA4Mzd9.TFIhXZTcrgcPu5Duj7jnjkIl7S4_SyyCgi6ycT4DY8w",
  "expires_in": 3600,
  "refresh_token": "eyJhbGciOiJIUzI1NiJ9.eyJwcmluY2lwYWwiOiJINHNJQUFBQUFBQUFBSlZUUVU4VFFSUitXOXVna21BaDBjUURYc1FiMlNaNjdLbmdRa3FHUXJyMmdnbGt1anVzQTdNejY4d3N0QmZUa3h3NFFGUVNFXC84Q1wvMFF2XC9nQ2pCNitjdmZwbW9XdzFKc1E1YmQ3NzV2dSs5NzJkOHd1b0dRM1BFazI1TUg0bThvUkwzMlNheThTd0tOZmNEdjNjTUIweld5QldDMkFQSzNCNXZBcDRCQ284dGpCSDl1Z0JiUWdxazhaR2Y0OUZ0am5ROEZUcDVJcHhWOU9VSFNxOTcxOXpSMHF6UHdSS2F1KzBBbE5iTUV1alNPWFNkcFFNQmhuWExONkNlbGtqS3RwM3Bmc1JkcGkwbkFvekNaMWlrdllGaXdsTTA5eStVcWpLbWJGdzc5SnNicmxvaE13MkNkek9xREhvN3E5SlF1dXN1NzZ6S1hHQzFcL0FHcW9QTXc0UFpQWEZRM1wvSDR5MG9JbkpvcmFSWjZNbFV4MytWT0hQbEg4Kysrbm53YTlTb0FtTW5pelhmSytzTWxHSDNlXC92V29DTnFMTER5WXNGN0Ntb01NM2N5V3pDODBjOHJmUG02K1A3czRlbmtMbFIxaTVmXC8zc2RDNlNtNjRyTktNYW1yVnhJNlE5ckNLMzFVa1g3cVpmTHlGb1JcL3lOQk1NXC95aHBXWHd0VVJManVGV3R4RGh2QzNlN0d5VFlhVDFmYjNlTUs4NVlxQmVsYmhCdTdxeTBTYnRGXC90Rm9yM2FEdGRhNGNhZG85TUtnNnlock5FNjVST2N6UlhCdTR6NVJ1T1wvam42ZGZUaDVcL1J4ZHJVRHVnSW1lNHQzb0o2dVJwbittMzUyZnoweDkrSEJjcGpGXC9FYjZBQ1VmMVZBd0FBIiwic3ViIjoiYWRtaW4iLCJyb2xlcyI6WyJST0xFX0FETUlOIiwiUk9MRV9SRVNQX0ZJTElBTCIsIlJPTEVfUkVTUF9JR1JFSkEiLCJST0xFX1VTRVIiXSwiaWF0IjoxNDY0MTgwODM3fQ.sIe0FyW7UEH3Yc21KwfDymdKfStBKX9Zf6dsNCuvMn0"
}
```

## Multiple Endpoints

If you are using version 0.0.8 or older, there is the ability to use multiple endpoints. This is useful if you need to log in in different servers.

By default, there is a `default` endpoint pre-configured for your app. To configure an additional endpoint, use the `addEndpoint` function of the `authConf` provider as follows:

```
angular.module('myModule').config(function(authConfProvider) {
  authConfProvider.addEndpoint('other', {
    endpointUrl: 'http://myServer/myOtherLoginEndpoint',
    usernameFormProperty: 'username',
    passwordFormProperty: 'password',
    tokenProperty: 'token',
    usernameProperty: 'username',
    functionIfAuthenticated: function (authService, data) {
      console.log('user is authenticated in another endpoint');
    }
  });
});
```

You can use the same configurations that is available for the `default` endpoint.
 
To change your application to the endpoint you created, you can either use the `setEndpoint` of the `auth` service, or pass the endpoint name to the `login` function.
 
```
angular.module('myModule').controller('LoginController', function (auth, $scope, $state) {
  // Use this
  auth.setEndpoint('other');
  
  // or this
  $scope.login = function () {
    auth.login($scope.username, $scope.password, 'other').then(function () {
      console.log('logged in');
    });
  }
});
```

You don't need to set the endpoint to `default`. It's selected by default.

## Using directives

This plugin has some directives to make your life easier. They are:

### auth-username

Writes the current logged in username.

```
<div class="myDivClass"><auth-username></auth-username></div>
```

### auth-custom-property

Writes the desired custom property.

```
<div class="myDivClass"><auth-custom-property property="myProperty"></auth-custom-property></div>
<div class="myDivClass" auth-custom-property="myProperty"></div>
```

### auth-logged-in

Only prints the content if user is logged in.

```
<auth-logged-in>I will be visible only to logged in users.</auth-logged-in>
<div auth-logged-in>Me too.</div>
```

### auth-not-logged-in

Only prints the content if user is logged in.

```
<auth-not-logged-in>I will be visible only to not logged in users.</auth-not-logged-in>
<div auth-not-logged-in>Me too.</div>
```

### auth-has-role

Only prints the content if logged in user has the desired role.

```
<auth-has-role role="ROLE_CUSTOM">I will be visible only to users that has ROLE_CUSTOM role.</auth-has-role>
<div auth-has-role="ROLE_CUSTOM">Me too.</div>
```

### auth-has-any-role

Only prints the content if logged in user has any of the desired roles. The roles list must be comma-separated.

```
<auth-has-any-role role="ROLE_CUSTOM,ROLE_CUSTOM_2">I will be visible only to users that has ROLE_CUSTOM or ROLE_CUSTOM_2 roles.</auth-has-any-role>
<div auth-has-any-role="ROLE_CUSTOM,ROLE_CUSTOM_2">Me too.</div>
```

### auth-has-all-roles

Only prints the content if logged in user has all of the desired roles. The roles list must be comma-separated.

```
<auth-has-all-roles role="ROLE_CUSTOM,ROLE_CUSTOM_2">I will be visible only to users that has ROLE_CUSTOM and ROLE_CUSTOM_2 roles.</auth-has-all-roles>
<div auth-has-all-roles="ROLE_CUSTOM,ROLE_CUSTOM_2">Me too.</div>
```

## Contributing

If you want to contribute with this project, feel free to open issues and fork the project.
