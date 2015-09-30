angular.module('iaUtils').directive('iauBehavior', function($log) {
    /**
     * Prevent the creation af any child DOM elements, but preserve the
     * behavior.  This works by detaching the original DOM element. Any new
     * operations will now occur in memory.  Depending on the complexity of
     * it's contents, this may create significant memory impact on the browser,
     * although in this use case it shouldn't be much worse than, say Polymer.
     *
     * Do not put any element requiring browser participation in this element,
     * it may not work as expected (e.g. script). Anything that is parsed
     * with unexpected behavior by the browser ahead of time cannot be hidden
     * either.
     *
     * This does not prevent FOUC unless ng-cloak is specified.
     *
     * Beware that while elements are not in the DOM, they still have an impact
     * on performance.
     */
    return {
        restrict: 'E',
        link: function($scope, $element, $attr) {
            var comment_placeholder = document.createComment('iau-behavior placeholder');
            $element.replaceWith(comment_placeholder);
        }
    };
});
