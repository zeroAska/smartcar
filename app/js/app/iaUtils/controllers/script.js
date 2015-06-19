angular.module('iaUtils').directive('iauScript', function($log) {
    // For global callback functions
    var directive_counter = 0;
    /**
     * on-loaded: command to run when loading completes
     * loaded: sets to true when loaded
     * src: url to load the script
     * callback: substring in src to substitute for the name of a global
     *  callback function
     * load: set to true will trigger loading
     * load-on-ready: if attribute is present, automatically triggers loading
     *  on document ready
     * error: set to true when loading fails
     * onerror: executes when loading fails
     *
     * Note: this is a one-shot loader.  If loading fails, will not retry.
     */
    return {
        restrict: 'AE',
        replace: true,
        scope: {
            'onloaded': '&onLoaded',
            'loaded': '=?',
            'src': '@',
            'callback': '@',
            'load': '=?',
            'error': '=?',
            'onerror': '&onError'
        },
        link: function($scope, $element, $attr) {
            var instance_number = directive_counter;
            directive_counter ++;
            if (($attr.load == null) && ($attr.loadOnReady == null)) {
                throw new Error("You must specify either load or load-on-ready");
            }
            if ($attr.useScriptTag != null && $attr.callback == null) {
                throw new Error('It is unsafe to use script tag loading without a callback, will not be able to determine when loading is complete. Refusing to continue');
            }
            var element = angular.element(document.createComment(
                ' sbf-script-loader: ' + $scope.src + ' '
            ));
            $element.replaceWith(element);

            $scope.loaded = false;
            $scope.error = false;

            function load_script() {
                // Disable function to prevent reloading (accidental or otherwise)
                load_script = null;  // jshint ignore:line

                var url = $scope.src;

                function on_loaded() {
                    $scope.$apply(function() {
                        $scope.loaded = true;
                        $scope.onloaded();
                    });
                }

                if ($scope.callback) {
                    var callback_name = '_iauScript_callback_' + instance_number.toString();
                    window[callback_name] = function() {
                        on_loaded();
                        delete window[callback_name];
                    };

                    url = url.replace($scope.callback, callback_name);
                }


                if ($attr.useScriptTag == null) {
                    $log.log('loading ' + String(url) + ' with jQuery');
                    jQuery.ajax({
                        dataType: 'script',
                        cache: true,
                        url: url
                    }).done(function() {
                        on_loaded();
                    }).fail(function() {
                        $scope.$apply(function() {
                            $scope.error = true;
                            $scope.onerror();
                        });
                    });
                } else {
                    $log.log('loading ' + String(url) + ' with <script>');
                    var scriptTag = angular.element('<script>');
                    scriptTag.attr('src', url);
                    scriptTag.attr('type', 'text/javascript');
                    element.after(scriptTag);
                }
            }

            var unwatch_load = $scope.$watch('load', function(load) {
                if (load) {
                    unwatch_load();
                    load_script();
                }
            });

            if ($attr.loadOnReady != null) {
                // Setting the variable so that if necessary, the external
                // controller can still detect the load event (via $watch)
                $scope.load = true;
            }
        }
    };
});
